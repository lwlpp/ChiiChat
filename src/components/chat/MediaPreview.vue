<template>
  <div class="media-preview" v-if="visible" @click="closePreview">
    <div class="preview-overlay">
      <div class="preview-content" @click.stop>
        <!-- 关闭按钮 -->
        <button class="close-btn" @click="closePreview">
          <el-icon><Close /></el-icon>
        </button>

        <!-- 图片预览 -->
        <div v-if="fileType === 'image'" class="image-preview">
          <img
            :src="fileUrl"
            :alt="fileName"
            @load="onImageLoad"
            @error="onImageError"
            class="preview-image"
          />
          <div class="image-info">
            <p>{{ fileName }}</p>
            <p>{{ formatFileSize(fileSize) }}</p>
          </div>
        </div>

        <!-- 视频预览 -->
        <div v-else-if="fileType === 'video'" class="video-preview">
          <video
            :src="fileUrl"
            controls
            class="preview-video"
            @loadstart="onVideoLoadStart"
            @error="onVideoError"
          >
            您的浏览器不支持视频播放
          </video>
          <div class="video-info">
            <p>{{ fileName }}</p>
            <p>{{ formatFileSize(fileSize) }}</p>
          </div>
        </div>

        <!-- 文本文件预览 -->
        <div v-else-if="fileType === 'text'" class="text-preview">
          <div class="text-header">
            <h3>{{ fileName }}</h3>
            <p>{{ formatFileSize(fileSize) }}</p>
          </div>
          <div class="text-content">
            <pre>{{ textContent }}</pre>
          </div>
        </div>

        <!-- Office文档预览 -->
        <div v-else-if="fileType === 'office'" class="office-preview">
          <div class="office-header">
            <h3>{{ fileName }}</h3>
            <p>{{ formatFileSize(fileSize) }}</p>
          </div>
          <div class="office-content">
            <!-- 错误状态 -->
            <div v-if="officeError" class="office-error office-error--fill">
              <el-icon size="64"><Warning /></el-icon>
              <p>文档加载失败</p>
              <p>{{ officeError }}</p>
              <a :href="fileUrl" target="_blank" class="download-link" rel="noopener">
                点击下载查看
              </a>
            </div>

            <!-- 须先挂载 vue-office 再显示遮罩，否则 @rendered 永远不会触发 -->
            <div v-else class="office-viewport">
              <!-- Word：仅 .docx（vue-office 不支持二进制 .doc） -->
              <VueOfficeDocx
                v-if="getOfficeType(fileName) === 'Word文档' && isDocxFile(fileName)"
                :key="previewKey"
                :src="documentSrc"
                style="height: 100%;"
                @rendered="onOfficeRendered"
                @error="onOfficeError"
              />

              <div
                v-else-if="getOfficeType(fileName) === 'Word文档'"
                class="office-placeholder"
              >
                <el-icon size="64"><Document /></el-icon>
                <p>旧版 .doc 暂不支持在线预览</p>
                <p>请另存为 .docx 后上传，或下载后本地打开</p>
                <a :href="fileUrl" target="_blank" class="download-link" rel="noopener">
                  点击下载查看
                </a>
              </div>

              <!-- Excel表格预览 -->
              <VueOfficeExcel
                v-else-if="getOfficeType(fileName) === 'Excel表格'"
                :key="previewKey"
                :src="documentSrc"
                style="height: 100%;"
                @rendered="onOfficeRendered"
                @error="onOfficeError"
              />

              <!-- PowerPoint：@vue-office/pptx（此前误用 Pdf 组件） -->
              <VueOfficePptx
                v-else-if="getOfficeType(fileName) === 'PowerPoint演示文稿' && isPptxFile(fileName)"
                :key="previewKey"
                :src="documentSrc"
                style="height: 100%;"
                @rendered="onOfficeRendered"
                @error="onOfficeError"
              />

              <div
                v-else-if="getOfficeType(fileName) === 'PowerPoint演示文稿'"
                class="office-placeholder"
              >
                <el-icon size="64"><Document /></el-icon>
                <p>旧版 .ppt 暂不支持在线预览</p>
                <p>请另存为 .pptx 后上传，或下载后本地打开</p>
                <a :href="fileUrl" target="_blank" class="download-link" rel="noopener">
                  点击下载查看
                </a>
              </div>

              <div v-else class="office-placeholder">
                <el-icon size="64"><Document /></el-icon>
                <p>Office文档预览</p>
                <p>文件类型: {{ getOfficeType(fileName) }}</p>
                <a :href="fileUrl" target="_blank" class="download-link" rel="noopener">
                  点击下载查看
                </a>
              </div>

              <div v-if="officeLoading" class="office-loading-overlay">
                <el-icon class="loading-icon"><Loading /></el-icon>
                <p>正在加载文档...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- PDF：浏览器内置查看器（iframe + blob），避免 @vue-office/pdf 依赖 CDN cmaps 白屏 -->
        <div v-else-if="fileType === 'pdf'" class="pdf-preview">
          <div class="pdf-header">
            <h3>{{ fileName }}</h3>
            <p>{{ formatFileSize(fileSize) }}</p>
          </div>
          <div class="pdf-content pdf-content--iframe">
            <div v-if="pdfIframeError" class="office-error office-error--fill">
              <el-icon size="64"><Warning /></el-icon>
              <p>当前浏览器无法在页面内预览该 PDF</p>
              <a :href="fileUrl" target="_blank" class="download-link" rel="noopener">
                新窗口打开 / 下载
              </a>
            </div>
            <div v-else class="pdf-iframe-wrap">
              <iframe
                :key="previewKey"
                :src="pdfIframeSrc"
                class="pdf-iframe"
                title="PDF 预览"
                @load="onPdfIframeLoad"
              />
              <div v-if="pdfIframeLoading" class="office-loading-overlay">
                <el-icon class="loading-icon"><Loading /></el-icon>
                <p>正在加载 PDF...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 其他文件预览 -->
        <div v-else class="file-preview">
          <div class="file-icon">
            <el-icon size="64"><Document /></el-icon>
          </div>
          <div class="file-info">
            <p>{{ fileName }}</p>
            <p>{{ formatFileSize(fileSize) }}</p>
            <p>文件类型: {{ fileType }}</p>
            <a :href="fileUrl" target="_blank" class="download-link">
              点击下载查看
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted, withDefaults } from 'vue'
import { Close, Document, Loading, Warning } from '@element-plus/icons-vue'
import VueOfficeDocx from '@vue-office/docx/lib/v3/index.js'
import VueOfficeExcel from '@vue-office/excel/lib/v3/index.js'
import VueOfficePptx from '@vue-office/pptx/lib/v3/index.js'

const officeLoading = ref(false)
const officeError = ref('')
const pdfIframeLoading = ref(false)
const pdfIframeError = ref(false)
let loadingFallbackTimer: ReturnType<typeof setTimeout> | null = null
let pdfIframeLoadTimer: ReturnType<typeof setTimeout> | null = null

const props = withDefaults(
  defineProps<{
    visible?: boolean
    previewKey?: number
    fileUrl?: string
    binaryPreview?: ArrayBuffer | null
    fileName?: string
    fileSize?: number
    fileType?: string
    textContent?: string
  }>(),
  {
    visible: false,
    previewKey: 0,
    fileUrl: '',
    binaryPreview: null,
    fileName: '',
    fileSize: 0,
    fileType: '',
    textContent: '',
  },
)

const documentSrc = computed(() => {
  const buf = props.binaryPreview
  if (buf instanceof ArrayBuffer && buf.byteLength > 0) return buf
  return props.fileUrl || ''
})

/** PDF 用 blob URL 交给浏览器内置查看器（勿在 blob 后随意加 #，部分环境会异常） */
const pdfIframeSrc = computed(() => {
  if (props.fileType !== 'pdf' || !props.fileUrl) return ''
  return props.fileUrl
})

const isDocxFile = (name: string) => (name.split('.').pop() || '').toLowerCase() === 'docx'
const isPptxFile = (name: string) => (name.split('.').pop() || '').toLowerCase() === 'pptx'

const emit = defineEmits<{
  close: []
}>()

// 关闭预览
const closePreview = () => {
  emit('close')
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取Office文件类型
const getOfficeType = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const typeMap: Record<string, string> = {
    'doc': 'Word文档',
    'docx': 'Word文档',
    'xls': 'Excel表格',
    'xlsx': 'Excel表格',
    'ppt': 'PowerPoint演示文稿',
    'pptx': 'PowerPoint演示文稿'
  }
  return typeMap[ext] || 'Office文档'
}

// 图片加载完成
const onImageLoad = () => {
  console.log('图片加载完成')
}

// 图片加载失败
const onImageError = () => {
  console.error('图片加载失败')
}

// 视频加载开始
const onVideoLoadStart = () => {
  console.log('视频加载开始')
}

// 视频加载失败
const onVideoError = () => {
  console.error('视频加载失败')
}

// Office文档渲染完成
const onOfficeRendered = () => {
  officeLoading.value = false
  officeError.value = ''
}

const onPdfIframeLoad = () => {
  if (pdfIframeLoadTimer) {
    clearTimeout(pdfIframeLoadTimer)
    pdfIframeLoadTimer = null
  }
  pdfIframeLoading.value = false
}

// Office文档渲染失败
const onOfficeError = (error: unknown) => {
  console.error('Office文档渲染失败:', error)
  officeLoading.value = false
  const msg =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : typeof error === 'string'
        ? error
        : '文档加载失败'
  officeError.value = msg || '文档加载失败'
}

// 打开/切换预览时重置。须用 flush: 'sync'：默认 post 会在子组件 @rendered 之后才跑，
// 会把 officeLoading 再次设为 true，遮罩盖住已渲染的 PDF/Office，表现为「看不见」。
watch(
  () => [
    props.fileType,
    props.visible,
    props.previewKey,
    props.binaryPreview,
    props.fileName,
  ],
  () => {
    if (!props.visible) {
      if (loadingFallbackTimer) {
        clearTimeout(loadingFallbackTimer)
        loadingFallbackTimer = null
      }
      if (pdfIframeLoadTimer) {
        clearTimeout(pdfIframeLoadTimer)
        pdfIframeLoadTimer = null
      }
      officeLoading.value = false
      pdfIframeLoading.value = false
      return
    }
    officeError.value = ''
    if (props.fileType === 'pdf') {
      pdfIframeError.value = false
      pdfIframeLoading.value = true
      if (pdfIframeLoadTimer) clearTimeout(pdfIframeLoadTimer)
      pdfIframeLoadTimer = setTimeout(() => {
        pdfIframeLoadTimer = null
        if (pdfIframeLoading.value) {
          pdfIframeLoading.value = false
          pdfIframeError.value = true
        }
      }, 12000)
      return
    }
    if (props.fileType === 'office') {
      const ext = (props.fileName.split('.').pop() || '').toLowerCase()
      officeLoading.value = ['docx', 'xls', 'xlsx', 'pptx'].includes(ext)
    }
  },
  { flush: 'sync' },
)

// 若 pdf.js 未触发 rendered（网络/异常），避免遮罩永久挡住
watch(
  () => [props.visible, props.fileType, props.previewKey, officeLoading.value],
  () => {
    if (loadingFallbackTimer) {
      clearTimeout(loadingFallbackTimer)
      loadingFallbackTimer = null
    }
    if (!props.visible || !officeLoading.value) return
    if (props.fileType !== 'office') return
    loadingFallbackTimer = setTimeout(() => {
      loadingFallbackTimer = null
      if (officeLoading.value && !officeError.value) {
        officeLoading.value = false
      }
    }, 8000)
  },
  { flush: 'post' },
)

onUnmounted(() => {
  if (loadingFallbackTimer) {
    clearTimeout(loadingFallbackTimer)
    loadingFallbackTimer = null
  }
  if (pdfIframeLoadTimer) {
    clearTimeout(pdfIframeLoadTimer)
    pdfIframeLoadTimer = null
  }
})
</script>

<style lang="scss" scoped>
.media-preview {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;

  .preview-overlay {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

    .preview-content {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      min-height: 0;
      overflow: hidden;
    }

    .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: rgba(0, 0, 0, 0.7);
      }
    }
  }
}

.image-preview {
  display: flex;
  flex-direction: column;
  align-items: center;

  .preview-image {
    max-width: 90vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .image-info {
    padding: 16px;
    text-align: center;
    background: #f5f5f5;
    border-radius: 0 0 8px 8px;

    p {
      margin: 4px 0;
      color: #666;
    }
  }
}

// 视频预览样式
.video-preview {
  display: flex;
  flex-direction: column;
  align-items: center;

  .preview-video {
    max-width: 90vw;
    max-height: 80vh;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .video-info {
    padding: 16px;
    text-align: center;
    background: #f5f5f5;
    border-radius: 0 0 8px 8px;

    p {
      margin: 4px 0;
      color: #666;
    }
  }
}

// 文本预览样式
.text-preview {
  display: flex;
  flex-direction: column;
  width: 800px;
  height: 600px;

  .text-header {
    padding: 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;

    h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    p {
      margin: 0;
      color: #666;
    }
  }

  .text-content {
    flex: 1;
    overflow: auto;
    padding: 16px;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      background: #f9f9f9;
      padding: 16px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
  }
}

// Office文档预览样式
.office-preview {
  display: flex;
  flex-direction: column;
  width: 90vw;
  max-width: 1200px;
  height: 80vh;
  max-height: 800px;

  .office-header {
    padding: 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;

    h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 18px;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .office-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    position: relative;

    .office-viewport {
      position: relative;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .office-loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.92);
      text-align: center;

      .loading-icon {
        font-size: 48px;
        color: var(--el-color-primary);
        animation: spin 1s linear infinite;
      }

      p {
        margin: 16px 0 0;
        font-size: 15px;
        color: #333;
      }
    }

    // vue-office组件样式
    :deep(.vue-office-docx),
    :deep(.vue-office-excel),
    :deep(.vue-office-pptx) {
      width: 100%;
      height: 100%;
      border: none;
    }

    .office-error,
    .office-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #666;
      padding: 40px;

      p {
        margin: 16px 0 8px 0;
        font-size: 16px;
        color: #333;
      }

      .download-link {
        display: inline-block;
        margin-top: 16px;
        padding: 8px 16px;
        background: var(--el-color-primary);
        color: white;
        text-decoration: none;
        border-radius: 4px;
        transition: background-color 0.3s;

        &:hover {
          background: var(--el-color-primary-dark-2);
        }
      }
    }

    .office-error--fill {
      min-height: 240px;
    }

    .office-error {
      color: #ff4757;

      p {
        color: #ff4757;
      }
    }
  }
}

// PDF预览样式
.pdf-preview {
  display: flex;
  flex-direction: column;
  width: 90vw;
  max-width: 1200px;
  height: 80vh;
  max-height: 800px;

  .pdf-header {
    padding: 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;

    h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 18px;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  .pdf-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    position: relative;

    &.pdf-content--iframe .pdf-iframe-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
      background: #525659;
    }

    .pdf-iframe {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 55vh;
      border: 0;
      background: #fff;
    }

    .office-loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.92);

      .loading-icon {
        font-size: 48px;
        color: var(--el-color-primary);
        animation: spin 1s linear infinite;
      }

      p {
        margin: 16px 0 0;
        font-size: 15px;
        color: #333;
      }
    }

    .office-error--fill {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 240px;
      padding: 40px;
      text-align: center;

      .download-link {
        display: inline-block;
        margin-top: 16px;
        padding: 8px 16px;
        background: var(--el-color-primary);
        color: white;
        text-decoration: none;
        border-radius: 4px;
      }
    }
  }
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  text-align: center;

  .file-icon {
    margin-bottom: 20px;
    color: #999;
  }

  .file-info {
    p {
      margin: 8px 0;
      color: #666;
    }
  }
}

// 旋转动画
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
