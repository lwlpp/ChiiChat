<script setup lang="ts">
import { ref } from 'vue'
import { Paperclip } from '@element-plus/icons-vue'
import MediaInput from './MediaInput.vue'

const inputValue = ref('')
const mediaInput = ref<InstanceType<typeof MediaInput> | null>(null)

const dragDepth = ref(0)
const isDragOver = ref(false)

const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  send: [payload: { text: string; files: { name: string; url: string; type: string; size: number }[] }]
}>()

// 处理发送消息的方法
const handleSend = () => {
  if (!inputValue.value.trim() || props.loading) return

  // 获取文件列表
  const fileList = mediaInput.value?.getFileList() || []

  // 构建消息对象
  const messageContent = {
    text: inputValue.value.trim(),
    files: fileList.map(file => ({
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size
    })),
  }

  // 触发 send 事件，将消息内容作为参数传递
  emit('send', messageContent)

  // 清空输入框和文件列表
  inputValue.value = ''
  mediaInput.value?.clearFiles()
}

// 处理换行的方法（Shift + Enter）
const handleNewline = (e: KeyboardEvent) => {
  e.preventDefault() // 阻止默认的 Enter 发送行为
  inputValue.value += '\n' // 在当前位置添加换行符
}

// 处理多媒体上传成功
const onUploadSuccess = (data: unknown) => {
  console.log('文件上传成功:', data)
}

// 处理多媒体上传失败
const onUploadError = (data: unknown) => {
  console.error('文件上传失败:', data)
}

const onAttachClick = () => {
  mediaInput.value?.openFilePicker()
}

const onDragEnter = (e: DragEvent) => {
  if (!e.dataTransfer?.types?.includes('Files')) return
  e.preventDefault()
  dragDepth.value += 1
  isDragOver.value = true
}

const onDragOver = (e: DragEvent) => {
  if (!e.dataTransfer?.types?.includes('Files')) return
  e.preventDefault()
  try {
    e.dataTransfer.dropEffect = 'copy'
  } catch {
    /* ignore */
  }
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  dragDepth.value -= 1
  if (dragDepth.value <= 0) {
    dragDepth.value = 0
    isDragOver.value = false
  }
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  dragDepth.value = 0
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files?.length) {
    mediaInput.value?.addFiles(Array.from(files))
  }
}

</script>

<template>
  <div
    class="chat-input-wrapper"
    :class="{ 'is-drag-over': isDragOver }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- 多媒体：仅展示已选文件，拖拽 / 回形针添加 -->
    <MediaInput
      ref="mediaInput"
      :max-files="5"
      :max-size="100 * 1024 * 1024"
      @upload-success="onUploadSuccess"
      @upload-error="onUploadError"
    />

    <el-input
      v-model="inputValue"
      type="textarea"
      :autosize="{ minRows: 3, maxRows: 8 }"
      placeholder="输入消息，Enter 发送，Shift + Enter 换行（可将文件拖入此区域）"
      resize="none"
      @keydown.enter.exact.prevent="handleSend"
      @keydown.enter.shift="handleNewline"
    />
    <div class="button-group">
      <el-tooltip content="添加附件" placement="top">
        <button type="button" class="action-btn attach-btn" @click="onAttachClick">
          <el-icon :size="18"><Paperclip /></el-icon>
        </button>
      </el-tooltip>
      <div class="button-group-spacer" />
      <button class="action-btn send-btn" :disabled="props.loading" @click="handleSend">
        <img src="@/assets/photo/发送.png" alt="send" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-input-wrapper {
  padding: 0.8rem;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;

  &.is-drag-over {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px rgba(221, 96, 150, 0.28);
    background-color: rgba(221, 96, 150, 0.06);
  }

  /* 自定义输入框样式 */
  :deep(.el-textarea__inner) {
    border-radius: 8px;
    resize: none;
    border: none;
    box-shadow: none;

    &:focus {
      border: none;
      box-shadow: none;
    }
  }

  /* 按钮组容器样式 */
  .button-group {
    display: flex; /* 使用弹性布局 */
    align-items: center;
    margin-top: 0.25rem; /* 与输入框的上方间距 */
    gap: 0.5rem; /* 按钮之间的间距 */

    .button-group-spacer {
      flex: 1;
    }

    /* 通用按钮样式 */
    .action-btn {
      width: 1.75rem; /* 默认按钮宽度28px */
      height: 1.75rem; /* 默认按钮高度28px */
      border: none; /* 移除边框 */
      background: none; /* 移除背景色 */
      padding: 0; /* 移除内边距 */
      cursor: pointer; /* 鼠标悬停时显示手型 */
      border-radius: 50%; /* 圆形按钮 */
      display: flex; /* 使用弹性布局使图标居中 */
      align-items: center; /* 垂直居中 */
      justify-content: center; /* 水平居中 */
      transition: background-color 0.3s; /* 背景色过渡动画 */
      flex-shrink: 0;
      color: var(--text-color-secondary, #606266);

      /* 按钮内图标样式 */
      img {
        width: 1rem; /* 默认图标宽度16px */
        height: 1rem; /* 默认图标高度16px */
      }

      /* 按钮悬停效果 */
      &:hover {
        background-color: rgba(0, 0, 0, 0.05); /* 悬停时显示浅灰色背景 */
      }

      &.attach-btn {
        color: var(--el-color-primary);

        &:hover {
          color: var(--el-color-primary-dark-2);
          background-color: rgba(221, 96, 150, 0.12);
        }
      }

      &.send-btn {
        width: 2rem;
        height: 2rem;
        background-color: var(--el-color-primary);

        img {
          width: 1.25rem;
          height: 1.25rem;
          filter: brightness(0) invert(1);
        }

        &:hover:not(:disabled) {
          background-color: var(--el-color-primary-dark-2);
        }

        &:disabled {
          opacity: 0.55;
        }
      }
    }
  }
}
/* 移动端适配 */
@media (max-width: 768px) {
  .chat-input-wrapper {
    padding: 0.6rem; /* 减少内边距 */

    /* 按钮组适配 */
    .button-group {
      gap: 0.3rem; /* 减少按钮间距 */

      .action-btn {
        width: 2.2rem; /* 增大按钮 */
        height: 2.2rem;

        img {
          width: 1.1rem;
          height: 1.1rem;
        }

        &.send-btn {
          width: 2.5rem;
          height: 2.5rem;

          img {
            width: 1.3rem;
            height: 1.3rem;
          }
        }
      }
    }
  }
}
</style>
