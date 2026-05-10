/// <reference types="vite/client" />

declare module 'markdown-it'
declare module 'markdown-it-link-attributes'
declare module 'markdown-it-emoji'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '@vue-office/docx/lib/v3/index.js' {
  import type { DefineComponent } from 'vue'
  const c: DefineComponent<object, object, unknown>
  export default c
}
declare module '@vue-office/excel/lib/v3/index.js' {
  import type { DefineComponent } from 'vue'
  const c: DefineComponent<object, object, unknown>
  export default c
}
declare module '@vue-office/pptx/lib/v3/index.js' {
  import type { DefineComponent } from 'vue'
  const c: DefineComponent<object, object, unknown>
  export default c
}

interface ImportMetaEnv {
  readonly VITE_APP_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
