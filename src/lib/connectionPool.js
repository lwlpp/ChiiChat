class ConnectionPool {
  constructor(){
    this.connections = new Map()
    this.preWarmConnections()
  }

  //预热连接
  preWarmConnections() {
    //在页面加载时预建立连接
    setTimeout( () => {
      this.createConnection('https://api.siliconflow.cn/v1')
    },1000)
  }

  //创建连接
  createConnection(baseURL) {
    if(!this.connections.has(baseURL)) {
      //预建立TCP连接
      fetch('${baseURL}/models',{
        method: 'HEAD',
        headers: {
          'Authorization': 'Bearer dummy' // 只是为了预热，会被拒绝但连接已建立
        }
      })
        .catch( () => {} ) // 忽略错误，只是为了预热
        .finally( () => {
          this.connections.set(baseURL, true)
        })
    }
  }

  //获取连接
  getConnection(baseURL) {
    this.createConnection(baseURL)
    return baseURL
  }
}

export const connectionPool = new ConnectionPool()
