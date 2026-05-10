declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean
  }
}

declare global {
  interface HTMLElement {
    _hasListener?: boolean
  }
  interface Element {
    _hasListener?: boolean
  }
}

export {}
