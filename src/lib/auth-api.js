/**
 * Auth API used by Pinia `auth` store.
 * Currently implemented as a local mock (gateway envelope + mock-db).
 * Swap `loginApi` / `refreshApi` bodies for real HTTP calls when backend is ready.
 */

import { gatewayOk, unwrapGateway } from '@/lib/mock-gateway'
import {
  appendLoginAudit,
  ensureUser,
  findRefreshSession,
  rotateRefreshSession,
  saveRefreshSession,
} from '@/lib/mock-db'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function randomSegment() {
  const s = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').slice(0, 36)
}

export function issueMockAccessToken() {
  const payload = btoa(
    JSON.stringify({ typ: 'access', iat: Math.floor(Date.now() / 1000) }),
  )
  return `mock.${payload}.${randomSegment()}`
}

export function issueMockRefreshToken() {
  const payload = btoa(
    JSON.stringify({ typ: 'refresh', iat: Math.floor(Date.now() / 1000) }),
  )
  return `mock.${payload}.${randomSegment()}`
}

/**
 * @param {{ username: string, password: string }} credentials
 */
export async function loginApi(credentials) {
  await delay(320 + Math.random() * 200)
  const username = credentials.username?.trim()
  const password = credentials.password ?? ''
  if (!username) {
    const e = new Error('请输入用户名')
    e.code = 'VALIDATION'
    throw e
  }
  if (!String(password).trim()) {
    const e = new Error('请输入密码')
    e.code = 'VALIDATION'
    throw e
  }

  const userRow = ensureUser(username)
  appendLoginAudit(userRow.id, 'mock-web')

  const accessToken = issueMockAccessToken()
  const refreshToken = issueMockRefreshToken()
  saveRefreshSession(userRow.id, refreshToken)

  const envelope = gatewayOk({
    accessToken,
    refreshToken,
    expiresIn: 900,
    user: {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.username,
    },
  })

  return unwrapGateway(envelope)
}

/**
 * @param {string} refreshToken
 */
export async function refreshApi(refreshToken) {
  await delay(180 + Math.random() * 120)
  if (!refreshToken || !refreshToken.startsWith('mock.')) {
    const e = new Error('刷新失败')
    e.status = 401
    throw e
  }

  const session = findRefreshSession(refreshToken)
  if (!session) {
    const e = new Error('会话已失效，请重新登录')
    e.status = 401
    throw e
  }

  const newAccess = issueMockAccessToken()
  const newRefresh = issueMockRefreshToken()
  rotateRefreshSession(refreshToken, newRefresh, session.userId)

  const envelope = gatewayOk({
    accessToken: newAccess,
    refreshToken: newRefresh,
    expiresIn: 900,
  })

  return unwrapGateway(envelope)
}
