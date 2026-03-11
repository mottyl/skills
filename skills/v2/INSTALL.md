# AppDeploy Codex Skill Install

Use this file as the install source of truth for the AppDeploy Codex skill.

## Target

Install the full skill folder into:

- `~/.codex/skills/appdeploy`

The installed folder must contain:

- `SKILL.md`
- `agents/openai.yaml`
- `references/`
- `scripts/`
- `assets/`

After installation, restart Codex.

## Recommended Path

Use the native OS shell install path below. This avoids requiring Python, `git`, or a GitHub account.

### Windows PowerShell

```powershell
$repoZip = 'https://github.com/AppDeploy-AI/skills/archive/refs/heads/main.zip'
$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("appdeploy-skill-" + [System.Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tmpDir 'skills.zip'
$extractDir = Join-Path $tmpDir 'extract'
$sourceDir = Join-Path $extractDir 'skills-main\skills\v2\appdeploy'
$destRoot = Join-Path $HOME '.codex\skills'
$destDir = Join-Path $destRoot 'appdeploy'

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

Invoke-WebRequest -Uri $repoZip -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

if (Test-Path -LiteralPath $destDir) {
    Remove-Item -LiteralPath $destDir -Recurse -Force
}

Copy-Item -LiteralPath $sourceDir -Destination $destDir -Recurse -Force
```

### macOS / Linux

```bash
set -euo pipefail

archive_url='https://github.com/AppDeploy-AI/skills/archive/refs/heads/main.tar.gz'
tmp_dir="$(mktemp -d)"
archive_path="$tmp_dir/skills.tar.gz"
dest_root="$HOME/.codex/skills"
dest_dir="$dest_root/appdeploy"
source_dir="$tmp_dir/skills-main/skills/v2/appdeploy"

mkdir -p "$dest_root"
curl -L "$archive_url" -o "$archive_path"
tar -xzf "$archive_path" -C "$tmp_dir"
rm -rf "$dest_dir"
cp -R "$source_dir" "$dest_dir"
```

## Optional Alternative

If Python is already available and you explicitly want the built-in installer flow, you may use:

```text
https://github.com/AppDeploy-AI/skills/tree/main/skills/v2/appdeploy
```

with `$skill-installer`.

## Verification

Confirm that these paths exist under `~/.codex/skills/appdeploy`:

- `SKILL.md`
- `agents/openai.yaml`
- `references/`
- `scripts/`
- `assets/`

Then tell the user:

```text
Restart Codex to pick up new skills.
```
