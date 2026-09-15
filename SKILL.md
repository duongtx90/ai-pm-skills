---
name: ai-pm-skills
description: "Project management & task tracking skill for workspaces explicitly bound to AI-PM via .aipm/config.json or when explicitly requested by the user. Do NOT activate for general coding tasks in unlinked workspaces."
version: 2.8.0
---

# AI-PM Agent Skill & Onboarding Guide

Connects AI Agents to the **AI-PM Project Management Platform** via **Model Context Protocol (MCP)**. Guides agents to manage projects, break down tasks, avoid duplicates, generate consolidated daily reports, and maintain high-quality issue tracking.

---

## 0. Strict Opt-In & Project Binding (`.aipm/config.json`) (CRITICAL)

To prevent task misattribution, unsolicited MCP calls, and corrupting AIPM with arbitrary tasks:

### 🚨 Rule 0.1: Strict Opt-In Protocol (MANDATORY)
1. **Default Behavior (No Binding)**:
   - If `.aipm/config.json` **DOES NOT EXIST** at the workspace root and the user **did NOT explicitly request** managing tasks on AI-PM:
     - **DO NOT invoke ANY `ai-pm-mcp` tools** (including `list_projects`, `create_issue`, `list_issues`).
     - **DO NOT prompt the user** asking if they want to connect to AI-PM.
     - **DO NOT fuzzy match or guess** existing projects to force-fit or stuff tasks into.
     - Execute the user's request locally as a standard coding assistant without touching `ai-pm-mcp`.
2. **When `.aipm/config.json` EXISTS**:
   - Read `projectKey` from `.aipm/config.json` (e.g. `{"projectKey": "AIPM"}`).
   - Automatically use this `projectKey` as the default for all subsequent operations (`create_issue`, `list_issues`, `get_daily_report`, `get_issue_context`, Reasonix task prompts).
3. **Explicit User Initialization Only**:
   - ONLY when the user **explicitly asks** to connect or bind the current workspace to an AI-PM project (e.g. *"kết nối repo này với AIPM"*, *"setup AIPM cho dự án này"*):
     - Prompt the user or call MCP `list_projects` to let the user select the project.
     - Write `.aipm/config.json`:
       ```json
       {
         "projectKey": "PROJECT_KEY"
       }
       ```
     - Commit `.aipm/config.json` to version control so all team members and agents share the binding.
4. **Zero Guessing / Anti-Stuffing Guard**:
   - If a task does not belong to the bound project, or if the target project is ambiguous: **NEVER GUESS OR STUFF TASKS INTO ARBITRARY PROJECTS**. Explicitly clarify with the user first.

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
2. For each task, call `create_issue` with appropriate `projectKey`, `priority`, and mandatory `tags`.
3. Link sub-tasks to parent features using `parentId`.
4. Attach multi-collaborators: Use `participants` (`[{ user: "name/email", role: "REVIEWER" | "OBSERVER" }]`) and/or `participantIds` when multiple team members need to review, observe, or collaborate. The `assignee` is automatically recorded as `ASSIGNEE` in `issue_participants`.

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

### ⚡ Rule 5: Batch Creation & Workflow Discovery (MANDATORY for >3 tasks)
- **Status Discovery First**: Call `list_project_statuses(projectKey)` or `GET /projects/:idOrKey/statuses` to discover valid status names in the project's workflow before assigning statuses. Never guess status names blindly!
- **Batch Creation**: When breaking down an epic into multiple sub-tasks (3 to 50 tasks), **ALWAYS call `create_issues` (batch)** instead of sending individual `create_issue` requests in a loop. This saves network round-trips and guarantees you will never hit HTTP 429 rate limits.

### 💬 Rule 6: Structured Completion & Result Reporting (MANDATORY)
When completing a task or handing off work, the agent **MUST** post a structured summary comment via `add_issue_comment(identifier, body)` before transitioning status.

#### 📌 Standard Completion Template (≤ 8 lines, NO essays, NO raw log dumps):
```markdown
### ✅ Completion Summary
- **What**: [1-2 sentences summarizing core changes/deliverables]
- **Verification**: [Exact test/build commands run + outcomes (e.g. `pnpm test` passed, `npm run build` 0 errors)]
- **Risks/Notes**: [Edge cases, migration caveats, breaking changes, or "None"]
- **Next**: [Actionable next step: e.g. "Ready for review & deployment"]
```

#### 📌 Comment Types:
- **Completion Comment**: Required when finishing work or handing off. Uses the standard 4-item template above.
- **Progress Comment**: Optional. Only post if a task is long-running (>15m) or encounters significant architectural pivots.

#### ⚙️ Status Transition & Concurrency Control:
- **OCC (`expectedVersion`)**: Always pass `expectedVersion` matching the `version` field from `get_issue_context` when calling `update_issue_status` to prevent concurrent overwrite races.
- **Cost Parameter**: The `cost` field is optional. ONLY pass `cost` if your CLI runner explicitly measures and outputs token costs (e.g. Reasonix). Do NOT guess or hallucinate costs.

### 🚨 Rule 7: Blocker Reporting Protocol
If a task cannot proceed due to missing requirements, dependency failures, or unresolvable ambiguities:
- **Do NOT fail silently** or abandon the issue.
- Immediately call `report_blocker(identifier, reason)` to flag the issue, document the root cause, and alert the team.

### 🏷️ Rule 8: Mandatory Issue Tagging Policy (CRITICAL)
Every issue created via MCP (`create_issue` or `create_issues`) **MUST include 1 to 3 semantic tags** in the `tags` array parameter. Never leave `tags` empty or omitted!

#### 📌 Tag Extraction & Rules:
1. **Auto-extract from Title & Category**: If the issue title or specification contains bracketed prefixes, category labels, or domain terms, map them directly to lowercase tags:
   - `[UI]` or `[Frontend]` ➔ `tags: ["ui"]`
   - `[VFX]` or `[Effect]` ➔ `tags: ["vfx"]`
   - `[Quest]` or `5. QUEST SYSTEMS` ➔ `tags: ["quest"]`
   - `[Backend]` or `[API]` ➔ `tags: ["backend", "api"]`
   - `[Bug]` or `[Fix]` ➔ `tags: ["bug"]`
   - `[Auth]` or `[Security]` ➔ `tags: ["auth"]`
   - `[Perf]` or `[Optimization]` ➔ `tags: ["perf"]`
2. **Standard Tag Taxonomy**:
   - **Domains**: `ui`, `backend`, `api`, `vfx`, `quest`, `combat`, `audio`, `db`, `mcp`, `infra`
   - **Types**: `bug`, `feature`, `refactor`, `perf`, `docs`, `chore`
3. **Payload Examples**:
   - `create_issue`:
     ```json
     {
       "projectKey": "AIPM",
       "title": "Add webhook retry mechanism",
       "tags": ["backend", "api"],
       "description": "..."
     }
     ```
   - `create_issues` (Batch):
     ```json
     {
       "projectKey": "PW",
       "issues": [
         { "title": "[UI] Quest tracker hud", "tags": ["ui", "quest"], "description": "..." },
         { "title": "[VFX] Portal spawn particles", "tags": ["vfx"], "description": "..." }
       ]
     }
     ```

### 🖼️ Rule 9: Image & Attachment Management (Issue & Wiki)
- **Zero S3 / Local Partitioned Storage**: Attachments are stored on local server disk partitioned strictly by `<orgId>/<projectId>/<attachmentId>.<ext>` to allow clean, bulk project-level purge.
- **Dual-Mode Upload**: Agents can upload screenshots, architectural diagrams, and error dumps using `base64Data`:
  - **Issue Attachments**: `upload_issue_attachment(identifier, filename, base64Data, contentType)`
  - **Wiki Attachments**: `upload_wiki_attachment(projectKey, slug, filename, base64Data, contentType)`
- **Immediate Markdown Embedding**: The returned attachment payload provides `url` (`/api/v1/attachments/view/<id>`). Agents should embed the image into the markdown body using standard markdown: `![filename](/api/v1/attachments/view/<id>)`.
- **Discovery & Cleanup**:
  - Issues: `list_issue_attachments(identifier)` / `delete_issue_attachment(identifier, attachmentId)`
  - Wiki: `list_wiki_attachments(projectKey, slug)` / `delete_wiki_attachment(projectKey, slug, attachmentId)`

---

## 3. Token Efficiency & Rules of Engagement

1. **Compact Listings & Keyword Search**: Use `search_issues(query, projectKey)` or `list_issues(projectKey, query)` for fast keyword discovery across titles and descriptions (e.g. `'tinh luyện'`, `'auth'`) rather than fetching full issue contexts in bulk (~200B/issue token savings). Use `includeTags: true` to get tags directly in list results without extra round-trips.
2. **Bulk Read Over Loops (MANDATORY)**: When needing details/status/tags for multiple issues (up to 200 items), **ALWAYS call `get_issues_batch({ identifiers: [...] })`** in a single call instead of firing iterative `get_issue_context` calls in a loop. Firing hundreds of individual requests will hit the HTTP 429 rate limit (~100 req/min).
3. **Feature & Tag Discovery**: Call `list_project_tags(projectKey)` to see all active tags and their issue counts. Call `get_daily_report(projectKey, ["by_tag"])` for feature-level progress and completion rates. Filter issues by tags using `list_issues({ projectKey, tags: ["UI"], tagMode: "AND" | "OR" })`.
4. **Pre-computed Reporting**: Use `get_daily_report` for project summaries, stale WIP detection, and velocity tracking.
5. **Batch Creation Over Loops**: Use `create_issues` for bulk creation (up to 50 tasks). The MCP client automatically handles HTTP 429 retries with exponential backoff if limits are reached.
6. **Auto-Assign Token Owner & Participants**: Omitting `assignee` in `create_issue` automatically assigns the issue to the human user who owns the agent token. Use `participants` in `create_issue` or `set_issue_participants` directly to assign reviewers/observers in a single call.
7. **Safe Assignee Resolution**: Assignees and participants prioritize exact match. If an ambiguous name is queried, HTTP 409 `AMBIGUOUS_USER_MATCH` with candidate accounts is returned to prevent misassignments.
8. **Semantic Tag Colors**: Auto-created tag colors match semantics: `bug`/`critical` (Red), `ui`/`frontend` (Blue), `backend`/`api` (Purple), `docs` (Amber), `ai`/`mcp` (Cyan).
9. **Task Lifecycle & Handoff Clarification**:
   - **Coding Agent / Subagent**: `claim_issue` → Develop & Verify → `add_issue_comment` (Rule 6 Template) → `update_issue_status("Code Review", expectedVersion)`.
   - **Parent Orchestrator / Reviewer**: Review & QA → Git Push → Deploy (`./deploy/deploy-backend.sh`) → `update_issue_status("Done", expectedVersion)`.
   - Coding agents MUST NEVER unilaterally mark tasks `Done` before parent review and deployment.
10. **Anti-Patterns**:
    - ❌ NEVER fire iterative `get_issue_context` calls in a loop (always use `get_issues_batch`).
    - ❌ NEVER omit `tags` when creating issues.
    - ❌ NEVER dump entire raw logs, compiler dumps, or full file diffs into comments.
    - ❌ NEVER write philosophical essays or restate requirements.
    - ❌ NEVER hallucinate numerical costs when the runner does not provide them.

---

## 4. Deep References

For full tool parameter schemas, refer to [`references/api-reference.md`](file:///Users/duongtx/workspaces/viber/ai-pm/.agents/skills/ai-pm-skills/references/api-reference.md).
