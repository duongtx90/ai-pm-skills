#!/bin/sh
# AI-PM installer: the ai-pm skill + the AI-PM MCP server for every coding
# agent found on this machine (Claude Code, Codex, Antigravity, Reasonix,
# OpenClaw).
#
#   sh install.sh        install / update, re-runnable (reads AIPM_TOKEN)
#   sh install.sh --uninstall
#
# Skills go through `npx skills` (one copy in ~/.agents/skills, symlinked into
# each agent). Claude Code uses the ai-pm plugin. An MCP entry that already
# points at the AI-PM URL is left as it is, whatever its name.
set -eu

REPO=duongtx90/ai-pm-skills
SKILL=ai-pm-skills
NAME=ai-pm-mcp
MCP_URL=${AIPM_MCP_URL:-https://api.aipm.io.vn/api/v1/mcp}
CODEX_HOME=${CODEX_HOME:-$HOME/.codex}
REASONIX_HOME=${REASONIX_HOME:-$HOME/.reasonix}
OPENCLAW_HOME=$HOME/.openclaw
GEMINI=$HOME/.gemini
BACKUP=$HOME/.aipm/backup/$(date +%Y%m%d-%H%M%S)
TOKEN=${AIPM_TOKEN:-}

MODE=install
case "${1:-}" in
  "") ;;
  --uninstall) MODE=uninstall ;;
  *) echo "usage: AIPM_TOKEN=... sh install.sh [--uninstall]" >&2; exit 2 ;;
esac

has() { command -v "$1" >/dev/null 2>&1; }
say() { printf '%s\n' "$*"; }

# ── Detect agents ────────────────────────────────────────────────────────
CANON=$HOME/.agents/skills/$SKILL   # the one real copy (npx skills)
AGENTS=""                           # agents npx skills links itself
if has codex || [ -d "$CODEX_HOME" ]; then AGENTS="$AGENTS codex"; fi
if has reasonix || [ -d "$REASONIX_HOME" ]; then AGENTS="$AGENTS reasonix"; fi
if has openclaw || [ -d "$OPENCLAW_HOME" ]; then AGENTS="$AGENTS openclaw"; fi
# npx skills treats Antigravity as "universal" and never links its global
# skills dir, so those links are made here.
LINK_DIRS=""
for g in antigravity antigravity-cli; do
  if [ -d "$GEMINI/$g" ]; then LINK_DIRS="$LINK_DIRS $GEMINI/$g/skills"; fi
done

# JSON edit of an Antigravity mcp_config.json (python3, else node).
# $1 = add|remove, $2 = file. Prints "added", "exists:<name>", "removed" or "none".
gemini_json() {
  if has python3; then
    python3 - "$1" "$2" "$NAME" "$MCP_URL" "$TOKEN" <<'PY'
import json, os, sys
op, path, name, url, token = sys.argv[1:]
cfg = json.load(open(path)) if os.path.exists(path) and os.path.getsize(path) else {}
servers = cfg.setdefault("mcpServers", {})
if op == "add":
    found = [k for k, v in servers.items() if isinstance(v, dict) and url in (v.get("serverUrl"), v.get("url"))]
    if found:
        print("exists:" + found[0]); sys.exit()
    servers[name] = {"serverUrl": url, "headers": {"Authorization": "Bearer " + token}}
    print("added")
else:
    if servers.pop(name, None) is None:
        print("none"); sys.exit()
    print("removed")
json.dump(cfg, open(path, "w"), indent=2); open(path, "a").write("\n")
PY
  elif has node; then
    node - "$1" "$2" "$NAME" "$MCP_URL" "$TOKEN" <<'JS'
const fs = require("fs");
const [op, path, name, url, token] = process.argv.slice(2);
const cfg = fs.existsSync(path) && fs.statSync(path).size ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
const servers = (cfg.mcpServers ??= {});
if (op === "add") {
  const found = Object.keys(servers).filter((k) => [servers[k]?.serverUrl, servers[k]?.url].includes(url));
  if (found.length) { console.log("exists:" + found[0]); process.exit(0); }
  servers[name] = { serverUrl: url, headers: { Authorization: "Bearer " + token } };
  console.log("added");
} else {
  if (!(name in servers)) { console.log("none"); process.exit(0); }
  delete servers[name];
  console.log("removed");
}
fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
JS
  else
    echo "nojson"
  fi
}

gemini_configs() {  # Antigravity MCP files to touch: existing ones, else the IDE default
  found=""
  for f in "$GEMINI/antigravity/mcp_config.json" "$GEMINI/config/mcp_config.json"; do
    [ -f "$f" ] && found="$found $f"
  done
  if [ -z "$found" ] && [ -d "$GEMINI/antigravity" ]; then found="$GEMINI/antigravity/mcp_config.json"; fi
  echo "$found"
}

# ── Uninstall ────────────────────────────────────────────────────────────
if [ "$MODE" = uninstall ]; then
  for d in $LINK_DIRS; do
    if [ -L "$d/$SKILL" ]; then rm "$d/$SKILL" && say "antigravity: skill link removed from $d"; fi
  done
  if [ -d "$CANON" ] && has npx; then
    if npx -y skills remove "$SKILL" -g -y >/dev/null 2>&1; then say "skill: removed"; else say "skill: nothing to remove"; fi
  fi
  if has claude; then
    claude plugin uninstall ai-pm@ai-pm >/dev/null 2>&1 && say "claude: plugin removed" || true
  fi
  if has codex && codex mcp get "$NAME" >/dev/null 2>&1; then codex mcp remove "$NAME" >/dev/null && say "codex: MCP $NAME removed"; fi
  if has reasonix && reasonix mcp get "$NAME" >/dev/null 2>&1; then reasonix mcp remove "$NAME" >/dev/null && say "reasonix: MCP $NAME removed"; fi
  if has openclaw && openclaw mcp show "$NAME" >/dev/null 2>&1; then openclaw mcp unset "$NAME" >/dev/null && say "openclaw: MCP $NAME removed"; fi
  for f in $(gemini_configs); do
    [ -f "$f" ] && [ "$(gemini_json remove "$f")" = removed ] && say "antigravity: MCP $NAME removed from $f"
  done
  say "Entries you added by hand under another name were left in place."
  exit 0
fi

# ── Install: skill ───────────────────────────────────────────────────────
if [ -n "$AGENTS$LINK_DIRS" ]; then
  has npx || { echo "npx (Node.js) is required to install the skill." >&2; exit 1; }
  # Hand-copied old versions are real folders that would shadow the link:
  # move them out of the agents' skill dirs first.
  for d in "$REASONIX_HOME/skills" "$OPENCLAW_HOME/skills" $LINK_DIRS; do
    if [ -d "$d/$SKILL" ] && [ ! -L "$d/$SKILL" ]; then
      b=$BACKUP/$(echo "${d#"$HOME"/}" | tr / _)
      mkdir -p "$b" && mv "$d/$SKILL" "$b/" && say "old copy $d/$SKILL moved to $b/"
    fi
  done
  # Always pass a "universal" agent (codex = ~/.agents/skills): with only
  # non-universal agents npx skills copies instead of linking.
  agent_args="-a codex"
  for a in $AGENTS; do [ "$a" = codex ] || agent_args="$agent_args -a $a"; done
  # shellcheck disable=SC2086
  npx -y skills add "$REPO" -g -y $agent_args >/dev/null
  for d in $LINK_DIRS; do
    mkdir -p "$d" && ln -sfn "$CANON" "$d/$SKILL"
  done
  say "skill: installed in $CANON, linked for$AGENTS${LINK_DIRS:+ antigravity}"
fi

# ── Install: Claude Code plugin (skill + MCP) ────────────────────────────
if has claude; then
  claude plugin marketplace add "$REPO" >/dev/null 2>&1 || claude plugin marketplace update ai-pm >/dev/null 2>&1 || true
  claude plugin install ai-pm@ai-pm >/dev/null
  if [ -n "$TOKEN" ]; then
    printf '{"aipm_token":"%s"}' "$TOKEN" | claude plugin configure ai-pm@ai-pm --values-stdin >/dev/null
    say "claude: plugin ai-pm installed, token saved"
  else
    say "claude: plugin ai-pm installed — set the token with /plugin configure ai-pm@ai-pm"
  fi
  if grep -qs "$MCP_URL" "$HOME/.claude.json"; then
    say "claude: an MCP entry for AI-PM was also added by hand — remove it so tools are not listed twice (claude mcp list)"
  fi
fi

# ── Install: MCP for the other agents ────────────────────────────────────
need_token() {
  say "$1: MCP not added — run again with AIPM_TOKEN=ag_live_... set"
}

if has codex; then
  if grep -qs "$MCP_URL" "$CODEX_HOME/config.toml"; then
    say "codex: MCP already configured, left unchanged"
  else
    # Codex reads the token from AIPM_TOKEN at run time: export it in your shell profile.
    if codex mcp add "$NAME" --url "$MCP_URL" --bearer-token-env-var AIPM_TOKEN >/dev/null; then
      say "codex: MCP $NAME added (reads AIPM_TOKEN from the environment)"
    else
      say "codex: MCP not added (see error above)"
    fi
  fi
fi

if has reasonix; then
  if grep -qs "$MCP_URL" "$REASONIX_HOME/config.toml"; then
    say "reasonix: MCP already configured, left unchanged"
  elif [ -z "$TOKEN" ]; then
    need_token reasonix
  else
    # Reasonix connects while adding: a wrong token fails here with 401.
    if reasonix mcp add "$NAME" --http "$MCP_URL" --header "Authorization=Bearer $TOKEN" >/dev/null; then
      say "reasonix: MCP $NAME added"
    else
      say "reasonix: MCP not added (see error above)"
    fi
  fi
fi

if has openclaw; then
  if grep -qs "$MCP_URL" "$OPENCLAW_HOME/openclaw.json"; then
    say "openclaw: MCP already configured, left unchanged"
  elif [ -z "$TOKEN" ]; then
    need_token openclaw
  else
    # OpenClaw probes the server before saving: a wrong token fails here.
    if openclaw mcp add "$NAME" --url "$MCP_URL" --transport streamable-http --header "Authorization=Bearer $TOKEN" >/dev/null; then
      say "openclaw: MCP $NAME added"
    else
      say "openclaw: MCP not added (see error above)"
    fi
  fi
fi

for f in $(gemini_configs); do
  if grep -qs "$MCP_URL" "$f"; then say "antigravity: MCP already configured in $f, left unchanged"; continue; fi
  if [ -z "$TOKEN" ]; then need_token "antigravity ($f)"; continue; fi
  if [ -f "$f" ]; then mkdir -p "$BACKUP" && cp "$f" "$BACKUP/$(echo "${f#"$HOME"/}" | tr / _)"; fi
  case $(gemini_json add "$f") in
    added) say "antigravity: MCP $NAME added to $f" ;;
    exists:*) say "antigravity: MCP already configured in $f, left unchanged" ;;
    *) say "antigravity: needs python3 or node to edit $f" ;;
  esac
done

say "Done. Restart your agents to load the skill and MCP server."
