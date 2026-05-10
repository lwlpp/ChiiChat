class ConnectionPool {
  private connections = new Map<string, boolean>()

  constructor() {
    this.preWarmConnections()
  }

  preWarmConnections() {
    setTimeout(() => {
      this.createConnection('https://api.siliconflow.cn/v1')
    }, 1000)
  }

  createConnection(baseURL: string) {
    if (!this.connections.has(baseURL)) {
      fetch(`${baseURL}/models`, {
        method: 'HEAD',
        headers: {
          Authorization: 'Bearer dummy',
        },
      })
        .catch(() => {})
        .finally(() => {
          this.connections.set(baseURL, true)
        })
    }
  }

  getConnection(baseURL: string) {
    this.createConnection(baseURL)
    return baseURL
  }
}

export const connectionPool = new ConnectionPool()
