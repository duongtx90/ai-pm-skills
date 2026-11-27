import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE = {
  plugin: 'aipm-tasks',
  component: 'Pane',
  requestId: 'aipm-tasks',
  props: {
    title: 'AIPM tasks',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const RUN = {
  command: 'aipm',
  args: '',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 100 },
} as const

const STATUSES = [
  { name: 'Backlog', category: 'BACKLOG' },
  { name: 'In Progress', category: 'IN_PROGRESS' },
  { name: 'Code Review', category: 'IN_REVIEW' },
  { name: 'Done', category: 'DONE' },
]

const ISSUES = [
  { identifier: 'AIPM-3', title: 'Write the sidebar', priority: 'HIGH', status: 'In Progress', assignee: 'Duong Tx', url: 'https://example.com/i/AIPM-3' },
  { identifier: 'AIPM-2', title: 'Plan it', priority: 'LOW', status: 'Backlog', assignee: null, url: null },
  { identifier: 'AIPM-1', title: 'Old work', priority: 'LOW', status: 'Done', assignee: null, url: null },
]

const DETAIL = {
  identifier: 'AIPM-2',
  title: 'Plan it',
  description: '## Mục tiêu\nViết **kế hoạch** chi tiết.',
  priority: 'LOW',
  status: { name: 'Backlog' },
  assignee: { name: 'Duong Tx' },
  tags: [{ name: 'perf' }],
  url: 'https://example.com/i/AIPM-2',
  created_at: '2026-11-26T07:00:00Z',
}
const COMMENTS = [{ body: 'Đã xem, ok.', author: { name: 'Lan' }, created_at: '2026-11-26T08:00:00Z' }]

type Reply = { status: number; ok: boolean; text: string }
type Seen = { urls: string[]; auth?: string }

function engine(on: On, seen: Seen, issues: (offset: string) => Reply) {
  on('command.register', () => ({ value: { command: 'aipm' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // The session sits in a subfolder; the config is at the repo's top.
  on('session.root', () => ({ value: '/repo/apps/backend' }))
  on('session.cwd', () => ({ value: '/repo/apps/backend/src' }))
  on('fs.read', (_, e) => {
    if (e.path !== '/repo/.aipm/config.json') throw new Error('ENOENT')
    return { value: JSON.stringify({ projectKey: 'aipm' }) }
  })
  on('env.get', () => ({ value: undefined }))
  on('http.fetch', (_, e) => {
    seen.urls.push(e.url)
    seen.auth = e.init?.headers?.Authorization
    const url = new URL(e.url)
    const reply = url.pathname.endsWith('/statuses')
      ? { status: 200, ok: true, text: JSON.stringify(STATUSES) }
      : url.pathname.endsWith('/comments')
        ? { status: 200, ok: true, text: JSON.stringify(COMMENTS) }
        : /\/issues\/[A-Z]+-\d+$/.test(url.pathname)
          ? { status: 200, ok: true, text: JSON.stringify(DETAIL) }
          : issues(url.searchParams.get('offset') ?? '')
    return { value: { ...reply, headers: {} } }
  })
}

const onePage = (): Reply => ({ status: 200, ok: true, text: JSON.stringify({ issues: ISSUES }) })

test('shows a tab per workflow status and the first open one with tasks', { options: { token: 'tok' } }, async ($, on) => {
  const seen: Seen = { urls: [] }
  engine(on, seen, onePage)
  await $.command.run(RUN)

  expect(seen.urls.some(u => u.includes('/issues?compact=true&projectKey=AIPM'))).toBe(true)
  expect(seen.urls.some(u => u.endsWith('/projects/AIPM/statuses'))).toBe(true)
  expect(seen.auth).toBe('Bearer tok')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    // Backlog comes first in the workflow and has a task, so it is the open tab.
    expect(await ui.find({ type: 'Text', text: /Plan it/ })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: /Write the sidebar/ })).toBeFalsy()
    expect(await ui.find({ type: 'Text', text: /Old work/ })).toBeFalsy()
    await ui.unmount()
  }
})

test('picking a tab shows that status, an empty one says so', { options: { token: 'tok' } }, async ($, on) => {
  engine(on, { urls: [] }, onePage)
  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'tab-In Progress' })
  expect(await ui.find({ type: 'Text', text: /Write the sidebar/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Plan it/ })).toBeFalsy()

  await ui.press({ key: 'tab-Code Review' })
  expect(await ui.find({ type: 'Text', text: /Không có task nào ở Code Review/ })).toBeTruthy()
  await ui.unmount()
})

test('says what is missing when there is no token', async ($, on) => {
  engine(on, { urls: [] }, onePage)
  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /token/ }))?.text).toContain('Chưa có token')
  await ui.unmount()
})

test('shows an API error', { options: { token: 'bad' } }, async ($, on) => {
  engine(on, { urls: [] }, () => ({ status: 401, ok: false, text: '{"message":"Unauthorized"}' }))
  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /401/ })).toBeTruthy()
  await ui.unmount()
})

test('pages past the first 100 tasks', { options: { token: 'tok', projectKey: 'AIPM' } }, async ($, on) => {
  const seen: Seen = { urls: [] }
  engine(on, seen, offset => {
    const count = offset === '0' ? 100 : 3
    const issues = Array.from({ length: count }, (_, n) => ({
      identifier: `AIPM-${offset}-${n}`,
      title: `Task ${offset}-${n}`,
      status: 'Backlog',
    }))
    return { status: 200, ok: true, text: JSON.stringify({ issues }) }
  })
  await $.command.run(RUN)

  const offsets = seen.urls
    .filter(u => u.includes('/issues?'))
    .map(u => new URL(u).searchParams.get('offset'))
  expect(offsets).toEqual(['0', '100'])
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Task 100-2/ })).toBeTruthy()
  await ui.unmount()
})

test('pressing a task opens its detail, back returns to the list', { options: { token: 'tok' } }, async ($, on) => {
  engine(on, { urls: [] }, onePage)
  await $.command.run(RUN)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'AIPM-2' })
  expect(await ui.find({ type: 'Text', text: /Duong Tx/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /#perf/ })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Lan ·/ })).toBeTruthy()

  await ui.press({ key: 'back' })
  expect(await ui.find({ type: 'Text', text: /Lan ·/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /Plan it/ })).toBeTruthy()
  await ui.unmount()
})

test('a repo without an AIPM project gets no sidebar and no API calls', { options: { token: 'tok' } }, async ($, on) => {
  const opened: string[] = []
  const fetched: string[] = []
  on('command.register', () => ({ value: { command: 'aipm' } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('session.root', () => ({ value: '/other' }))
  on('session.cwd', () => ({ value: '/other' }))
  on('fs.read', () => {
    throw new Error('ENOENT')
  })
  on('http.fetch', (_, e) => {
    fetched.push(e.url)
    return { value: { status: 500, ok: false, headers: {}, text: '' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/other', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual([])
  expect(fetched).toEqual([])
})

test('/aipm hides the sidebar when it is shown', { options: { token: 'tok' } }, async ($, on) => {
  const closed: string[] = []
  on('command.register', () => ({ value: { command: 'aipm' } }))
  on('ui.panes', () => ({ value: [{ id: 'aipm-tasks', title: 'AIPM tasks', isShown: true, isFocused: false, isPlaced: true }] }))
  on('ui.close', (_, e) => {
    closed.push(e.id)
    return { value: undefined }
  })


  const out = await $.command.run(RUN)
  expect(closed).toEqual(['aipm-tasks'])
  expect(JSON.stringify(out)).toContain('đã ẩn')
})

const BAND = {
  plugin: 'aipm-tasks',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

test('session start fills the band and opens no sidebar; Tasks opens it', { options: { token: 'tok' } }, async ($, on) => {
  const opened: string[] = []
  on('command.register', () => ({ value: { command: 'aipm' } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.panes', () => ({ value: [] }))
  on('session.root', () => ({ value: '/repo' }))
  on('session.cwd', () => ({ value: '/repo' }))
  on('fs.read', () => ({ value: JSON.stringify({ projectKey: 'aipm' }) }))
  on('env.get', () => ({ value: undefined }))
  on('http.fetch', (_, e) => ({
    value: {
      status: 200,
      ok: true,
      headers: {},
      text: e.url.endsWith('/statuses') ? JSON.stringify(STATUSES) : JSON.stringify({ issues: ISSUES }),
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual([])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /2 đang mở · Backlog 1 · In Progress 1/ })).toBeTruthy()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'tasks' })
  expect(opened).toEqual(['aipm-tasks'])
  await ui.unmount()
})
