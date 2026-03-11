import { useState } from 'react';
import { api, ws, auth } from '@appdeploy/client';

// API usage examples:
// api.get('/api/items')                      - GET all items
// api.get('/api/items/123')                  - GET single item
// api.post('/api/items', { name: 'New' })    - POST create item
// api.put('/api/items/123', { name: 'Upd' }) - PUT update item
// api.delete('/api/items/123')               - DELETE item

// WS usage examples:
// const conn = ws.connect();
// conn.onMessage(msg => console.log(msg));
// conn.ready.then(() => {
//   const connection_id = conn.connectionId;
//   api.post('/api/subscriptions', { entity_type: 'room', entity_id: 'room-1', connection_id });
// });
// conn.disconnect();

// Auth usage examples:
// const { user } = await auth.signIn()           - sign in with popup (default scopes: openid email profile)
// await auth.signIn({ scope: 'openid email profile offline_access' }) - with refresh token
// auth.isSignedIn()                               - check if signed in (sync, no network call)
// const user = await auth.getUser()               - get current user (auto-refreshes token)
// user.userId / user.email / user.name            - user fields (email/name require matching scopes)
// await auth.signOut()                            - sign out and clear tokens
// After signIn, api.get/post/put/delete auto-attach Authorization: Bearer <token>
// signIn errors: error.code = 'popup_blocked' | 'popup_closed' | 'auth_error'

export default function Home() {
    // APP STATES:

    return (
        <div className="container">APP_CONTENT</div>
    );
}
