# AppDeploy Codex v2

This folder contains the AppDeploy v2 Codex skill package at [`appdeploy/`](./appdeploy/).

## Install

Public GitHub installs do not require a GitHub account.

Use the dedicated install guide:

```text
https://raw.githubusercontent.com/AppDeploy-AI/skills/main/skills/v2/INSTALL.md
```

Or install with Codex from:

```text
https://github.com/AppDeploy-AI/skills/tree/main/skills/v2/appdeploy
```

Or copy the package manually:

```bash
mkdir -p ~/.codex/skills/appdeploy
cp -r skills/v2/appdeploy/* ~/.codex/skills/appdeploy/
```

Restart Codex after installing the skill.

## Upgrade

The current installer does not overwrite an existing `~/.codex/skills/appdeploy` directory.

Upgrade flow:

1. Remove the existing install at `~/.codex/skills/appdeploy`
2. Install the latest package from `skills/v2/appdeploy/`
3. Restart Codex

## Version

The current package version is stored in [`appdeploy/VERSION`](./appdeploy/VERSION).
