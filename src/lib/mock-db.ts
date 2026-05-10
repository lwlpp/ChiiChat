const STORAGE_KEY = 'chiichat-mock-db'

export interface MockUser {
  id: number
  username: string
  createdAt: number
}

export interface MockLoginAudit {
  id: number
  userId: number
  loginAt: number
  clientHint: string
}

export interface MockRefreshSession {
  id: number
  userId: number
  token: string
  createdAt: number
  revoked: boolean
  revokedAt?: number
}

interface MockDb {
  users: MockUser[]
  loginAudits: MockLoginAudit[]
  refreshSessions: MockRefreshSession[]
}

function defaultDb(): MockDb {
  return {
    users: [],
    loginAudits: [],
    refreshSessions: [],
  }
}

export function loadDb(): MockDb {
  if (typeof localStorage === 'undefined') return defaultDb()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDb()
    const parsed = JSON.parse(raw) as Partial<MockDb>
    return {
      ...defaultDb(),
      ...parsed,
      users: parsed.users || [],
      loginAudits: parsed.loginAudits || [],
      refreshSessions: parsed.refreshSessions || [],
    }
  } catch {
    return defaultDb()
  }
}

function saveDb(db: MockDb) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function ensureUser(username: string): MockUser {
  const db = loadDb()
  let user = db.users.find((u) => u.username === username)
  if (!user) {
    const nextId =
      db.users.length === 0 ? 1 : Math.max(...db.users.map((u) => u.id)) + 1
    user = {
      id: nextId,
      username,
      createdAt: Date.now(),
    }
    db.users.push(user)
    saveDb(db)
  }
  return user
}

export function appendLoginAudit(userId: number, hint = 'web') {
  const db = loadDb()
  const id =
    db.loginAudits.length === 0
      ? 1
      : Math.max(...db.loginAudits.map((a) => a.id)) + 1
  db.loginAudits.push({
    id,
    userId,
    loginAt: Date.now(),
    clientHint: hint,
  })
  saveDb(db)
}

export function saveRefreshSession(userId: number, refreshToken: string) {
  const db = loadDb()
  db.refreshSessions.push({
    id: db.refreshSessions.length
      ? Math.max(...db.refreshSessions.map((s) => s.id)) + 1
      : 1,
    userId,
    token: refreshToken,
    createdAt: Date.now(),
    revoked: false,
  })
  saveDb(db)
}

export function findRefreshSession(token: string): MockRefreshSession | null {
  const db = loadDb()
  return db.refreshSessions.find((s) => s.token === token && !s.revoked) || null
}

export function revokeRefreshSession(token: string) {
  const db = loadDb()
  const row = db.refreshSessions.find((s) => s.token === token)
  if (row) {
    row.revoked = true
    row.revokedAt = Date.now()
    saveDb(db)
  }
}

export function rotateRefreshSession(
  oldToken: string,
  newRefreshToken: string,
  userId: number,
) {
  revokeRefreshSession(oldToken)
  saveRefreshSession(userId, newRefreshToken)
}
