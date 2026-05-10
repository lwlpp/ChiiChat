import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { loginApi, refreshApi, type AuthUser, type LoginCredentials } from '@/lib/auth-api'
import { revokeRefreshSession } from '@/lib/mock-db'

export interface TokenBundle {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const accessToken = ref('')
    const refreshToken = ref('')
    const accessExpiresAt = ref(0)
    const user = ref<AuthUser | null>(null)

    const isAuthenticated = computed(() => Boolean(refreshToken.value))

    function logout() {
      if (refreshToken.value) {
        revokeRefreshSession(refreshToken.value)
      }
      accessToken.value = ''
      refreshToken.value = ''
      accessExpiresAt.value = 0
      user.value = null
    }

    function applyTokenBundle(data: TokenBundle) {
      accessToken.value = data.accessToken
      if (data.refreshToken) refreshToken.value = data.refreshToken
      const sec = data.expiresIn ?? 900
      accessExpiresAt.value = Date.now() + sec * 1000
    }

    async function login(credentials: LoginCredentials) {
      const data = await loginApi(credentials)
      applyTokenBundle(data)
      user.value = data.user ?? null
    }

    async function refreshSession() {
      const rt = refreshToken.value
      if (!rt) {
        const e = new Error('no refresh') as Error & { code?: string }
        e.code = 'NO_REFRESH'
        throw e
      }
      const data = await refreshApi(rt)
      applyTokenBundle(data)
    }

    async function ensureSession() {
      if (!refreshToken.value) return
      const skew = 15_000
      if (accessToken.value && accessExpiresAt.value > Date.now() + skew) return
      await refreshSession()
    }

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      user,
      isAuthenticated,
      login,
      logout,
      refreshSession,
      ensureSession,
    }
  },
  {
    persist: {
      key: 'chiichat-auth',
    },
  },
)
