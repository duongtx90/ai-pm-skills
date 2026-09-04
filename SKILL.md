---
name: ai-pm-skills
description: "AI-PM Project Management & Task Execution Skill. Guides AI Agents (Claude Code, Gemini, Cursor, Windsurf, OpenCode) to connect via MCP, act as Project Managers (task breakdown, structured descriptions, task de-duplication, daily reports), and execute task lifecycles with maximum token efficiency."
version: 2.1.0
---

# AI-PM Agent Skill & Onboarding Guide

Connects AI Agents to the **AI-PM Project Management Platform** via **Model Context Protocol (MCP)**. Guides agents to manage projects, break down tasks, avoid duplicates, generate consolidated daily reports, and maintain high-quality issue tracking.

---

## 0. Project Binding & Auto-Config (`.aipm/config.json`) (CRITICAL)

To prevent task misattribution and eliminate the need for the user to repeatedly specify the project key across multiple sessions:

### ⚙️ Workspace Initialization Protocol:
1. **Check for Existing Binding**:
   - Whenever an AI Agent starts working in a workspace, it MUST check if `.aipm/config.json` exists at the workspace root.
2. **If `.aipm/config.json` EXISTS**:
   - Read `projectKey` from the config (e.g. `{"projectKey": "AIPM"}`).
   - Automatically use this `projectKey` as the default for all subsequent operations (`create_issue`, `list_issues`, `get_daily_report`, `get_issue_context`, Reasonix task prompts).
3. **If `.aipm/config.json` DOES NOT EXIST (First-time run)**:
   - The agent **MUST prompt the user** for the target `Project Key` (or call MCP `list_projects` to present available projects for selection).
   - Once confirmed, create the `.aipm/` directory and write `.aipm/config.json`:
     ```json
     {
       "projectKey": "AIPM"
     }
     ```
   - Commit `.aipm/config.json` to version control so all agents and developers share the same binding.
4. **Disambiguation Guard**:
   - If the project is ever ambiguous, missing, or the user requests an action on an entity not found in the bound project, the agent **MUST explicitly ask the user for clarification** before creating or modifying issues. Never guess or create issues in the wrong project!

---

## 1. Quickstart & User Setup Snippet

Human users can onboard any AI Agent by pasting this prompt:

> *"Connect to my AI-PM project. Register `ai-pm-mcp` with endpoint `https://prj-api.brewmonster.vn/api/v1/mcp` and token `<YOUR_AGENT_TOKEN>` (Bearer auth)."*

### Auto-Config JSON (`.agents/mcp_config.json` or `~/.gemini/config/mcp_config.json`)
```json
{
  "mcpServers": {
    "ai-pm-mcp": {
      "type": "http",
      "url": "https://prj-api.brewmonster.vn/api/v1/mcp",
      "headers": { "Authorization": "Bearer <YOUR_AGENT_TOKEN>" }
    }
  }
}
```

---

## 2. Project Manager Agent Workflows

### 🛡️ Rule 1: Task De-duplication Protocol (MANDATORY)
Before creating a new task, the agent **MUST** call `list_issues(projectKey)` (compact), `list_claimable_issues(projectKey)`, or `get_project_summary(projectKey)` to check if a matching task already exists. Never create duplicate issues!

### 📊 Rule 2: High-Efficiency Daily & Sprint Reporting
When asked for project status, standup reports, or velocity:
- Call `get_daily_report(projectKey)` — returns a consolidated 1-5KB pre-computed snapshot (`totals`, `by_priority`, `by_assignee`, `today`, `velocity`, `stale_tasks`, `alerts`, `my_board`) in a single call instead of firing 25+ individual queries.
- Call `get_project_summary(projectKey)` for high-level status breakdown, milestones, blockers, and recent 24h activity.

### 🧱 Rule 3: Epic & Feature Task Breakdown
When asked to break down a feature or handle an epic:
1. Split the work into small, atomic sub-tasks (each solvable within 1 PR).
2. For each task, call `create_issue` with appropriate `projectKey`, `priority`, and tags.
3. Link sub-tasks to parent features using `parentId`.

### 📋 Rule 4: Enforce Standard Structured Markdown Descriptions
Every issue created by an agent MUST follow this structured format:

```markdown
### 🎯 Goal / Problem Statement
[Brief summary of what needs to be accomplished and why]

### ✅ Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### 🛠️ Technical Context & Implementation Hints
- Relevant files / routes: [e.g. `apps/backend/src/...`]
- Key constraints or schema details

### 🧪 Verification & Test Plan
- [ ] Build typecheck (`pnpm build`)
- [ ] Unit / Integration test verification (`pnpm test`)
```

---

## 3. Token Efficiency & Rules of Engagement

1. **Compact Listings**: Use `list_issues` for task discovery (omits descriptions/history for ~200B/issue token savings) rather than fetching full issue contexts in bulk.
2. **Pre-computed Reporting**: Use `get_daily_report` for project summaries, stale WIP detection, and velocity tracking.
3. **Auto-Assign Token Owner**: Omitting `assignee` in `create_issue` automatically assigns the issue to the human user who owns the agent token.
4. **Semantic Tag Colors**: Auto-created tag colors match semantics: `bug`/`critical` (Red), `ui`/`frontend` (Blue), `backend`/`api` (Purple), `docs` (Amber), `ai`/`mcp` (Cyan).
5. **Task Lifecycle**:
   - `list_issues` / `list_claimable_issues` → `get_issue_context` → `claim_issue` → Develop & Verify → `add_issue_comment` → `update_issue_status("Code Review")`.

---

## 4. Deep References

For full tool parameter schemas, refer to [`references/api-reference.md`](file:///Users/duongtx/workspaces/viber/ai-pm/.agents/skills/ai-pm-skills/references/api-reference.md).
