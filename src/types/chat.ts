export interface ChatAttachment {
  name: string
  url: string
  type: string
  size: number
}

export interface ChatMessage {
  id: number
  /** ISO time string when persisted from store */
  timestamp?: string
  role: string
  content: string
  reasoning_content: string
  files: ChatAttachment[]
  completion_tokens: number
  speed: number | string
  loading: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
}

export interface OutboundMessage {
  role: string
  content: string
}
