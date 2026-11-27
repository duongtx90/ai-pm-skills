import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AipmBoard, AipmComment, AipmDetail, AipmIssue, AipmOpen, AipmStatus } from '../types'

const PANE = 'aipm-tasks'
const TITLE = 'AIPM tasks'
const PAGE = 100
const MAX_PAGES = 5
// Fallback when a status is not in the workflow list (older API, deleted status).
const DONE_NAME = /\b(done|closed|cancel(l)?ed|resolved|rejected)\b|hoàn thành|đã xong|hủy/i
const CLOSED_CATEGORIES = new Set(['DONE', 'REJECTED'])

const PRIORITY: Record<string, { label: string; dot: string; rank: number }> = {
  URGENT: { label: 'Khẩn cấp', dot: '#E5484D', rank: 0 },
  HIGH: { label: 'Cao', dot: '#F5A524', rank: 1 },
  MEDIUM: { label: 'Trung bình', dot: '#4C7DFF', rank: 2 },
  LOW: { label: 'Thấp', dot: '#98A2B3', rank: 3 },
}
const AVATAR_COLORS = ['#F06A6A', '#7A5AF8', '#2E90FA', '#12B76A', '#F79009', '#EE46BC', '#0BA5EC']

const EMPTY: AipmBoard = {
  phase: 'idle',
  projectKey: '',
  statuses: [],
  issues: [],
  truncated: false,
  error: '',
  fetchedAt: 0,
}
// Change the tag when AipmBoard's fields change: it declines what an older version stored.
const board = atom({ plugin: 'aipm-tasks', key: 'board' } as const, EMPTY, { shape: 'board-3' })
const tab = atom({ plugin: 'aipm-tasks', key: 'tab' } as const, '')
const openTask = atom({ plugin: 'aipm-tasks', key: 'open' } as const, null as AipmOpen | null, { shape: 'open-1' })

type Options = {
  token: string
  apiBaseUrl: string
  projectKey: string
  orgId: string
  refreshSeconds: number
}

function readOptions(raw: Readonly<Record<string, unknown>>): Options {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    token: str(raw.token),
    apiBaseUrl: str(raw.apiBaseUrl).replace(/\/+$/, '') || 'https://prj-api.brewmonster.vn/api/v1',
    projectKey: str(raw.projectKey).toUpperCase(),
    orgId: str(raw.orgId),
    refreshSeconds: typeof raw.refreshSeconds === 'number' ? raw.refreshSeconds : 60,
  }
}

/** Each folder from `dir` up to the filesystem root. */
function upwards(dir: string): string[] {
  const out: string[] = []
  let cur = dir.replace(/\/+$/, '')
  while (cur !== '') {
    out.push(cur)
    cur = cur.slice(0, cur.lastIndexOf('/'))
  }
  return out
}

/**
 * The project key: the option, else the nearest `.aipm/config.json` above the
 * session's project root or its current folder (a shell `cd` into a subfolder
 * moves the latter, never the former).
 */
async function resolveProjectKey($: EngineInterface, opts: Options): Promise<string> {
  if (opts.projectKey) return opts.projectKey
  const starts = await Promise.all([$.session.root(), $.session.cwd()])
  const tried = new Set<string>()
  for (const dir of starts.flatMap(upwards)) {
    if (tried.has(dir)) continue
    tried.add(dir)
    try {
      const parsed: unknown = JSON.parse(await $.fs.read(`${dir}/.aipm/config.json`))
      const key = (parsed as { projectKey?: unknown } | null)?.projectKey
      if (typeof key === 'string' && key.trim() !== '') return key.trim().toUpperCase()
    } catch {
      // Not here (or unreadable): look one folder up.
    }
  }
  return ''
}

function apiMessage(status: number, text: string): string {
  let message = ''
  try {
    const body = JSON.parse(text) as { message?: unknown; error?: unknown }
    message = String(body.message ?? body.error ?? '')
  } catch {
    message = text.slice(0, 160)
  }
  if (status === 401) return 'Token sai hoặc đã hết hạn (401).'
  if (status === 403) return 'Token không có quyền với project này (403).'
  if (status === 404) return 'Không tìm thấy project key (404).'
  return `API lỗi ${status}${message ? `: ${message}` : ''}`
}

class ApiFailure extends Error {}

function toIssue(raw: unknown): AipmIssue {
  const i = (raw ?? {}) as Record<string, unknown>
  const s = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null)
  return {
    identifier: String(i.identifier ?? ''),
    title: String(i.title ?? ''),
    priority: s(i.priority),
    status: s(i.status),
    assignee: s(i.assignee),
    url: s(i.url),
  }
}

function toStatus(raw: unknown): AipmStatus {
  const s = (raw ?? {}) as Record<string, unknown>
  return { name: String(s.name ?? ''), category: String(s.category ?? '').toUpperCase() }
}

type Api = { projectKey: string; getJson: (path: string) => Promise<unknown> }

/** Token, project key and a JSON getter; or what is missing, as a sentence. */
async function connect($: EngineInterface, base: Options): Promise<Api | { missing: string; projectKey: string }> {
  const token = base.token || ((await $.env.get('AIPM_TOKEN')) ?? '').trim()
  const projectKey = await resolveProjectKey($, base)
  if (!token) {
    return {
      projectKey,
      missing: 'Chưa có token: đặt "AIPM token" trong cấu hình plugin aipm-tasks, hoặc biến môi trường AIPM_TOKEN.',
    }
  }
  if (!projectKey) return { projectKey, missing: 'Chưa có project key: đặt "Project key" hoặc tạo .aipm/config.json.' }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
  }
  if (base.orgId) headers['x-org-id'] = base.orgId
  const getJson = async (path: string): Promise<unknown> => {
    const res = await $.http.fetch(`${base.apiBaseUrl}${path}`, { headers })
    if (!res.ok) throw new ApiFailure(apiMessage(res.status, res.text))
    return JSON.parse(res.text) as unknown
  }
  return { projectKey, getJson }
}

function failure(err: unknown): string {
  return err instanceof ApiFailure ? err.message : `Không gọi được API: ${err instanceof Error ? err.message : String(err)}`
}

async function refresh($: EngineInterface, base: Options): Promise<void> {
  const api = await connect($, base)
  if ('missing' in api) {
    await update($, board, (): AipmBoard => ({ ...EMPTY, phase: 'error', projectKey: api.projectKey, error: api.missing }))
    return
  }
  const { projectKey, getJson } = api
  await update($, board, (b): AipmBoard => ({ ...b, phase: 'loading', projectKey }))

  const loadIssues = async () => {
    const issues: AipmIssue[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = new URLSearchParams({
        compact: 'true',
        projectKey,
        limit: String(PAGE),
        offset: String(page * PAGE),
      })
      const body = (await getJson(`/issues?${query}`)) as { issues?: unknown }
      const rows = Array.isArray(body?.issues) ? body.issues : []
      issues.push(...rows.map(toIssue))
      if (rows.length < PAGE) return { issues, truncated: false }
    }
    return { issues, truncated: true }
  }

  const loadStatuses = async () => {
    const body = await getJson(`/projects/${encodeURIComponent(projectKey)}/statuses`)
    return (Array.isArray(body) ? body : []).map(toStatus).filter(s => s.name !== '')
  }

  try {
    const [{ issues, truncated }, statuses] = await Promise.all([loadIssues(), loadStatuses()])
    await update($, board, (): AipmBoard => ({
      phase: 'ok',
      projectKey,
      statuses,
      issues,
      truncated,
      error: '',
      fetchedAt: Date.now(),
    }))
  } catch (err) {
    await update($, board, (b): AipmBoard => ({ ...b, phase: 'error', error: failure(err) }))
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const nameOf = (v: unknown) => {
  if (typeof v === 'string') return v || null
  const n = (v as { name?: unknown } | null)?.name
  return typeof n === 'string' && n !== '' ? n : null
}

function toDetail(raw: unknown, comments: unknown): AipmDetail {
  const i = (raw ?? {}) as Record<string, unknown>
  const list: AipmComment[] = (Array.isArray(comments) ? comments : []).map(c => {
    const o = (c ?? {}) as Record<string, unknown>
    return { author: nameOf(o.author) ?? 'Ẩn danh', body: str(o.body), createdAt: str(o.created_at) }
  })
  return {
    identifier: str(i.identifier),
    title: str(i.title),
    description: str(i.description),
    status: nameOf(i.status),
    priority: typeof i.priority === 'string' ? i.priority : null,
    assignee: nameOf(i.assignee),
    tags: (Array.isArray(i.tags) ? i.tags : []).map(nameOf).filter((t): t is string => t !== null),
    url: typeof i.url === 'string' && i.url !== '' ? i.url : null,
    createdAt: str(i.created_at),
    comments: list,
  }
}

/** Opens one task in the detail view and loads it with its comments. */
async function showTask($: EngineInterface, base: Options, identifier: string): Promise<void> {
  await update($, openTask, (): AipmOpen => ({ identifier, phase: 'loading', detail: null, error: '' }))
  const api = await connect($, base)
  if ('missing' in api) {
    await update($, openTask, (): AipmOpen => ({ identifier, phase: 'error', detail: null, error: api.missing }))
    return
  }
  const id = encodeURIComponent(identifier)
  try {
    const [issue, comments] = await Promise.all([
      api.getJson(`/issues/${id}`),
      // Comments are secondary: the task still shows when they fail.
      api.getJson(`/issues/${id}/comments`).catch(() => []),
    ])
    const detail = toDetail(issue, comments)
    // The person may have opened another task meanwhile: keep theirs.
    await update($, openTask, (o): AipmOpen | null =>
      o?.identifier === identifier ? { identifier, phase: 'ok', detail, error: '' } : o,
    )
  } catch (err) {
    await update($, openTask, (o): AipmOpen | null =>
      o?.identifier === identifier ? { identifier, phase: 'error', detail: null, error: failure(err) } : o,
    )
  }
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${clockTime(d.getTime())}`
}

type Column = { name: string; isClosed: boolean; issues: AipmIssue[] }

const issueNumber = (i: AipmIssue) => Number(i.identifier.split('-').pop()) || 0

/** Every workflow status in order, with its tasks; statuses the workflow lacks go last. */
function columns(b: AipmBoard): Column[] {
  const byName = new Map<string, Column>()
  for (const s of b.statuses) {
    byName.set(s.name, { name: s.name, isClosed: CLOSED_CATEGORIES.has(s.category), issues: [] })
  }
  for (const issue of b.issues) {
    const name = issue.status ?? 'No status'
    let col = byName.get(name)
    if (!col) {
      col = { name, isClosed: DONE_NAME.test(name), issues: [] }
      byName.set(name, col)
    }
    col.issues.push(issue)
  }
  for (const col of byName.values()) {
    col.issues.sort(
      (a, c) =>
        (PRIORITY[a.priority ?? '']?.rank ?? 4) - (PRIORITY[c.priority ?? '']?.rank ?? 4) ||
        issueNumber(c) - issueNumber(a),
    )
  }
  return [...byName.values()]
}

/** The picked tab if it still exists, else the first open status with tasks. */
function activeColumn(cols: Column[], picked: string): Column | undefined {
  return (
    cols.find(c => c.name === picked) ??
    cols.find(c => !c.isClosed && c.issues.length > 0) ??
    cols.find(c => c.issues.length > 0) ??
    cols[0]
  )
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`)
}

const FONT = `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"`

function dotSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="${color}"/></svg>`
}

/** A round avatar with the name's initials, its color fixed per name. */
function avatarSvg(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0] ?? '?'
  const last = words[words.length - 1] ?? ''
  const initials = (words.length > 1 ? `${first[0] ?? ''}${last[0] ?? ''}` : first.slice(0, 2)).toUpperCase()
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const fill = AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? '#98A2B3'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="${fill}"/><text x="8" y="11" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" ${FONT}>${escapeXml(initials)}</text></svg>`
}

function clockTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function isPaneShown($: EngineInterface): Promise<boolean> {
  return (await $.ui.panes()).some(p => p.id === PANE && p.isShown)
}

export const register: Register = (on, options) => {
  const opts = readOptions(options)
  // session.start runs again on /clear and resume: keep one timer, not one per start.
  let timer: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'aipm',
      description: 'Show or hide the AIPM tasks sidebar',
    })
    timer?.cancel()
    timer = undefined
    // Repos not bound to AIPM get no band and no polling; /aipm still works there.
    if (!(await resolveProjectKey($, opts))) return next(e)
    // The band above the prompt shows the counts; the sidebar opens only when asked.
    void refresh($, opts)
    if (opts.refreshSeconds > 0) {
      timer = $.clock.every(Math.max(15, opts.refreshSeconds) * 1000, () => void refresh($, opts))
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, board)
    // Nothing to say in a repo without AIPM, or while a survey owns the band.
    if (e.props.hasSurvey || b.phase === 'idle') return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const cols = columns(b)
    const open = cols.filter(c => !c.isClosed)
    const openCount = open.reduce((n, c) => n + c.issues.length, 0)
    const busy = open.filter(c => c.issues.length > 0).map(c => `${c.name} ${c.issues.length}`)
    const summary =
      b.phase === 'error'
        ? b.error
        : b.phase === 'loading' && b.fetchedAt === 0
          ? 'đang tải…'
          : `${openCount} đang mở${busy.length ? ` · ${busy.join(' · ')}` : ''}`

    return (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap="sm">
        <Box flexDirection="row" alignItems="center" gap="sm" flexShrink={1}>
          <Text color={b.phase === 'error' ? 'error' : 'success'}>●</Text>
          <Text weight="semibold">{b.projectKey || 'AIPM'}</Text>
          <Text dimColor color={b.phase === 'error' ? 'error' : undefined} maxLines={1} wrap="truncate-end">
            {summary}
          </Text>
        </Box>
        <Box flexDirection="row" gap="xs">
          <Button
            key="tasks"
            plain
            label="Tasks"
            onPress={async () => {
              if (await isPaneShown($)) await $.ui.close({ id: PANE })
              else await $.ui.open({ id: PANE, title: TITLE })
            }}
          />
          <Button key="band-refresh" plain label="Làm mới" onPress={() => refresh($, opts)} />
        </Box>
      </Box>
    )
  })

  on('command.run', { command: 'aipm' }, async $ => {
    if (await isPaneShown($)) {
      await $.ui.close({ id: PANE })
      return { text: 'AIPM: đã ẩn sidebar (gõ /aipm để mở lại).' }
    }
    await $.ui.open({ id: PANE, title: TITLE })
    await refresh($, opts)
    const b = await read($, board)
    if (b.phase === 'error') return { text: `AIPM: ${b.error}` }
    const counts = columns(b).map(c => `${c.name} ${c.issues.length}`)
    return { text: `${b.projectKey}: ${b.issues.length} task${b.truncated ? '+' : ''} · ${counts.join(' · ')}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button, Link, Markdown, Progress } = ui
    const Svg = 'Svg' in ui ? ui.Svg : undefined
    const opened = await read($, openTask)
    if (opened) {
      const d = opened.detail
      const pr = d?.priority ? PRIORITY[d.priority] : undefined
      const chip = (text: string, color?: Parameters<typeof Text>[0]['color']) => (
        <Box paddingX="xs" borderStyle="round" borderDimColor>
          <Text size="caption" color={color}>
            {text}
          </Text>
        </Box>
      )
      const MAX_BODY = 6000
      const description = d?.description.trim() ?? ''
      return (
        <Box flexDirection="column" gap="sm">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap="sm">
            <Button key="back" variant="secondary" label="← Danh sách" onPress={() => update($, openTask, () => null)} />
            <Text size="caption" mono dimColor>
              {opened.identifier}
            </Text>
          </Box>

          {opened.phase === 'loading' && (
            <Text size="caption" dimColor>
              Đang tải {opened.identifier}…
            </Text>
          )}
          {opened.phase === 'error' && (
            <Box paddingX="sm" paddingY="xs" borderStyle="round" borderColor="error">
              <Text color="error">{opened.error}</Text>
            </Box>
          )}

          {d && (
            <Box flexDirection="column" gap="sm">
              <Text size="heading" weight="semibold">
                {d.title}
              </Text>
              <Box flexDirection="row" flexWrap="wrap" gap="xs">
                {d.status && chip(d.status)}
                {pr && chip(pr.label, pr.rank <= 1 ? (pr.rank === 0 ? 'error' : 'warning') : undefined)}
                {chip(d.assignee ?? 'Chưa giao')}
                {d.tags.map(t => chip(`#${t}`, 'suggestion'))}
              </Box>
              <Box flexDirection="row" gap="sm" alignItems="center">
                <Button
                  key="insert"
                  variant="primary"
                  label="Chèn vào prompt"
                  onPress={() => $.prompt.fill({ text: `${d.identifier} `, mode: 'insert' })}
                />
                {d.url ? <Link href={d.url} label="Mở trên web ↗" /> : undefined}
              </Box>
              <Box flexDirection="column" paddingTop="xs">
                {description ? (
                  <Markdown text={description.length > MAX_BODY ? `${description.slice(0, MAX_BODY)}\n\n…` : description} />
                ) : (
                  <Text size="caption" dimColor italic>
                    Chưa có mô tả.
                  </Text>
                )}
              </Box>
              {d.comments.length > 0 && (
                <Box flexDirection="column" gap="xs">
                  <Text size="caption" weight="semibold" dimColor>
                    BÌNH LUẬN · {String(d.comments.length)}
                  </Text>
                  {d.comments.slice(-5).map((c, n) => (
                    <Box key={`comment-${n}`} flexDirection="column" paddingX="sm" paddingY="xs" borderStyle="round" borderDimColor>
                      <Text size="caption" dimColor>
                        {c.author} · {shortDate(c.createdAt)}
                      </Text>
                      <Markdown text={c.body.length > 1500 ? `${c.body.slice(0, 1500)}…` : c.body} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )
    }

    const b = await read($, board)
    const cols = columns(b)
    const active = activeColumn(cols, await read($, tab))
    const closed = cols.filter(c => c.isClosed).reduce((n, c) => n + c.issues.length, 0)
    const updated = b.phase === 'loading' ? 'đang tải…' : b.fetchedAt ? clockTime(b.fetchedAt) : ''

    return (
      <Box flexDirection="column" gap="sm">
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap="sm">
          <Box flexDirection="row" alignItems="center" gap="sm">
            <Text weight="semibold">{b.projectKey || 'AIPM'}</Text>
            <Text size="caption" dimColor tabular>
              {updated}
            </Text>
          </Box>
          <Box flexDirection="row" gap="xs">
            <Button key="refresh" variant="secondary" label="Làm mới" onPress={() => refresh($, opts)} />
            <Button key="hide" variant="secondary" role="dismiss" label="Ẩn" onPress={() => $.ui.close({ id: PANE })} />
          </Box>
        </Box>

        {b.issues.length > 0 && (
          <Progress
            label="Tiến độ"
            value={closed}
            max={b.issues.length}
            valueText={`${closed}/${b.issues.length} xong${b.truncated ? ' (mới nhất)' : ''}`}
            color="success"
          />
        )}

        {b.phase === 'error' && (
          <Box paddingX="sm" paddingY="xs" borderStyle="round" borderColor="error">
            <Text color="error">{b.error}</Text>
          </Box>
        )}

        {cols.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" gap="xs">
            {cols.map(col => (
              <Button
                key={`tab-${col.name}`}
                variant={col.name === active?.name ? 'primary' : 'secondary'}
                onPress={() => update($, tab, () => col.name)}
              >
                {col.name} <Text dimColor={col.name !== active?.name}>{String(col.issues.length)}</Text>
              </Button>
            ))}
          </Box>
        )}

        {active && active.issues.length === 0 && (
          <Text size="caption" dimColor>
            Không có task nào ở {active.name}.
          </Text>
        )}

        {active && active.issues.length > 0 && (
          <Box flexDirection="column">
            {active.issues.map(issue => {
              const pr = PRIORITY[issue.priority ?? '']
              return (
                <Box
                  key={`row-${issue.identifier}`}
                  flexDirection="row"
                  alignItems="center"
                  gap="sm"
                  paddingX="xs"
                  paddingY="xs"
                  hover={{ backgroundColor: 'subtle' }}
                >
                  {pr && Svg ? <Svg source={dotSvg(pr.dot)} alt={`Ưu tiên ${pr.label}`} width={8} height={8} /> : undefined}
                  <Box width={9} flexShrink={0}>
                    <Text size="caption" mono dimColor>
                      {issue.identifier}
                    </Text>
                  </Box>
                  <Box flexGrow={1} flexShrink={1}>
                    <Button
                      key={issue.identifier}
                      plain
                      onPress={() => showTask($, opts, issue.identifier)}
                    >
                      <Text size="footnote" maxLines={1} wrap="truncate-end">
                        {issue.title}
                      </Text>
                    </Button>
                  </Box>
                  {issue.assignee && Svg ? (
                    <Svg source={avatarSvg(issue.assignee)} alt={issue.assignee} width={16} height={16} />
                  ) : undefined}
                  {issue.url ? <Link href={issue.url} label="↗" /> : undefined}
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })
}
