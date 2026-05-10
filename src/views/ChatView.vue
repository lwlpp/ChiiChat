<template>
  <div class="chat-container">
    <!-- 左侧：对话历史侧边栏 -->
    <div class="chat-sidebar">
      <div class="sidebar-panel">
        <div class="sidebar-header">
          <el-button class="new-chat-btn" :icon="Plus" @click="handleNewChat">新对话</el-button>
        </div>

        <div class="sidebar-section">
          <div class="section-title">历史对话</div>
          <div class="history-list">
          <div
            v-for="conversation in chatStore.conversations"
            :key="conversation.id"
            class="menu-item"
            :class="{ active: conversation.id === chatStore.currentConversationId }"
            @click="handleSwitchChat(conversation.id)"
          >
            <div class="item-content">
              <img src="@/assets/photo/对话.png" alt="对话" />
              <span :title="conversation.title">{{ formatTitle(conversation.title) }}</span>
            </div>
            <div class="item-actions">
              <button
                class="action-btn"
                @click.stop="dialogEdit.openDialog(conversation.id, 'edit')"
              >
                <img src="@/assets/photo/编辑.png" alt="编辑" />
              </button>
              <button
                class="action-btn"
                @click.stop="dialogEdit.openDialog(conversation.id, 'delete')"
              >
                <img src="@/assets/photo/删除.png" alt="删除" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 右侧：当前对话内容 -->
    <div class="chat-main">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-left">
          <div class="title-wrapper">
            <h1 class="chat-title">{{ formatTitle(currentTitle) }}</h1>
            <button
              class="edit-btn"
              @click="dialogEdit.openDialog(chatStore.currentConversationId, 'edit')"
            >
              <img src="@/assets/photo/编辑.png" alt="编辑" />
            </button>
          </div>
        </div>

        <div class="header-right">
          <el-tooltip content="退出登录" placement="top">
            <button type="button" class="logout-btn" @click="handleLogout">退出</button>
          </el-tooltip>
          <el-tooltip content="设置" placement="top">
            <button class="action-btn" @click="settingDrawer.openDrawer()">
              <img src="@/assets/photo/设置.png" alt="设置" />
            </button>
          </el-tooltip>
          <el-tooltip content="回到首页" placement="top">
            <button class="action-btn" @click="handleBack">
              <img src="@/assets/photo/返回.png" alt="返回" />
            </button>
          </el-tooltip>
        </div>
      </div>

      <!-- 消息容器 -->
      <div class="messages-container" ref="messagesContainer">
        <template v-if="currentMessages.length > 0">
          <chat-message
            v-for="(message, index) in currentMessages"
            :key="message.id"
            :message="message"
            :is-last-assistant-message="
              index === currentMessages.length - 1 && message.role === 'assistant'
            "
            @regenerate="handleRegenerate"
          />
        </template>
        <div v-else class="empty-state">
          <div class="empty-content">
            <img src="@/assets/photo/对话.png" alt="chat" class="empty-icon" />
            <h2>开始对话吧</h2>
            <p>有什么想和我聊的吗？</p>
          </div>
        </div>
      </div>

      <!-- 聊天输入框 -->
      <div class="chat-input-container">
        <chat-input :loading="isLoading" @send="handleSend" />
      </div>
    </div>

    <!-- 设置面板 -->
    <SettingsPanel ref="settingDrawer" />

    <!-- 编辑/删除对话框 -->
    <DialogEdit ref="dialogEdit" />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

// 组件引入
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import DialogEdit from '@/components/chat/DialogEdit.vue'

// 状态管理
import { useChatStore } from '@/stores/chat'
import { useSettingStore } from '@/stores/setting'
import { useAuthStore } from '@/stores/auth'

// 工具函数
import { messageHandler } from '@/lib/messageHandler'
import { createChatCompletion } from '@/lib/api'
import { debounce } from '@/lib/debounce'

// 状态与实例
const chatStore = useChatStore()
const settingStore = useSettingStore()
const authStore = useAuthStore()
const router = useRouter()
const messagesContainer = ref(null)
const settingDrawer = ref(null)
const dialogEdit = ref(null)

// 计算属性
const currentMessages = computed(() => chatStore.currentMessages)
const isLoading = computed(() => chatStore.isLoading)
const currentTitle = computed(() => chatStore.currentConversation?.title || 'LLM Chat')

// 生命周期
onMounted(() => {
  // 初始化滚动位置
  nextTick(() => {
    messagesContainer.value?.scrollTo({ top: messagesContainer.value.scrollHeight })
  })
  // 无对话时自动创建
  if (chatStore.conversations.length === 0) {
    chatStore.createConversation()
  }
})

// 监听消息变化，自动滚动到底部
watch(
  currentMessages,
  () => {
    nextTick(() => {
      messagesContainer.value?.scrollTo({ top: messagesContainer.value.scrollHeight })
    })
  },
  { deep: true }
)

// 对话操作
const handleNewChat = () => {
  chatStore.createConversation()
}

const handleSwitchChat = (conversationId) => {
  chatStore.switchConversation(conversationId)
}

const debounceHandleSend = debounce(async (messageContent) => {
  try {
    //记录开始时间
    const startTime = Date.now()

    // 添加用户消息
    chatStore.addMessage(
      messageHandler.formatMessage('user', messageContent.text, '', messageContent.files)
    )
    // 添加空助手消息占位
    chatStore.addMessage(messageHandler.formatMessage('assistant', '', ''))

    // 设置加载状态
    chatStore.setIsLoading(true)
    const lastMessage = chatStore.getLastMessage()
    lastMessage.loading = true

    // 调用API获取回复
    const messages = chatStore.currentMessages.map(({ role, content }) => ({ role, content }))
    const response = await createChatCompletion(messages)

    const firstTokenTime = Date.now()

    console.log(`🚀 首token时间: ${firstTokenTime - startTime}ms`)

    // 处理流式/非流式响应
    await messageHandler.handleResponse(
      response,
      settingStore.settings.stream,
      (content, reasoning_content, tokens, speed) => {
        chatStore.updateLastMessage(content, reasoning_content, tokens, speed)
      }
    )
  } catch (error) {
    console.error('发送消息失败:', error)
    chatStore.updateLastMessage('抱歉，发生了一些错误，请稍后重试。')
  } finally {
    // 重置加载状态
    chatStore.setIsLoading(false)
    const lastMessage = chatStore.getLastMessage()
    lastMessage.loading = false
  }
},100)


const handleSend = (messagesContent) => {
  if(chatStore.isLoading)
    return
  debounceHandleSend(messagesContent)
}

// 重新生成回复
const debouncedHandleRegenerate = debounce(async () => {
  try {
    const lastUserMessage = chatStore.currentMessages[chatStore.currentMessages.length - 2]
    if (lastUserMessage) {
      chatStore.currentMessages.splice(-2, 2)
      await handleSend({ text: lastUserMessage.content, files: lastUserMessage.files })
    }
  } catch (error) {
    console.error('重新生成失败:', error)
  }
}, 200)
const handleRegenerate = () => {
  if (chatStore.isLoading) return
  debouncedHandleRegenerate()
}

// 辅助函数
const formatTitle = (title) => {
  return title.length > 15 ? title.slice(0, 15) + '...' : title
}

// 路由操作
const handleBack = () => {
  router.push('/')
}

const handleLogout = () => {
  authStore.logout()
  router.replace({ name: 'login', query: { redirect: '/chat' } })
}
</script>

<style lang="scss" scoped>
// 主布局
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

// 左侧边栏：壁纸不变；磨砂卡片叠在壁纸上（露出四周壁纸）
.chat-sidebar {
  width: 25%;
  min-width: 220px;
  background: url('@/assets/photo/壁纸3.jpg') no-repeat center;
  background-size: cover;
  border-right: 1px solid rgba(255, 255, 255, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.25rem;

  .sidebar-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 14px;
    background: rgba(255, 250, 252, 0.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.65);
    box-shadow:
      0 4px 20px rgba(180, 90, 130, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .sidebar-header {
    padding: 0.85rem 1rem 0.75rem;
    flex-shrink: 0;
    border-bottom: 1px solid rgba(221, 96, 150, 0.12);

    .new-chat-btn {
      width: 100%;
      justify-content: flex-start;
      border: none;
      border-radius: 10px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #fdeef6 100%);
      height: 2.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #945a9e;
      box-shadow: 0 1px 3px rgba(160, 80, 120, 0.12);

      &:hover {
        background: linear-gradient(180deg, #fff 0%, #fcdcea 100%);
        color: #c4547f;
      }

      :deep(.el-icon) {
        margin-right: 0.5rem;
        font-size: 1rem;
      }
    }
  }

  .sidebar-section {
    padding: 0.35rem 0 0.5rem;
    flex: 1;
    overflow-y: auto;
    min-height: 0;

    .section-title {
      padding: 0.65rem 1rem 0.45rem;
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #9d6088;
      font-weight: 600;
    }

    .history-list {
      padding: 0 0.35rem 0.5rem;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.62rem 0.75rem;
      margin: 0.15rem 0;
      border-radius: 8px;
      cursor: pointer;
      transition:
        background-color 0.18s ease,
        box-shadow 0.18s ease;

      &:hover {
        background-color: rgba(253, 236, 245, 0.95);
      }

      &.active {
        background-color: rgba(252, 228, 239, 0.92);
        box-shadow: inset 3px 0 0 #dd6096;

        .item-content span {
          color: #b8426e;
          font-weight: 600;
        }
      }

      .item-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        overflow: hidden;

        img {
          width: 1rem;
          height: 1rem;
          opacity: 0.85;
        }

        span {
          font-size: 0.875rem;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: min(160px, 12vw);
        }
      }

      .item-actions {
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.2s;

        .action-btn {
          width: 1.5rem;
          height: 1.5rem;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;

          img {
            width: 0.875rem;
            height: 0.875rem;
          }

          &:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }
        }
      }

      &:hover .item-actions {
        opacity: 1;
      }
    }
  }
}

// 右侧主内容区
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 聊天头部样式
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--bg-color);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;

    .title-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .chat-title {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-color-primary);
      }

      .edit-btn {
        opacity: 0;
        width: 0.9rem;
        height: 0.9rem;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s ease;

        img {
          width: 100%;
          height: 100%;
        }
      }

      &:hover .edit-btn {
        opacity: 1;
      }
    }
  }

  .header-right {
    display: flex;
    gap: 0.5rem;
    align-items: center;

    .logout-btn {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--el-color-primary);
      padding: 0.35rem 0.45rem;
      border-radius: 6px;

      &:hover {
        color: var(--el-color-primary-dark-2);
        background: rgba(221, 96, 150, 0.08);
      }
    }

    .action-btn {
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      img {
        width: 1.25rem;
        height: 1.25rem;
        opacity: 1;
        transition: filter 0.2s;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

        img {
          filter: brightness(0.4);
        }
      }
    }
  }
}

// 消息容器样式
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.6rem 1rem;
  background-color: var(--bg-color-secondary);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

// 空状态样式
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-content {
    text-align: center;
    padding: 2rem;

    .empty-icon {
      width: 4rem;
      height: 4rem;
      opacity: 0.6;
      margin-bottom: 1rem;
    }

    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #374151;
    }

    p {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
    }
  }
}

// 输入框容器样式
.chat-input-container {
  padding: 1rem;
  background-color: var(--bg-color);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  width: 100%;
  box-sizing: border-box;
}
</style>
