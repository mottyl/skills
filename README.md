# AppDeploy Skills

Deploy apps with frontend, backend, cron jobs, database, file storage, AI capabilities, auth, and notifications, and get back a live public URL instantly.

Works with [Claude Code](https://claude.ai), [OpenAI Codex](https://openai.com/codex), and any AI coding assistant that supports skills.

Learn more at [appdeploy.ai](https://appdeploy.ai).

## Skills

| Platform | Path | Format |
|----------|------|--------|
| Claude Code | [`skills/claude/`](./skills/claude/) | [Claude Skills](https://github.com/anthropics/skills) |
| OpenAI Codex | [`skills/openai/`](./skills/openai/) | [OpenAI Agent Skills](https://github.com/openai/skills) |

## Quick Start

### Claude Code

Copy `skills/claude/SKILL.md` into your project's `.claude/skills/` directory:

```bash
mkdir -p .claude/skills
cp skills/claude/SKILL.md .claude/skills/appdeploy.md
```

### OpenAI Codex

Copy the `skills/openai/` directory into your project's `.codex/skills/` directory:

```bash
mkdir -p .codex/skills/appdeploy
cp -r skills/openai/* .codex/skills/appdeploy/
```

## MCP Server

AppDeploy is also available as an MCP server at `https://api-v2.appdeploy.ai/mcp` — see the [MCP docs](https://appdeploy.ai/mcp-docs) for setup instructions.

## License

MIT
