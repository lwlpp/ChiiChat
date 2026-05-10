<template>
  <div class="media-input">
    <input
      ref="fileInput"
      type="file"
      multiple
      :accept="acceptedTypes"
      @change="handleFileSelect"
      class="file-input-hidden"
    />

    <!-- 已选附件（紧凑列表，由父级输入框区域负责拖拽 / 回形针添加） -->
    <div v-if="fileList.length > 0" class="file-list">
      <div
        v-for="(file, index) in fileList"
        :key="file.id"
        class="file-item"
        @click="previewFile(file)"
      >
        <!-- 文件图标 -->
        <div class="file-icon">
          <el-icon v-if="file.type.startsWith('image/')" size="24"><Picture /></el-icon>
          <el-icon v-else-if="file.type.startsWith('video/')" size="24"><VideoPlay /></el-icon>
          <el-icon v-else-if="file.type === 'application/pdf'" size="24"><Document /></el-icon>
          <el-icon v-else-if="file.type.startsWith('text/')" size="24"><Document /></el-icon>
          <el-icon v-else size="24"><Document /></el-icon>
        </div>

        <!-- 文件信息 -->
        <div class="file-info">
          <p class="file-name">{{ file.name }}</p>
          <p class="file-size">{{ formatFileSize(file.size) }}</p>
        </div>

        <!-- 上传进度 -->
        <div v-if="file.uploading" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: file.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ file.progress }}%</span>
        </div>

        <!-- 删除按钮 -->
        <button class="remove-btn" @click.stop="removeFile(index)">
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </div>

    <!-- 多媒体预览组件 -->
    <MediaPreview
      :visible="previewVisible"
      :preview-key="previewKey"
      :file-url="previewFileUrl"
      :binary-preview="previewBinary"
      :file-name="previewFileName"
      :file-size="previewFileSize"
      :file-type="previewFileType"
      :text-content="previewTextContent"
      @close="closePreview"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Picture, Document, Close, VideoPlay } from '@element-plus/icons-vue'
import MediaPreview from './MediaPreview.vue'

const props = defineProps({
  maxFiles: {
    type: Number,
    default: 5
  },
  maxSize: {
    type: Number,
    default: 100 * 1024 * 1024 // 100MB
  }
})

const emit = defineEmits(['upload-success', 'upload-error'])

// 文件输入引用
const fileInput = ref(null)

// 支持的文件类型
const acceptedTypes = computed(() => {
  return [
    'image/*',
    'video/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/*'
  ].join(',')
})

// 文件列表
const fileList = ref([])

// 预览相关状态
const previewVisible = ref(false)
const previewKey = ref(0)
const previewFileUrl = ref('')
const previewBinary = ref(null)
const previewFileName = ref('')
const previewFileSize = ref(0)
const previewFileType = ref('')
const previewTextContent = ref('')

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  appendFiles(files)
  event.target.value = ''
}

// 添加文件
const appendFiles = (files) => {
  for (const file of files) {
    if (fileList.value.length >= props.maxFiles) {
      ElMessage.warning(`最多只能上传${props.maxFiles}个文件`)
      break
    }

    if (file.size > props.maxSize) {
      ElMessage.error(`文件 ${file.name} 超过大小限制`)
      continue
    }

    const fileItem = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploading: false,
      progress: 0,
      url: URL.createObjectURL(file) // 本地预览URL
    }

    fileList.value.push(fileItem)

    // 须用数组里的代理对象更新进度；否则改的是 push 前的普通对象，界面不刷新
    simulateUpload(fileList.value.length - 1)
  }
}

// 模拟上传过程
const simulateUpload = async (index) => {
  const fileItem = fileList.value[index]
  if (!fileItem) return

  try {
    fileItem.uploading = true
    fileItem.progress = 0

    // 模拟上传进度
    for (let i = 0; i <= 100; i += 10) {
      fileItem.progress = i
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    fileItem.uploading = false
    fileItem.progress = 100
    ElMessage.success('文件已添加')
    emit('upload-success', { file: fileItem })
  } catch (error) {
    fileItem.uploading = false
    ElMessage.error('文件处理失败')
    emit('upload-error', { file: fileItem, error })
  }
}

// 预览文件
const previewFile = async (file) => {
  if (file.uploading) return

  previewVisible.value = false
  previewBinary.value = null
  previewTextContent.value = ''

  previewFileUrl.value = file.url
  previewFileName.value = file.name
  previewFileSize.value = file.size
  previewFileType.value = getFileType(file.type, file.name)

  // 如果是文本文件，读取内容
  if (previewFileType.value === 'text') {
    try {
      const textContent = await readTextFile(file.file)
      previewTextContent.value = textContent
    } catch (error) {
      console.error('读取文本文件失败:', error)
      previewTextContent.value = '读取文件内容失败'
    }
  }

  // PDF 使用 iframe + 本地 blob URL，走浏览器内置渲染，避免 pdf.js 拉 cmaps 失败白屏
  if (previewFileType.value === 'office') {
    try {
      previewBinary.value = await readFileAsArrayBuffer(file.file)
    } catch (error) {
      console.error('读取文件失败:', error)
      ElMessage.error('无法读取文件，请重试或下载后查看')
      return
    }
  }

  previewKey.value += 1
  previewVisible.value = true
}

// 读取文本文件内容
const readTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file, 'UTF-8')
  })
}

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsArrayBuffer(file)
  })
}

// 获取文件类型
const getFileType = (mimeType, fileName) => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('text/')) return 'text'

  // 检查Office文档
  const ext = fileName.split('.').pop()?.toLowerCase()
  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
  if (officeExts.includes(ext)) return 'office'

  return 'file'
}

// 关闭预览
const closePreview = () => {
  previewVisible.value = false
  previewBinary.value = null
}

// 移除文件
const removeFile = (index) => {
  const file = fileList.value[index]
  if (file.url && file.url.startsWith('blob:')) {
    URL.revokeObjectURL(file.url)
  }
  fileList.value.splice(index, 1)
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件列表
const getFileList = () => {
  return fileList.value
}

// 清空文件列表
const clearFiles = () => {
  fileList.value.forEach(file => {
    if (file.url && file.url.startsWith('blob:')) {
      URL.revokeObjectURL(file.url)
    }
  })
  fileList.value = []
}

// 暴露方法给父组件
defineExpose({
  getFileList,
  clearFiles,
  addFiles: appendFiles,
  openFilePicker: triggerFileInput
})
</script>

<style lang="scss" scoped>
.media-input {
  .file-input-hidden {
    display: none;
  }

  .file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;

    .file-item {
      display: flex;
      align-items: center;
      padding: 6px 10px;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 8px;
      max-width: 100%;
      flex: 0 1 auto;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--el-color-primary);
        background: #f0f8ff;
      }

      .file-icon {
        margin-right: 12px;
        color: #666;
      }

      .file-info {
        flex: 1;
        min-width: 0;

        .file-name {
          font-size: 13px;
          color: var(--text-color-primary, #333);
          margin: 0 0 2px 0;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 12px;
          color: #999;
          margin: 0;
        }
      }

      .upload-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-right: 12px;

        .progress-bar {
          width: 60px;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: var(--el-color-primary);
            transition: width 0.3s ease;
          }
        }

        .progress-text {
          font-size: 12px;
          color: #666;
        }
      }

      .remove-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: #ff4757;
        color: white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;

        &:hover {
          background: #ff3742;
        }
      }
    }
  }
}
</style>
