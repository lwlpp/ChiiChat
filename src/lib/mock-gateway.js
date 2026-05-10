/**
 * Mock API envelope shaped like a typical Spring-style `{ code, msg, data }` payload.
 * Replace with real response parsing when wiring a production backend.
 */

export function gatewayOk(data, msg = 'success') {
  return {
    code: 200,
    msg,
    data,
    timestamp: Date.now(),
  }
}

export function gatewayBizError(code, msg) {
  return {
    code,
    msg,
    data: null,
    timestamp: Date.now(),
  }
}

export function unwrapGateway(res) {
  if (res.code === 200) return res.data
  const err = new Error(res.msg || '请求失败')
  err.gatewayCode = res.code
  throw err
}
