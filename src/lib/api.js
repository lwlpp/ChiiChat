import { useSettingStore } from '@/stores/setting'
import { connectionPool } from './connectionPool'

const API_BASE_URL = 'https://api.siliconflow.cn/v1'

const requestCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 生成缓存键
const generateCacheKey = (messages, settings) => {
  return JSON.stringify({ messages, model: settings.model, temperature: settings.temperature })
}

// 检查缓存
const getCachedResponse = (cacheKey) => {
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}



export const createChatCompletion = async (messages, options = {}) => {
  const settingStore = useSettingStore()
  const { signal, timeoutMs } = options

  // 检查缓存
  const cacheKey = generateCacheKey(messages, settingStore.settings)
  const cachedResponse = getCachedResponse(cacheKey)
  if (cachedResponse) {
    console.log('🎯 使用缓存响应，首token时间: 0ms')
    return cachedResponse
  }


  //使用连接池获取优化的连接
  const baseURL = connectionPool.getConnection(API_BASE_URL)

  const payload = {
    model: settingStore.settings.model,
    messages,
    stream: settingStore.settings.stream,
    max_tokens: settingStore.settings.maxTokens,
    temperature: settingStore.settings.temperature,
    top_p: settingStore.settings.topP,
    top_k: settingStore.settings.topK,
  }

  const fetchOptions = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settingStore.settings.apiKey}`,
      'Content-Type': 'application/json',
      //添加性能优化头部
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    body: JSON.stringify(payload),
    signal,
  }

  try {
    const startTime = Date.now() // 记录开始时间
    let timeoutId

    if (typeof timeoutMs === 'number' && timeoutMs > 0 && !signal?.aborted) {
      const controller = !signal ? new AbortController() : null
      const effectiveSignal = signal || controller.signal
      // 如果没有传入外部 signal，我们需要把它绑定到 fetch 选项
      if (!signal) {
        fetchOptions.signal = effectiveSignal
      }
      timeoutId = setTimeout(() => {
        try {
          controller?.abort?.(new DOMException('Timeout', 'AbortError'))
        } catch (_) { console(_) }
      }, timeoutMs)
    }

    //使用连接池的URL
    const response = await fetch(`${baseURL}/chat/completions`, fetchOptions)
    if (timeoutId) clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (settingStore.settings.stream) {
      return response // 直接返回响应对象以支持流式读取
    } else {
      const data = await response.json()
      const duration = (Date.now() - startTime) / 1000 // 使用本地计时
      data.speed = (data.usage.completion_tokens / duration).toFixed(2)
      return data
    }
  } catch (error) {
    console.error('Chat API Error:', error)
    throw error
  }
}
