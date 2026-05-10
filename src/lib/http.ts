import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

export const http = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE || '/api',
  timeout: 20_000,
})

http.interceptors.request.use(
  (config) => {
    const auth = useAuthStore()
    if (auth.accessToken) {
      config.headers.Authorization = `Bearer ${auth.accessToken}`
    }
    return config
  },
  (err) => Promise.reject(err),
)

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = (error.config ?? {}) as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    try {
      const auth = useAuthStore()
      await auth.refreshSession()
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${auth.accessToken}`
      return http(original)
    } catch {
      const auth = useAuthStore()
      auth.logout()
      const path = router.currentRoute.value?.fullPath || '/chat'
      if (!path.startsWith('/login')) {
        router.replace({
          name: 'login',
          query: { redirect: path },
        })
      }
      return Promise.reject(error)
    }
  },
)
