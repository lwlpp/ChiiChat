export function gatewayOk<T>(data: T, msg = 'success') {
  return {
    code: 200,
    msg,
    data,
    timestamp: Date.now(),
  }
}

export function gatewayBizError(code: number, msg: string) {
  return {
    code,
    msg,
    data: null,
    timestamp: Date.now(),
  }
}

interface GatewayEnvelope<T> {
  code: number
  msg: string
  data: T
  timestamp: number
}

export function unwrapGateway<T>(res: GatewayEnvelope<T>): T {
  if (res.code === 200) return res.data
  const err = new Error(res.msg || '请求失败') as Error & { gatewayCode?: number }
  err.gatewayCode = res.code
  throw err
}
