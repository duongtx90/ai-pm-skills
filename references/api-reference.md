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
Transitions task status.
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `status` *(required, string)*: e.g. `'In Progress'`, `'Code Review'`, `'Done'`
  - `expectedVersion` *(optional, number)*: OCC check

### `assign_issue`
Assigns an issue to a user by name or email.
- **Parameters**:
  - `identifier` *(required, string)*: e.g. `'AIPM-46'`
  - `assignee` *(required, string)*: User name or email

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
