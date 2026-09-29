<!-- GENERATED FILE: do not edit. Source: src/mcp/tools.ts TOOL_DEFINITIONS. Regenerate: pnpm docs:mcp -->

# AI-PM MCP tools

45 tools. Every tool result stays under 150,000 characters. List tools return `structuredContent` matching their output schema and page with an opaque `cursor`: pass the returned `nextCursor` (with the same other arguments) to get the next page; no `nextCursor` = last page.

Errors come back as `isError: true` with `{ success: false, status?, error, hint }` — the `hint` says how to fix the call.

## Read-only tools (18)

### `list_projects` — List projects

*read-only, idempotent*

List all projects in the workspace via REST API.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `100`, min 1, max 200)*: Page size (default 100, max 200).
- **Returns** (`structuredContent`, also serialized as the text content):
  - `count` *(required, integer)*: Number of items in this page.
  - `projects` *(required, array of object)*
    - `id` *(required, string)*
    - `key` *(optional, string)*
    - `name` *(optional, string)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `list_project_tags` — List project tags

*read-only, idempotent*

List all tags/features in a project along with their issue count via REST API.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `100`, min 1, max 200)*: Page size (default 100, max 200).
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM') or project UUID.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `projectKey` *(optional, string)*
  - `count` *(required, integer)*: Number of items in this page.
  - `tags` *(required, array of object)*
    - `id` *(optional, string)*
    - `name` *(optional, string)*
    - `color` *(optional, string)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `list_project_statuses` — List project workflow statuses

*read-only, idempotent*

List the workflow statuses (id, name, category, position, is_default) for a project resolved by key via REST API.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `100`, min 1, max 200)*: Page size (default 100, max 200).
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM') or project UUID.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `projectKey` *(optional, string)*
  - `count` *(required, integer)*: Number of items in this page.
  - `statuses` *(required, array of object)*
    - `id` *(optional, string)*
    - `name` *(optional, string)*
    - `category` *(optional, string)*
    - `position` *(optional, number)*
    - `is_default` *(optional, boolean)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `list_claimable_issues` — List claimable issues

*read-only, idempotent*

List claimable (unassigned) issues in a project, newest first. Paged: pass nextCursor as cursor for more.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `projectKey` *(optional, string)*: Project key prefix (e.g. 'AIPM').
  - `limit` *(optional, number, default `20`)*: Page size (default 20, max 50).
- **Returns** (`structuredContent`, also serialized as the text content):
  - `count` *(required, integer)*: Number of items in this page.
  - `claimable_issues` *(required, array of object)*
    - `identifier` *(required, string)*
    - `title` *(required, string)*
    - `status` *(optional, string)*
    - `priority` *(optional, string)*
    - `assignee` *(optional, string)*
    - `version` *(optional, integer)*
    - `project_key` *(optional, string)*
    - `due_date` *(optional, string)*
    - `tags` *(optional, array of string)*
    - `created_at` *(optional, string)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `list_issues` — List issues

*read-only, idempotent*

List issues in compact form (no description/history) with filters (projectKey, status, priority, assignee, tags, tagMode, includeTags, query/q search, includeArchived), newest first. Paged: limit default 20 max 100; pass nextCursor as cursor for more.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `projectKey` *(optional, string)*: Project key prefix (e.g. 'AIPM').
  - `status` *(optional, string)*: Status name filter (e.g. 'In Progress').
  - `priority` *(optional, string, one of `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"`)*: Priority filter.
  - `assignee` *(optional, string)*: Assignee name or email filter.
  - `tags` *(optional, array of string)*: Filter issues by tag names (e.g. ['UI', 'fashion']).
  - `tagMode` *(optional, string, one of `"AND"`, `"OR"`, default `"OR"`)*: Tag filter match mode ('AND' or 'OR').
  - `includeTags` *(optional, boolean, default `false`)*: Include tags for each issue ({id, name, color}).
  - `query` *(optional, string)*: Search keyword/phrase matched against title and description.
  - `limit` *(optional, number, default `20`)*: Maximum issues to return (default 20, max 100).
  - `offset` *(optional, number, default `0`)*: Legacy pagination offset; prefer cursor (cursor wins when both are set).
  - `includeArchived` *(optional, boolean, default `false`)*: Include archived issues.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `offset` *(optional, integer)*: Offset of the first item of this page.
  - `limit` *(optional, integer)*: Requested page size.
  - `count` *(required, integer)*: Number of items in this page.
  - `issues` *(required, array of object)*
    - `identifier` *(required, string)*
    - `title` *(required, string)*
    - `priority` *(optional, string)*
    - `status` *(optional, string)*
    - `assignee` *(optional, string)*
    - `project_key` *(optional, string)*
    - `is_archived` *(optional, boolean)*
    - `version` *(optional, integer)*
    - `created_at` *(optional, string)*
    - `updated_at` *(optional, string)*
    - `tags` *(optional, array of object)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `search_issues` — Search issues

*read-only, idempotent*

Search issues across title and description by keyword/phrase (e.g. tinh luyện, character sheet). Returns matching issues with status, priority, assignee, and optional tags. Paged: pass nextCursor as cursor for more.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `query` *(required, string)*: Search keyword or phrase.
  - `projectKey` *(optional, string)*: Optional project key prefix (e.g. PW, CPN).
  - `tags` *(optional, array of string)*: Optional filter by tag names.
  - `tagMode` *(optional, string, one of `"AND"`, `"OR"`, default `"OR"`)*: Tag match mode ('AND' or 'OR').
  - `includeTags` *(optional, boolean, default `false`)*: Include tags for each matching issue.
  - `limit` *(optional, number, default `20`)*: Max results (default 20, max 50).
  - `includeArchived` *(optional, boolean, default `false`)*: Include archived issues.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `offset` *(optional, integer)*: Offset of the first item of this page.
  - `limit` *(optional, integer)*: Requested page size.
  - `count` *(required, integer)*: Number of items in this page.
  - `issues` *(required, array of object)*
    - `identifier` *(required, string)*
    - `title` *(required, string)*
    - `priority` *(optional, string)*
    - `status` *(optional, string)*
    - `assignee` *(optional, string)*
    - `project_key` *(optional, string)*
    - `is_archived` *(optional, boolean)*
    - `version` *(optional, integer)*
    - `created_at` *(optional, string)*
    - `updated_at` *(optional, string)*
    - `tags` *(optional, array of object)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `get_issues_batch` — Get issues (batch)

*read-only, idempotent*

Read multiple issues in a single batch call (up to 200 issues) with status, assignee, tags, and participants via REST API. Highly recommended over sequential get_issue_context calls. Results follow the order of `identifiers` (unknown ones are skipped); if the result is truncated for size, call again with the same identifiers and cursor=nextCursor.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `identifiers` *(required, array of string, min 1 items, max 200 items)*: List of issue identifiers to retrieve (e.g. ['AIPM-1', 'AIPM-2']).
  - `fields` *(optional, array of string)*: Optional fields to include (e.g. ['description', 'tags', 'status', 'assignee']).
- **Returns** (`structuredContent`, also serialized as the text content):
  - `count` *(required, integer)*: Number of items in this page.
  - `issues` *(required, array of object)*
    - `id` *(optional, string)*
    - `identifier` *(required, string)*
    - `title` *(optional, string)*
    - `description` *(optional, string)*
    - `priority` *(optional, string)*
    - `status` *(optional, object)*: { id, name, category }
    - `assignee` *(optional, object)*: { id, name, email? }
    - `project_key` *(optional, string)*
    - `tags` *(optional, array of object)*
    - `participants` *(optional, array of object)*
    - `version` *(optional, integer)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `get_issue_context` — Get issue context

*read-only, idempotent*

Fetch comprehensive technical context for an issue via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `maxTokens` *(optional, number, default `4000`)*: Maximum token budget for context payload.

### `search_users` — Search users

*read-only, idempotent*

Search workspace users (optionally within a project) by name or email. Use before assign_issue to resolve a person to a user id.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `50`, min 1, max 200)*: Page size (default 50, max 200).
  - `q` *(required, string)*: Name or email fragment (case-insensitive).
  - `projectKey` *(optional, string)*: Optional project key (e.g. 'AIPM') to scope to project members.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `count` *(required, integer)*: Number of items in this page.
  - `users` *(required, array of object)*
    - `id` *(optional, string)*
    - `name` *(optional, string)*
    - `email` *(optional, string)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `list_issue_comments` — List issue comments

*read-only, idempotent*

Fetch all comments for an issue via REST API.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `50`, min 1, max 200)*: Page size (default 50, max 200).
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46') or UUID.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `success` *(optional, boolean)*
  - `count` *(required, integer)*: Number of items in this page.
  - `comments` *(required, array of object)*
    - `id` *(optional, string)*
    - `body` *(optional, string)*
    - `author` *(optional, object)*: { id, name, email }
    - `created_at` *(optional, string)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `get_project_summary` — Get project summary

*read-only, idempotent*

Get summary metrics, active blockers, and milestone status for a project via REST API.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').

### `get_schedule` — Get schedule

*read-only, idempotent*

Get scheduled focus time and calendar events via REST API.

- **Parameters**:
  - `projectKey` *(optional, string)*: Optional project key filter.

### `search_wiki_pages` — Search wiki pages

*read-only, idempotent*

Search project wiki documentation pages via REST API.

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `50`, min 1, max 200)*: Page size (default 50, max 200).
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `query` *(optional, string)*: Search query term.
- **Returns** (`structuredContent`, also serialized as the text content):
  - `count` *(required, integer)*: Number of items in this page.
  - `wiki_pages` *(required, array of object)*
    - `slug` *(optional, string)*
    - `title` *(optional, string)*
    - `summary` *(optional, string)*
    - `format` *(optional, string)*
    - `updated_at` *(optional, string)*
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `get_wiki_page` — Get wiki page

*read-only, idempotent*

Get a wiki page by project key and slug via REST API.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `slug` *(required, string)*: Wiki page slug (e.g. 'architecture/overview').

### `get_daily_report` — Get daily report

*read-only, idempotent*

Get a consolidated daily report for a project (totals, priority/assignee breakdown, today's activity, velocity, stale tasks, alerts, my board, by_tag) via REST API. Refreshes today's snapshot if stale.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `sections` *(optional, array of string)*: Optional subset of report sections to include (defaults to all).

### `get_issue_approvals` — Get issue approvals

*read-only, idempotent*

Approval state of an issue: project policy, current round and its status (PENDING / APPROVED / CHANGES_REQUESTED / REJECTED), and every round (newest first) with each reviewer's decision and note.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').

### `list_issue_attachments` — List issue attachments

*read-only, idempotent*

List all attachments for an issue (with a short-lived `signed_url` for each).

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `50`, min 1, max 200)*: Page size (default 50, max 200).
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-68' or UUID)
- **Returns** (`structuredContent`, also serialized as the text content):
  - `success` *(optional, boolean)*
  - `count` *(required, integer)*: Number of items in this page.
  - `attachments` *(required, array of object)*
    - `id` *(optional, string)*
    - `url` *(optional, string)*: Stable reference to embed in markdown.
    - `signed_url` *(optional, string)*: Works without auth for ~10 minutes.
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

### `list_wiki_attachments` — List wiki attachments

*read-only, idempotent*

List all attachments for a wiki page (with a short-lived `signed_url` for each).

- **Parameters**:
  - `cursor` *(optional, string)*: Opaque pagination cursor: pass the nextCursor from the previous call (with the same other arguments) to get the next page. Omit for the first page.
  - `limit` *(optional, integer, default `50`, min 1, max 200)*: Page size (default 50, max 200).
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM')
  - `slug` *(required, string)*: Wiki page slug (e.g. 'architecture')
- **Returns** (`structuredContent`, also serialized as the text content):
  - `success` *(optional, boolean)*
  - `count` *(required, integer)*: Number of items in this page.
  - `attachments` *(required, array of object)*
    - `id` *(optional, string)*
    - `url` *(optional, string)*: Stable reference to embed in markdown.
    - `signed_url` *(optional, string)*: Works without auth for ~10 minutes.
  - `nextCursor` *(optional, string)*: Present when more results exist: pass it as `cursor` to get the next page.
  - `truncated` *(optional, boolean)*: True when the page was cut to stay under the result size limit.
  - `note` *(optional, string)*: Explains a truncation.

## Write tools (20)

### `claim_issue` — Claim issue

*write*

Claim an issue using optimistic concurrency control (version check) via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `expectedVersion` *(required, number)*: Expected current version number of the issue.
  - `agentId` *(required, string)*: Agent UUID claiming the issue.
  - `planSummary` *(optional, string)*: Optional summary of technical implementation plan.

### `report_blocker` — Report blocker

*write*

Report a blocker for an issue via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `reason` *(required, string)*: Detailed reason for the blocker.
  - `blockerType` *(optional, string, default `"TECHNICAL"`)*: Type of blocker.

### `create_issue` — Create issue

*write*

Create a new issue in a project via REST API.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `title` *(required, string)*: Short descriptive title.
  - `description` *(optional, string)*: Detailed issue description.
  - `priority` *(optional, string, one of `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"`, default `"MEDIUM"`)*
  - `status` *(optional, string)*: Status name (e.g. 'Todo', 'In Progress', 'Backlog').
  - `statusId` *(optional, string)*: Workflow status UUID.
  - `assignee` *(optional, string)*: Assignee user name or email (e.g. 'John Doe' or 'john@example.com').
  - `assigneeId` *(optional, string)*: Assignee user or agent UUID.
  - `tags` *(optional, array of string)*: List of tag names (e.g. ['bug', 'frontend']) or tag UUIDs to attach. Missing tag names will be auto-created in the project.
  - `tagIds` *(optional, array of string)*: List of tag UUIDs to attach.
  - `cycleId` *(optional, string)*: Cycle UUID to associate with the issue.
  - `milestoneId` *(optional, string)*: Milestone UUID to associate with the issue.
  - `parentId` *(optional, string)*: Parent issue UUID or identifier (e.g. 'AIPM-10').
  - `dueDate` *(optional, string)*: ISO date string for due date.
  - `participants` *(optional, array of string | object)*: Optional list of participants to attach to the issue. Can be user names, emails, UUIDs, or objects with { user, userId, role } (roles: ASSIGNEE, REVIEWER, NEXT_REVIEWER, OBSERVER). Only a project LEAD or workspace OWNER/ADMIN may add, change or remove REVIEWER / NEXT_REVIEWER (403 otherwise).
  - `participantIds` *(optional, array of string)*: List of user UUIDs to attach as participants (default role OBSERVER).

### `update_issue_status` — Update issue status

*write*

Update the status of an issue via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `status` *(required, string)*: New status name (e.g. 'In Progress', 'Done', 'Code Review').
  - `expectedVersion` *(optional, number)*: Optional expected version for OCC.
  - `cost` *(optional, number)*: Optional execution cost in USD (e.g. 0.0002).

### `assign_issue` — Assign issue

*write, idempotent*

Assign an issue to a user (by name or email) via REST API. Agents act through user tokens — issues are always assigned to a person.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `assignee` *(required, string)*: User name or email (case-insensitive). Preferred over assigneeId — the server resolves it among the issue's project members. Use search_users first if unsure.
  - `assigneeId` *(optional, string)*: Optional fallback: assignee user UUID.

### `add_issue_comment` — Add issue comment

*write*

Add a comment to an issue via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `body` *(required, string)*: Markdown text of the comment.

### `create_cycle` — Create cycle

*write*

Create a new development sprint/cycle for a project via REST API.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `name` *(required, string)*: Cycle name (e.g. 'Sprint 14').
  - `startsAt` *(optional, string)*: Optional ISO start date string.
  - `endsAt` *(optional, string)*: Optional ISO end date string.
  - `description` *(optional, string)*: Optional cycle goal description.

### `add_issue_to_cycle` — Add issue to cycle

*write, idempotent*

Add an issue to a cycle via REST API.

- **Parameters**:
  - `cycleId` *(required, string)*: Cycle UUID.
  - `issueIdentifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').

### `assign_issues` — Assign issues (batch)

*write, idempotent*

Batch-assign multiple issues (1 call). Each item assigns one issue to a user by name/email (or assigneeId). max 50 items. atomic=true rolls back all on any failure.

- **Parameters**:
  - `items` *(required, array of object, min 1 items, max 50 items)*
    - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
    - `assignee` *(optional, string)*: User name or email (case-insensitive).
    - `assigneeId` *(optional, string)*: Optional fallback: assignee user UUID.
  - `atomic` *(optional, boolean, default `false`)*: If true, any failure rolls back all successful assignments in the batch.

### `update_issues_status` — Update issue statuses (batch)

*write, idempotent*

Batch-update the status of multiple issues (1 call). max 50 items. atomic=true rolls back all on any failure.

- **Parameters**:
  - `items` *(required, array of object, min 1 items, max 50 items)*
    - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
    - `status` *(required, string)*: New status name (e.g. 'In Progress', 'Done').
    - `expectedVersion` *(optional, number)*: Optional expected version for OCC.
  - `atomic` *(optional, boolean, default `false`)*: If true, any failure rolls back all successful status updates in the batch.

### `add_issues_to_cycle` — Add issues to cycle (batch)

*write, idempotent*

Batch-add multiple issues to a cycle (1 call). max 50 identifiers. atomic=true rolls back all on any failure.

- **Parameters**:
  - `cycleId` *(required, string)*: Cycle UUID.
  - `identifiers` *(required, array of string, min 1 items, max 50 items)*
  - `atomic` *(optional, boolean, default `false`)*: If true, any failure removes all successfully-added issues from the cycle.

### `schedule_focus_time` — Schedule focus time

*write*

Schedule focus time for an issue on the calendar via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `startsAt` *(required, string)*: ISO start date-time string.
  - `durationHours` *(optional, number, default `2`)*: Duration in hours.

### `link_issue_to_wiki` — Link issue to wiki page

*write*

Link an issue to a wiki document via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `wikiSlug` *(required, string)*: Wiki page slug.
  - `relationType` *(optional, string, default `"SPECIFIES"`)*

### `create_issues` — Create issues (batch)

*write*

Create up to 50 issues at once in a project (1 call). Each issue may set title/status/assignee/tags/participants. atomic=true (default) rolls back all if any fails; atomic=false reports per-item failures.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `atomic` *(optional, boolean, default `false`)*: If true, all issues create in one transaction (any failure aborts all). Default false for best-effort.
  - `issues` *(required, array of object, min 1 items, max 50 items)*
    - `title` *(required, string)*: Issue title.
    - `description` *(optional, string)*: Detailed description.
    - `priority` *(optional, string, one of `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"`, default `"MEDIUM"`)*
    - `status` *(optional, string)*: Status name (e.g. 'Todo', 'In Progress').
    - `statusId` *(optional, string)*: Workflow status UUID.
    - `assignee` *(optional, string)*: Assignee user name/email.
    - `assigneeId` *(optional, string)*: Assignee user UUID.
    - `tags` *(optional, array of string)*
    - `tagIds` *(optional, array of string)*
    - `cycleId` *(optional, string)*
    - `milestoneId` *(optional, string)*
    - `dueDate` *(optional, string)*
    - `participants` *(optional, array of string | object)*
    - `participantIds` *(optional, array of string)*

### `request_review` — Request review

*write*

Submit an issue for review (approval flow): opens a new review round with a PENDING approval for every REVIEWER participant (two-step projects then ask the NEXT_REVIEWERs) and moves the issue to the project's review status. Only for projects with an approval policy (any / all / two_step); there, Done is reached only when the round is approved — update_issue_status to Done is refused with APPROVAL_REQUIRED. The assignee and the caller never review their own round.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').

### `approve_issue` — Approve issue

*write*

Approve an issue as one of its reviewers: records APPROVED on YOUR pending approval in the open review round. When the round is complete (policy any / all / two_step) the issue moves to Done automatically. Fails with a clear code when you have no pending approval (NO_PENDING_APPROVAL), the round is closed (ROUND_CLOSED), the issue was never submitted (NO_REVIEW_ROUND), the project has no approval policy (APPROVAL_DISABLED) or you are its assignee / requester (SELF_APPROVAL).

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `note` *(optional, string)*: Optional comment for the assignee (max 4000 chars).

### `request_changes` — Request changes

*write*

Request changes as one of the issue's reviewers: records CHANGES_REQUESTED (with the reason) on YOUR pending approval, closes the review round and moves the issue back to In Progress; the assignee fixes it and calls request_review again. Same error codes as approve_issue.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `note` *(required, string)*: What must change (required, max 4000 chars).

### `reject_issue` — Reject issue

*write*

Reject an issue as one of its reviewers: records REJECTED (with the reason) on YOUR pending approval, closes the review round and moves the issue to the project's Rejected status. Use request_changes instead when the work can be fixed. Same error codes as approve_issue.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `note` *(required, string)*: Why the issue is rejected (required, max 4000 chars).

### `upload_issue_attachment` — Upload issue attachment

*write*

Upload a file attachment to an issue using base64 encoded data. Allowed (detected from content): images jpg/png/gif/webp (max 10 MB) and pdf, docx, xlsx, pptx, csv, txt, zip (max 20 MB); svg/html/executables are rejected. Counts toward the workspace storage quota. The returned `url` is the stable reference to embed in markdown; `signed_url` works without auth for ~10 minutes.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-68' or UUID)
  - `filename` *(required, string)*: Name of the file (e.g. 'screenshot.png')
  - `base64Data` *(required, string)*: Base64 encoded file content (can include data URL prefix or raw base64)
  - `contentType` *(optional, string)*: Ignored: the type is detected from the file content

### `upload_wiki_attachment` — Upload wiki attachment

*write*

Upload a file attachment to a wiki page using base64 encoded data. Allowed (detected from content): images jpg/png/gif/webp (max 10 MB) and pdf, docx, xlsx, pptx, csv, txt, zip (max 20 MB); svg/html/executables are rejected. Counts toward the workspace storage quota. The returned `url` is the stable reference to embed in markdown; `signed_url` works without auth for ~10 minutes.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM')
  - `slug` *(required, string)*: Wiki page slug (e.g. 'architecture')
  - `filename` *(required, string)*: Name of the file (e.g. 'diagram.png')
  - `base64Data` *(required, string)*: Base64 encoded file content (can include data URL prefix or raw base64)
  - `contentType` *(optional, string)*: Ignored: the type is detected from the file content

## Destructive write tools (7)

### `update_issue` — Update issue

*write, destructive, idempotent*

Update fields of an issue (priority, title, description, status, assignee, tags, dueDate, expectedVersion, cost) via REST API. Assignee may be a name/email/UUID, 'unassigned', or null. Tag names are auto-created in the project.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `title` *(optional, string)*: New title.
  - `description` *(optional, string)*: New description.
  - `priority` *(optional, string, one of `"LOW"`, `"MEDIUM"`, `"HIGH"`, `"URGENT"`)*: New priority.
  - `status` *(optional, string)*: New status name (e.g. 'Done', 'In Progress').
  - `assignee` *(optional, string | null)*: Assignee user name, email, or UUID; 'unassigned' or null clears the assignee. Preferred over assigneeId.
  - `assigneeId` *(optional, string | null)*: Optional assignee user UUID (or null to unassign).
  - `tags` *(optional, array of string)*: List of tag names to set (replaces the current set). Missing names are auto-created in the project.
  - `tagIds` *(optional, array of string)*: List of tag UUIDs to set (replaces the current set).
  - `dueDate` *(optional, string | null)*: ISO date string for due date (null clears).
  - `expectedVersion` *(optional, number)*: Optional expected current version for OCC (409 on conflict).
  - `cost` *(optional, number)*: Optional execution cost in USD (e.g. 0.0002).
  - `participants` *(optional, array of string | object)*: Replace the issue's participant set. Items are user names/emails/UUIDs or { user, userId, role } (roles: ASSIGNEE, REVIEWER, NEXT_REVIEWER, OBSERVER). The assignee is kept as ASSIGNEE. Only a project LEAD or workspace OWNER/ADMIN may add, change or remove REVIEWER / NEXT_REVIEWER (403 otherwise).
  - `participantIds` *(optional, array of string)*: List of user UUIDs to set as the issue's participants (default role OBSERVER).

### `archive_issue` — Archive issue

*write, destructive, idempotent*

Archive an issue via REST API.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').

### `create_or_update_wiki_page` — Create or update wiki page

*write, destructive, idempotent*

Create or update a project wiki page via REST API.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `slug` *(required, string)*: Wiki page slug.
  - `title` *(required, string)*: Page title.
  - `content` *(required, string)*: Markdown/Mermaid content.
  - `format` *(optional, string, one of `"MARKDOWN"`, `"MERMAID"`, `"DRAWIO"`, `"HTML"`, default `"MARKDOWN"`)*

### `delete_wiki_page` — Delete wiki page

*write, destructive, idempotent*

Delete a project wiki page and its attachments via REST API.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM').
  - `slug` *(required, string)*: Wiki page slug to delete.

### `set_issue_participants` — Set issue participants

*write, destructive, idempotent*

Replace an issue's participant set (assignee is always kept as ASSIGNEE). Accepts user names/emails/UUIDs or objects with role. Only a project LEAD or workspace OWNER/ADMIN may add, change or remove REVIEWER / NEXT_REVIEWER (403 otherwise).

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-46').
  - `participants` *(optional, array of string | object)*
  - `participantIds` *(optional, array of string)*

### `delete_issue_attachment` — Delete issue attachment

*write, destructive, idempotent*

Delete an attachment from an issue by attachmentId.

- **Parameters**:
  - `identifier` *(required, string)*: Issue identifier (e.g. 'AIPM-68' or UUID)
  - `attachmentId` *(required, string)*: UUID of the attachment to delete

### `delete_wiki_attachment` — Delete wiki attachment

*write, destructive, idempotent*

Delete an attachment from a wiki page by attachmentId.

- **Parameters**:
  - `projectKey` *(required, string)*: Project key prefix (e.g. 'AIPM')
  - `slug` *(required, string)*: Wiki page slug (e.g. 'architecture')
  - `attachmentId` *(required, string)*: UUID of the attachment to delete
