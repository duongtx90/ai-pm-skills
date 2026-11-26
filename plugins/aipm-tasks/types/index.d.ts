/** One task as the compact `GET /issues?compact=true` list returns it. */
export type AipmIssue = {
  identifier: string
  title: string
  priority: string | null
  status: string | null
  assignee: string | null
  url: string | null
}

/** One workflow status, in the project's order (`GET /projects/:key/statuses`). */
export type AipmStatus = {
  name: string
  /** BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, REJECTED */
  category: string
}

/** What the sidebar last loaded. */
export type AipmBoard = {
  phase: 'idle' | 'loading' | 'ok' | 'error'
  projectKey: string
  statuses: AipmStatus[]
  issues: AipmIssue[]
  /** More issues exist than the pages fetched. */
  truncated: boolean
  error: string
  fetchedAt: number
}

/** One comment on a task. */
export type AipmComment = {
  author: string
  body: string
  createdAt: string
}

/** The task the detail view shows, as `GET /issues/:identifier` returns it. */
export type AipmDetail = {
  identifier: string
  title: string
  description: string
  status: string | null
  priority: string | null
  assignee: string | null
  tags: string[]
  url: string | null
  createdAt: string
  comments: AipmComment[]
}

/** The detail view: which task, and what loading it came to. */
export type AipmOpen = {
  identifier: string
  phase: 'loading' | 'ok' | 'error'
  detail: AipmDetail | null
  error: string
}

declare module 'claude-code' {
  interface PluginState {
    'aipm-tasks': {
      board: Shaped<AipmBoard>
      /** The status tab the person picked; '' picks the first open one with tasks. */
      tab: string
      /** The task open in the detail view; null shows the list. */
      open: Shaped<AipmOpen | null>
    }
  }
}
