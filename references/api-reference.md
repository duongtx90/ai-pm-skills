# AI-PM MCP Tool API Reference

Detailed technical reference for `ai-pm-mcp` tools and parameter schemas. Load this file when detailed parameter types or edge cases are needed.

---

## 1. High-Efficiency Project Reporting & Discovery

### `get_daily_report`
Consolidated daily project report reading directly from pre-computed backend snapshots (1-5KB response, replaces 25+ calls). Automatically refreshes snapshot on demand if stale/dirty.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `sections` *(optional, array of strings)*: Subset of sections to return. Options: `["totals", "by_priority", "by_assignee", "today", "velocity", "stale_tasks", "alerts", "my_board"]` (default: all sections).

### `list_issues`
Returns a compact, token-efficient issue list (~200 bytes per issue, omitting descriptions and histories) with multi-criteria filtering and pagination.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `status` *(optional, string)*: Filter by status name (e.g. `'In Progress'`, `'Todo'`)
  - `priority` *(optional, string)*: `'LOW'` | `'MEDIUM'` | `'HIGH'` | `'URGENT'`
  - `assignee` *(optional, string)*: Filter by user name or email
  - `limit` *(optional, number)*: Max issues to return (default: 20, max: 100)
  - `offset` *(optional, number)*: Pagination offset (default: 0)
  - `includeArchived` *(optional, boolean)*: Include soft-deleted/archived issues (default: false)

### `get_project_summary`
Returns high-level project status breakdown, active blockers, milestones, priority breakdown, assignee breakdown, and 24h activity.
- **Parameters**:
  - `projectKey` *(required, string)*: e.g. `'AIPM'`

### `list_projects`
Lists all active projects in the workspace with keys (`projectKey`), names, and issue counters.
- **Parameters**: None

### `search_users`
Searches workspace users by name or email fragment to resolve user IDs.
- **Parameters**:
  - `q` *(required, string)*: Search string (e.g. `'Duong'`)
  - `projectKey` *(optional, string)*: Scope to project members

---

## 2. Issue Lifecycle & Task Management

### `create_issue`
Creates a new task/bug in a project.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `title` *(required, string)*: Short title
  - `description` *(optional, string)*: Full markdown specification
  - `priority` *(optional, enum)*: `'LOW'` | `'MEDIUM'` | `'HIGH'` | `'URGENT'` (default: `'MEDIUM'`)
  - `status` *(optional, string)*: Workflow status name (e.g. `'Todo'`, `'In Progress'`)
  - `assignee` *(optional, string)*: Assignee name or email. If omitted, defaults to token owner!
  - `tags` *(optional, array of strings)*: Tag names (e.g. `["bug", "frontend"]`). Auto-creates missing tags with semantic colors (red for bug, blue for UI, purple for backend).
  - `cycleId` *(optional, string)*: Sprint cycle UUID
  - `milestoneId` *(optional, string)*: Milestone UUID
  - `parentId` *(optional, string)*: Parent issue UUID or identifier (e.g. `'AIPM-10'`)
  - `dueDate` *(optional, string)*: ISO date string
  - `participants` *(optional, array of strings or objects)*: List of participants to attach. Can be user names, emails, UUIDs, or `{ user?: string, userId?: string, role?: string }` (`'ASSIGNEE'` | `'REVIEWER'` | `'NEXT_REVIEWER'` | `'OBSERVER'`, default: `'OBSERVER'`). Assignee is automatically registered with role `'ASSIGNEE'`.
  - `participantIds` *(optional, array of UUID strings)*: List of user UUIDs to attach directly as participants (default role: `'OBSERVER'`).

### `create_issues`
Creates multiple issues in a batch (up to 50 issues) in a single round-trip to avoid 429 rate limits.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `issues` *(required, array)*: List of issue creation objects (title, description, priority, status, assignee, participants, tags, cycleId, etc.)
  - `atomic` *(optional, boolean, default: true)*: If true, all issues are created in a single atomic transaction; if false, issues are created individually returning created items and per-item error details.

### `set_issue_participants`
Updates or replaces the participants list on an existing issue.
- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-46'`)
  - `participants` *(optional, array of strings or objects)*: List of user names, emails, UUIDs, or `{ user?, userId?, role? }` (`'ASSIGNEE'` | `'REVIEWER'` | `'NEXT_REVIEWER'` | `'OBSERVER'`). Assignee is automatically retained as `'ASSIGNEE'`.
  - `participantIds` *(optional, array of UUIDs)*: User UUIDs to attach with default role `'OBSERVER'`.

### `list_project_statuses`
Lists all workflow statuses available in a project without needing to guess status names.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
- **Returns**: Array of workflow statuses with `id`, `name`, `category` (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELED`, `REJECTED`), `position`, `is_default`.

### `get_issue_context`
Fetches technical context for a specific issue (description, comments, sub-tasks, attachments).
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `maxTokens` *(optional, number)*: Context budget (default: 4000)

### `claim_issue`
Atomically claims an issue using Optimistic Concurrency Control (OCC).
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `expectedVersion` *(required, number)*: Current version fetched from `get_issue_context`
  - `agentId` *(required, string)*: Agent UUID

### `update_issue_status`
Transitions task status and optionally records execution cost.
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `status` *(required, string)*: e.g. `'In Progress'`, `'Code Review'`, `'Done'`
  - `expectedVersion` *(optional, number)*: OCC check
  - `cost` *(optional, number)*: Execution cost in USD (e.g. `0.0002`) to persist upon task completion

### `assign_issue`
Assigns an issue to a user by name or email.
> 🛡️ **Safe Resolution Note**: Prioritizes exact email/name match. If an ambiguous name is queried that matches multiple team members (e.g. `"Tùng"` matching `"Tùng"` and `"Tùng Anh"`), the system returns HTTP `409 AMBIGUOUS_USER_MATCH` with candidates list rather than guessing incorrectly.
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `assignee` *(required, string)*: User name, email, or UUID

### `add_issue_comment`
Posts progress or verification notes on an issue.
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `body` *(required, string)*: Markdown comment body

### `report_blocker`
Flags a blocker on a task.
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `reason` *(required, string)*: Cause of blocker
  - `blockerType` *(optional, string)*: `'TECHNICAL'` | `'DEPENDENCY'` | `'DOMAIN'`

---

## 3. Sprint Cycles & Wiki Documentation

### `create_cycle` & `add_issue_to_cycle`
Creates a sprint cycle (`projectKey`, `name`, `startsAt`, `endsAt`) and attaches issues.

### `search_wiki_pages`, `get_wiki_page`, `create_or_update_wiki_page`, `link_issue_to_wiki`
Manages project documentation pages and links them to tracking issues.

