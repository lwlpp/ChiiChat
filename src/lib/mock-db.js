/**
 * In-browser persistence simulating relational rows (users, audits, refresh sessions).
 * Stored under localStorage; safe to remove when a real backend + DB is used.
 */

const STORAGE_KEY = 'chiichat-mock-db'

/** @returns {{ users: Array, loginAudits: Array, refreshSessions: Array }} */
function defaultDb() {
  return {
    users: [],
    loginAudits: [],
    refreshSessions: [],
  }
}

export function loadDb() {
  if (typeof localStorage === 'undefined') return defaultDb()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultDb()
    const parsed = JSON.parse(raw)
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

function saveDb(db) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function ensureUser(username) {
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

export function appendLoginAudit(userId, hint = 'web') {
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

export function saveRefreshSession(userId, refreshToken) {
  const db = loadDb()
  db.refreshSessions.push({
    id: db.refreshSessions.length ? Math.max(...db.refreshSessions.map((s) => s.id)) + 1 : 1,
    userId,
    token: refreshToken,
    createdAt: Date.now(),
    revoked: false,
  })
  saveDb(db)
}

export function findRefreshSession(token) {
  const db = loadDb()
  return db.refreshSessions.find((s) => s.token === token && !s.revoked) || null
}

export function revokeRefreshSession(token) {
  const db = loadDb()
  const row = db.refreshSessions.find((s) => s.token === token)
  if (row) {
    row.revoked = true
    row.revokedAt = Date.now()
    saveDb(db)
  }
}

/** Revoke old refresh token and persist the new one (rotation). */
export function rotateRefreshSession(oldToken, newRefreshToken, userId) {
  revokeRefreshSession(oldToken)
  saveRefreshSession(userId, newRefreshToken)
}
