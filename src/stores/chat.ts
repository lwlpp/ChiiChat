import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ChatMessage, Conversation } from '@/types/chat'

export const useChatStore = defineStore(
  'llm-chat',
  () => {
    const conversations = ref<Conversation[]>([
      {
        id: '1',
        title: '日常问候',
        messages: [],
        createdAt: Date.now(),
      },
    ])

    const currentConversationId = ref('1')
    const isLoading = ref(false)

    const currentConversation = computed(() => {
      return conversations.value.find((conv) => conv.id === currentConversationId.value)
    })

    const currentMessages = computed(() => currentConversation.value?.messages || [])

    const createConversation = () => {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: '日常问候',
        messages: [],
        createdAt: Date.now(),
      }
      conversations.value.unshift(newConversation)
      currentConversationId.value = newConversation.id
    }

    const switchConversation = (conversationId: string) => {
      currentConversationId.value = conversationId
    }

    const addMessage = (
      message: Omit<ChatMessage, 'id' | 'timestamp'> & Partial<Pick<ChatMessage, 'id'>>,
    ) => {
      if (currentConversation.value) {
        const row: ChatMessage = {
          id: message.id ?? Date.now(),
          timestamp: new Date().toISOString(),
          role: message.role,
          content: message.content,
          reasoning_content: message.reasoning_content,
          files: message.files,
          completion_tokens: message.completion_tokens,
          speed: message.speed,
          loading: message.loading,
        }
        currentConversation.value.messages.push(row)
      }
    }

    const setIsLoading = (value: boolean) => {
      isLoading.value = value
    }

    const updateLastMessage = (
      content: string,
      reasoning_content: string,
      completion_tokens: number,
      speed: number | string,
    ) => {
      if (currentConversation.value?.messages.length) {
        const lastMessage =
          currentConversation.value.messages[currentConversation.value.messages.length - 1]
        lastMessage.content = content
        lastMessage.reasoning_content = reasoning_content
        lastMessage.completion_tokens = completion_tokens
        lastMessage.speed = speed
      }
    }

    const getLastMessage = () => {
      if (currentConversation.value?.messages.length) {
        return currentConversation.value.messages[currentConversation.value.messages.length - 1]
      }
      return null
    }

    const updateConversationTitle = (conversationId: string, newTitle: string) => {
      const conversation = conversations.value.find((c) => c.id === conversationId)
      if (conversation) {
        conversation.title = newTitle
      }
    }

    const deleteConversation = (conversationId: string) => {
      const index = conversations.value.findIndex((c) => c.id === conversationId)
      if (index !== -1) {
        conversations.value.splice(index, 1)

        if (conversations.value.length === 0) {
          createConversation()
        } else if (conversationId === currentConversationId.value) {
          currentConversationId.value = conversations.value[0]!.id
        }
      }
    }

    return {
      conversations,
      currentConversationId,
      currentConversation,
      currentMessages,
      isLoading,
      addMessage,
      setIsLoading,
      updateLastMessage,
      getLastMessage,
      createConversation,
      switchConversation,
      updateConversationTitle,
      deleteConversation,
    }
  },
  {
    persist: true,
  },
)
