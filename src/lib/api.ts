import { storeToRefs } from 'pinia'
import { useSettingStore, type LlmSettings } from '@/stores/setting'
import { connectionPool } from './connectionPool'
import type { OutboundMessage } from '@/types/chat'

const API_BASE_URL = 'https://api.siliconflow.cn/v1'

interface CacheEntry {
  data: unknown
  timestamp: number
}

const requestCache = new Map<string, CacheEntry>()
const CACHE_DURATION = 5 * 60 * 1000

const generateCacheKey = (messages: OutboundMessage[], settings: LlmSettings) => {
  return JSON.stringify({
    messages,
    model: settings.model,
    temperature: settings.temperature,
  })
}

const getCachedResponse = (cacheKey: string) => {
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

export interface ChatCompletionOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

export async function createChatCompletion(
  messages: OutboundMessage[],
  options: ChatCompletionOptions = {},
) {
  const settingStore = useSettingStore()
  const { settings } = storeToRefs(settingStore)
  const { signal, timeoutMs } = options

  const cacheKey = generateCacheKey(messages, settings.value)
  const cachedResponse = getCachedResponse(cacheKey)
  if (cachedResponse) {
    console.log('🎯 使用缓存响应，首token时间: 0ms')
    return cachedResponse
  }

  const baseURL = connectionPool.getConnection(API_BASE_URL)

  const payload = {
    model: settings.value.model,
    messages,
    stream: settings.value.stream,
    max_tokens: settings.value.maxTokens,
    temperature: settings.value.temperature,
    top_p: settings.value.topP,
    top_k: settings.value.topK,
  }

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.value.apiKey}`,
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    body: JSON.stringify(payload),
    signal,
  }

  try {
    const startTime = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (typeof timeoutMs === 'number' && timeoutMs > 0 && !signal?.aborted) {
      const controller = !signal ? new AbortController() : null
      const effectiveSignal = signal || controller!.signal
      if (!signal) {
        fetchOptions.signal = effectiveSignal
      }
      timeoutId = setTimeout(() => {
        try {
          controller?.abort(new DOMException('Timeout', 'AbortError'))
        } catch {
          /* ignore */
        }
      }, timeoutMs)
    }

    const response = await fetch(`${baseURL}/chat/completions`, fetchOptions)
    if (timeoutId) clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (settings.value.stream) {
      return response
    }
    const data = (await response.json()) as {
      usage: { completion_tokens: number }
      [key: string]: unknown
    }
    const duration = (Date.now() - startTime) / 1000
    const withSpeed = data as typeof data & { speed: string }
    withSpeed.speed = (data.usage.completion_tokens / duration).toFixed(2)
    return withSpeed
  } catch (error) {
    console.error('Chat API Error:', error)
    throw error
  }
}
