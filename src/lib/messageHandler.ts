import type { ChatAttachment, ChatMessage } from '@/types/chat'

type StreamUpdateCallback = (
  content: string,
  reasoning: string,
  tokens: number,
  speed: string,
) => void

interface StreamDelta {
  content?: string
  reasoning_content?: string
}

interface StreamChoice {
  delta: StreamDelta
}

interface StreamChunk {
  choices: StreamChoice[]
  usage?: { completion_tokens?: number }
}

interface NormalChoiceMessage {
  content: string
  reasoning_content?: string
}

export interface NormalResponse {
  choices: { message: NormalChoiceMessage }[]
  usage: { completion_tokens: number }
  speed: string
}

export const messageHandler = {
  formatMessage(
    role: string,
    content: string,
    reasoning_content = '',
    files: ChatAttachment[] = [],
  ): ChatMessage {
    return {
      id: Date.now(),
      role,
      content,
      reasoning_content,
      files,
      completion_tokens: 0,
      speed: 0,
      loading: false,
    }
  },

  async handleStreamResponse(
    response: Response,
    updateCallback: StreamUpdateCallback,
  ) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let accumulatedContent = ''
    let accumulatedReasoning = ''
    const startTime = Date.now()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter((line) => line.trim() !== '')

      for (const line of lines) {
        if (line === 'data: [DONE]') continue
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(5)) as StreamChunk
          const content = data.choices[0]?.delta?.content || ''
          const reasoning = data.choices[0]?.delta?.reasoning_content || ''

          accumulatedContent += content
          accumulatedReasoning += reasoning

          const tokens = data.usage?.completion_tokens || 0
          updateCallback(
            accumulatedContent,
            accumulatedReasoning,
            tokens,
            (tokens / ((Date.now() - startTime) / 1000)).toFixed(2),
          )
        }
      }
    }
  },

  handleNormalResponse(response: NormalResponse, updateCallback: StreamUpdateCallback) {
    updateCallback(
      response.choices[0].message.content,
      response.choices[0].message.reasoning_content || '',
      response.usage.completion_tokens,
      response.speed,
    )
  },

  async handleResponse(
    response: Response | NormalResponse,
    isStream: boolean,
    updateCallback: StreamUpdateCallback,
  ) {
    if (isStream) {
      await this.handleStreamResponse(response as Response, updateCallback)
    } else {
      this.handleNormalResponse(response as NormalResponse, updateCallback)
    }
  },
}
