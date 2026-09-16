# AI-PM MCP Tool API Reference

Detailed technical reference for `ai-pm-mcp` tools and parameter schemas. Load this file when detailed parameter types or edge cases are needed.

---

## 1. High-Efficiency Project Reporting & Discovery

### `get_daily_report`
Consolidated daily project report reading directly from pre-computed backend snapshots (1-5KB response, replaces 25+ calls). Automatically refreshes snapshot on demand if stale/dirty.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `sections` *(optional, array of strings)*: Subset of sections to return. Options: `["totals", "by_priority", "by_assignee", "today", "velocity", "stale_tasks", "alerts", "my_board", "by_tag"]` (default: all sections).
    - `totals`: `{ total_issues, done, in_review, todo, in_progress, backlog, rejected, archived }`
    - `by_tag`: Feature progress breakdown returning `{ [tag]: { total, by_status: { Done, Todo, In Progress, Code Review, Backlog, Rejected }, done_pct } }`.

### `get_issues_batch`
Bulk issue reader (AIPM-71) fetching up to 200 issues in a single request. Returns issue status, assignees, tags, and participants in 1 round-trip. Eliminates iterative N+1 loops and avoids HTTP 429 rate limits.
- **Parameters**:
  - `identifiers` *(required, array of strings)*: Array of issue identifiers (e.g. `["AIPM-69", "AIPM-70"]`, max 200)
  - `fields` *(optional, array of strings)*: Subset of fields to retrieve (e.g. `["description", "tags"]`). If omitted, returns all standard fields.
- **Returns**: `{ count: number, issues: Array<{ id, identifier, number, title, description?, priority, status, assignee, project_key, tags, participants, is_archived, version, created_at, updated_at }> }`

### `list_project_tags`
Lists all tags associated with a project along with the total issue count for each tag (AIPM-73). Used for feature discovery and progress overview without scanning all issues.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
- **Returns**: Array of `{ id: string, name: string, color: string, issue_count: number }`

### `list_issues`
Returns a compact, token-efficient issue list (~200 bytes per issue, omitting descriptions and histories) with multi-criteria filtering and pagination.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `query` *(optional, string)*: Keyword or phrase to search across issue titles and descriptions
  - `status` *(optional, string)*: Filter by status name (e.g. `'In Progress'`, `'Todo'`)
  - `priority` *(optional, string)*: `'LOW'` | `'MEDIUM'` | `'HIGH'` | `'URGENT'`
  - `assignee` *(optional, string)*: Filter by user name or email
  - `tags` *(optional, array of strings)*: Filter by tag names or tag UUIDs (e.g. `["bug", "ui"]`)
  - `tagMode` *(optional, enum)*: `'AND'` | `'OR'` (default: `'OR'`)
  - `includeTags` *(optional, boolean, default: false)*: When true, attaches `tags: [{ id, name, color }]` directly to each issue item without extra queries
  - `limit` *(optional, number)*: Max issues to return (default: 20, max: 100)
  - `offset` *(optional, number)*: Pagination offset (default: 0)
  - `includeArchived` *(optional, boolean)*: Include soft-deleted/archived issues (default: false)

### `search_issues`
Searches issues across title and description by keyword or phrase (e.g. `'tinh luyện'`, `'character sheet'`). Returns matching issues with status, priority, and assignee.
- **Parameters**:
  - `query` *(required, string)*: Search keyword or phrase
  - `projectKey` *(optional, string)*: Optional project key prefix (e.g. `'PW'`, `'CPN'`)
  - `tags` *(optional, array of strings)*: Filter by tag names or tag UUIDs
  - `tagMode` *(optional, enum)*: `'AND'` | `'OR'` (default: `'OR'`)
  - `limit` *(optional, number)*: Max matching issues to return (default: 20, max: 50)
  - `includeArchived` *(optional, boolean)*: Include archived issues (default: false)

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

### `upload_issue_attachment`
Uploads an image attachment to an issue using Base64 encoded file data.
- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-68'`)
  - `filename` *(required, string)*: Attachment filename (e.g. `'screenshot.png'`)
  - `base64Data` *(required, string)*: Base64-encoded file data (with or without data URL prefix)
  - `contentType` *(optional, string)*: MIME type (e.g. `'image/png'`, `'image/jpeg'`)
- **Returns**: Formatted attachment object with `id`, `filename`, `file_size`, `content_type`, and `url` (`/api/v1/attachments/view/:id`).

### `list_issue_attachments`
Lists all image attachments for an issue.
- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-68'`)
- **Returns**: Array of attachment objects.

### `delete_issue_attachment`
Deletes an attachment from an issue.
- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-68'`)
  - `attachmentId` *(required, string)*: UUID of attachment to delete

---

## 3. Sprint Cycles & Focus Scheduling

### `create_cycle`
Creates a sprint cycle for a project.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `name` *(required, string)*: Cycle name (e.g. `'Sprint 14'`)
  - `startsAt` *(required, string)*: ISO start date string (e.g. `'2026-09-01'`)
  - `endsAt` *(required, string)*: ISO end date string (e.g. `'2026-09-14'`)

### `add_issue_to_cycle`
Attaches a single issue to a sprint cycle.
- **Parameters**:
  - `cycleId` *(required, string)*: Target cycle UUID
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-46'`)

### `add_issues_to_cycle`
Batch-attaches multiple issues to a cycle in a single call (up to 50 issues).
- **Parameters**:
  - `cycleId` *(required, string)*: Target cycle UUID
  - `identifiers` *(required, array of strings)*: Array of issue identifiers (e.g. `["AIPM-46", "AIPM-47"]`)
  - `atomic` *(optional, boolean, default: false)*: If true, any failure rolls back all additions.

### `schedule_focus_time`
Schedules dedicated focus/work time for an issue on the calendar.
- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-46'`)
  - `startsAt` *(required, string)*: ISO start date-time string (e.g. `'2026-09-10T09:00:00Z'`)
  - `durationHours` *(optional, number, default: 2)*: Duration in hours.

### `get_schedule`
Retrieves scheduled focus time and calendar events for a project.
- **Parameters**:
  - `projectKey` *(optional, string)*: Filter schedule by project key prefix (e.g. `'AIPM'`)

---

## 4. Wiki Documentation & Specification Linking

### `create_or_update_wiki_page`
Creates a new project wiki documentation page or updates an existing page if the slug matches.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`, `'PW'`)
  - `slug` *(required, string)*: Unique URL-safe slug path for the page (e.g. `'architecture/overview'`, `'specs/quest-system'`)
  - `title` *(required, string)*: Page title (e.g. `'Quest System Specifications'`)
  - `content` *(required, string)*: Full page content in Markdown, Mermaid diagram, Drawio, or HTML
  - `format` *(optional, enum)*: Content format: `'MARKDOWN'` | `'MERMAID'` | `'DRAWIO'` | `'HTML'` (default: `'MARKDOWN'`)
- **Returns**: `{ success: true, wiki_page: { id, project_id, slug, title, content, format, version, ... } }`

### `get_wiki_page`
Retrieves a project wiki documentation page by project key and slug.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`, `'PW'`)
  - `slug` *(required, string)*: Wiki page slug (e.g. `'architecture/overview'`)
- **Returns**: Full wiki page object with `id`, `slug`, `title`, `content`, `format`, `version`, `created_at`, `updated_at`. Returns error `"WIKI_PAGE_NOT_FOUND"` if non-existent.

### `search_wiki_pages`
Searches wiki documentation pages within a project by keyword or title fragment.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`, `'PW'`)
  - `query` *(optional, string)*: Keyword or phrase to search across wiki titles and content
- **Returns**: `{ count: number, wiki_pages: Array<{ id, slug, title, snippet, format, updated_at }> }`

### `link_issue_to_wiki`
Links a tracking issue to a wiki document/specification to establish traceability.
- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. `'AIPM-46'`, `'PW-207'`)
  - `wikiSlug` *(required, string)*: Slug of the target wiki page to link to (e.g. `'specs/quest-system'`)
  - `relationType` *(optional, enum)*: Relationship type: `'SPECIFIES'` | `'IMPLEMENTS'` | `'DOCUMENTS'` | `'RELATED'` (default: `'SPECIFIES'`)
- **Returns**: `{ success: true, message: "Linked issue AIPM-46 to wiki page 'specs/quest-system'" }`

### `upload_wiki_attachment`
Uploads an image attachment to a project wiki page using Base64 encoded file data.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `slug` *(required, string)*: Wiki page slug (e.g. `'specs/architecture'`)
  - `filename` *(required, string)*: Attachment filename (e.g. `'diagram.png'`)
  - `base64Data` *(required, string)*: Base64-encoded file data (with or without data URL prefix)
  - `contentType` *(optional, string)*: MIME type (e.g. `'image/png'`, `'image/jpeg'`)
- **Returns**: Formatted attachment object with `id`, `filename`, `file_size`, `content_type`, and `url` (`/api/v1/attachments/view/:id`).

### `list_wiki_attachments`
Lists all image attachments uploaded to a project wiki page.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `slug` *(required, string)*: Wiki page slug (e.g. `'specs/architecture'`)
- **Returns**: Array of wiki attachment objects.

### `delete_wiki_attachment`
Deletes an image attachment from a project wiki page.
- **Parameters**:
  - `projectKey` *(required, string)*: Target project key prefix (e.g. `'AIPM'`)
  - `slug` *(required, string)*: Wiki page slug (e.g. `'specs/architecture'`)
  - `attachmentId` *(required, string)*: UUID of attachment to delete
- **Returns**: `{ success: true, message: "Attachment deleted" }`


