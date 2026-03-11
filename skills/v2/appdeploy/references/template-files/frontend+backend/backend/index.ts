import { db, storage, ws, auth, ai } from "@appdeploy/sdk";

interface JsonResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

const json = (data: unknown, status = 200): JsonResponse => ({
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
});

const error = (message: string, status = 400): JsonResponse =>
    json({ error: message }, status);

const SUBSCRIPTIONS_TABLE = "entity_subscriptions";

type SubscriptionRecord = {
    id: string;
    entity_type: string;
    entity_id: string;
    connection_id: string;
    created_at: number;
};

async function listSubscriptions(): Promise<SubscriptionRecord[]> {
    const { items } = await db.list(SUBSCRIPTIONS_TABLE, { limit: 1000 });
    return items as SubscriptionRecord[];
}

async function addSubscription(
    entityType: string,
    entityId: string,
    connectionId: string
) {
    await db.add(SUBSCRIPTIONS_TABLE, [
        {
            entity_type: entityType,
            entity_id: entityId,
            connection_id: connectionId,
            created_at: Date.now(),
        },
    ]);
}

async function removeSubscriptions(
    entityType: string,
    entityId: string,
    connectionId: string
) {
    const items = await listSubscriptions();
    const matchIds = items
        .filter(
            item =>
                item.entity_type === entityType &&
                item.entity_id === entityId &&
                item.connection_id === connectionId
        )
        .map(item => item.id);
    if (matchIds.length > 0) {
        await db.delete(SUBSCRIPTIONS_TABLE, matchIds);
    }
}

async function notifySubscribers(
    entityType: string,
    entityId: string,
    payload: unknown,
    excludeConnectionId?: string
) {
    const items = await listSubscriptions();
    const targets = items
        .filter(item => item.entity_type === entityType && item.entity_id === entityId)
        .map(item => item.connection_id)
        .filter(id => id !== excludeConnectionId);
    const targetConnectionIds = Array.from(new Set(targets));

    if (targetConnectionIds.length === 0) {
        return;
    }

    await ws.send(targetConnectionIds, {
        v: 1,
        type: "entity.update",
        payload: {
            entity_type: entityType,
            entity_id: entityId,
            data: payload,
        },
    });
}

interface RouteParams {
    [key: string]: string;
}

const matchRoute = (
    pattern: string,
    method: string,
    path: string
): RouteParams | null => {
    const [patternMethod, patternPath] = pattern.split(" ");
    if (patternMethod !== method) return null;

    const patternParts = patternPath.split("/");
    const pathParts = path.split("/");
    if (patternParts.length !== pathParts.length) return null;

    const params: RouteParams = {};
    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(":")) {
            params[patternParts[i].slice(1)] = pathParts[i];
        } else if (patternParts[i] !== pathParts[i]) {
            return null;
        }
    }
    return params;
};

// Lambda event - use event.path/body, not Request.url
interface LambdaEvent {
    httpMethod?: string;
    requestContext?: { http?: { method?: string } };
    rawPath?: string;
    path?: string;
    body?: string | object;
    queryStringParameters?: Record<string, string>;
}

interface MiddlewareContext {
    body: unknown;
    query: Record<string, string>;
    params: RouteParams;
    event: LambdaEvent;
    user?: NonNullable<Awaited<ReturnType<typeof auth.getUser>>>;
}
type Middleware = (ctx: MiddlewareContext) => Promise<void | JsonResponse>;
type Routes = Record<string, Middleware[]>;

const requireAuth = (): Middleware => async ctx => {
    const user = await auth.getUser(ctx.event);
    if (!user) {
        return error("Unauthorized", 401);
    }
    ctx.user = user;
};

const withScopes =
    (...scopes: string[]): Middleware =>
    async ctx => {
        if (!ctx.user) {
            return error(
                "Misconfigured middleware order: requireAuth must run before withScopes.",
                500
            );
        }
        for (const scope of scopes) {
            if (!auth.hasScope(ctx.user, scope)) {
                return error(`Forbidden: missing required scope: ${scope}`, 403);
            }
        }
    };

const requireAdminEmailAllowlist =
    (adminEmails: string[]): Middleware =>
    async ctx => {
        if (!ctx.user) {
            return error(
                "Misconfigured middleware order: requireAuth must run before requireAdminEmailAllowlist.",
                500
            );
        }
        const userEmail = (ctx.user.email || "").trim().toLowerCase();
        const allowlist = adminEmails
            .map(email => email.trim().toLowerCase())
            .filter(Boolean);
        if (!userEmail || !allowlist.includes(userEmail)) {
            return error("Forbidden", 403);
        }
    };

const runRoute = async (
    value: Middleware[],
    ctx: MiddlewareContext
): Promise<JsonResponse> => {
    const routeChain: Middleware[] = Array.isArray(value)
        ? value
        : // legacy middleware format (pre app-auth)
          [async mctx => (value as Function)(mctx)];
    const middlewareCtx = { ...ctx };
    for (const middleware of routeChain) {
        const res = await middleware(middlewareCtx);
        if (res) {
            return res;
        }
    }

    return error("Route chain returned no response. Last middleware must return JsonResponse.", 500);
};

const router =
    (routes: Routes) =>
    async (event: LambdaEvent): Promise<JsonResponse> => {
        const method = event.httpMethod || event.requestContext?.http?.method || "";
        const path = event.rawPath || event.path || "";

        let body: unknown = {};
        try {
            if (event.body) {
                body =
                    typeof event.body === "string" ? JSON.parse(event.body) : event.body;
            }
        } catch {}

        const query = event.queryStringParameters || {};

        for (const [pattern, middlewares] of Object.entries(routes)) {
            const params = matchRoute(pattern, method, path);
            if (params !== null) {
                try {
                    return await runRoute(middlewares, { body, query, params, event });
                } catch (err) {
                    console.error(err);
                    return error("Internal server error", 500);
                }
            }
        }

        return error("Not found", 404);
    };

export const handler = router({
    "GET /api/_healthcheck": [async () => json({ message: "Success" })],

    // Subscribe to entity updates (app-defined entity_type/entity_id)
    "POST /api/subscriptions": [
        async ({ body }) => {
            const { entity_type, entity_id, connection_id } = (body || {}) as Record<
                string,
                string
            >;
            if (!entity_type || !entity_id || !connection_id) {
                return error("entity_type, entity_id, connection_id are required");
            }
            await addSubscription(entity_type, entity_id, connection_id);
            return json({ ok: true });
        },
    ],

    // Unsubscribe from entity updates
    "POST /api/subscriptions/remove": [
        async ({ body }) => {
            const { entity_type, entity_id, connection_id } = (body || {}) as Record<
                string,
                string
            >;
            if (!entity_type || !entity_id || !connection_id) {
                return error("entity_type, entity_id, connection_id are required");
            }
            await removeSubscriptions(entity_type, entity_id, connection_id);
            return json({ ok: true });
        },
    ],

    // Add your routes here using an array of handlers.
    // Public routes use a single handler, e.g.:
    // 'GET /api/items': [async ({ query }) => { ... }],
    // 'POST /api/items': [async ({ body }) => { ... }],
    // 'GET /api/items/:id': [async ({ params }) => { ... }],
    //
    // Auth middleware usage (opt-in — only if app needs user accounts):
    // const ADMIN_EMAILS = ['owner@your-company.com']; // explicit, real emails only
    // 'GET /api/profile': [
    //   requireAuth(),
    //   async (ctx) => json({ userId: ctx.user!.userId, email: ctx.user!.email })
    // ],
    // 'GET /api/admin': [
    //   requireAuth(),
    //   requireAdminEmailAllowlist(ADMIN_EMAILS),
    //   async () => json({ ok: true })
    // ],
    // 'GET /api/me-email': [
    //   requireAuth(),
    //   withScopes('email'),
    //   async (ctx) => json({ email: ctx.user!.email })
    // ],
    //
    // AI multimodal facade example (recommended for fixed-label vision tasks):
    // import { ai, isAppDeployRpcError } from '@appdeploy/sdk';
    // 'POST /api/classify': [async ({ body }) => {
    //   const { image, mimeType } = (body || {}) as { image?: string; mimeType?: string };
    //   if (!image || !mimeType) return error('image and mimeType are required');
    //   try {
    //     const result = await ai.classify({
    //       prompt: 'Is this image a cat or a dog?',
    //       labels: ['cat', 'dog'],
    //       images: [{ data: image, mimeType }],
    //       maxRetries: 1
    //     });
    //     return json({ result: result.label, aiRaw: result.text, attempts: result.attempts });
    //   } catch (err) {
    //     if (isAppDeployRpcError(err)) {
    //       return error('AI classify failed (' + err.statusCode + '): ' + (err.responseText || ''), 502);
    //     }
    //     return error('AI classify failed', 500);
    //   }
    // }],
    // 'POST /api/extract-mileage': [async ({ body }) => {
    //   const { image, mimeType } = (body || {}) as { image?: string; mimeType?: string };
    //   if (!image || !mimeType) return error('image and mimeType are required');
    //   try {
    //     const result = await ai.extract({
    //       prompt: 'Read the odometer value from this image and return JSON.',
    //       images: [{ data: image, mimeType }],
    //       schema: {
    //         type: 'object',
    //         properties: { mileage: { type: 'number' }, confidence: { type: 'number' } },
    //         required: ['mileage']
    //       }
    //     });
    //     return json({ extracted: result.data, attempts: result.attempts });
    //   } catch (err) {
    //     if (isAppDeployRpcError(err)) {
    //       return error('AI extract failed (' + err.statusCode + '): ' + (err.responseText || ''), 502);
    //     }
    //     return error('AI extract failed', 500);
    //   }
    // }],
    //
    // Scrape → extract pipeline example:
    // 'POST /api/scrape-extract': [async ({ body }) => {
    //   const { url } = (body || {}) as { url?: string };
    //   if (!url) return error('url is required');
    //   const scraped = await ai.scrape({ url });
    //   if (scraped.status >= 400) return error('Failed to scrape URL', 502);
    //   const result = await ai.extract({
    //     content: scraped.text,
    //     prompt: 'Extract all items with name and description.',
    //     schema: {
    //       type: 'object',
    //       properties: { items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } }, required: ['name'] } } },
    //       required: ['items']
    //     }
    //   });
    //   return json({ data: result.data, attempts: result.attempts });
    // }],
    //
    // IMPORTANT: After any server-side mutation, call notifySubscribers(entity_type, entity_id, payload, excludeConnectionId).
    // IMPORTANT: Scope data access by ctx.user!.userId on protected routes (never return unscoped db.list results).
})
