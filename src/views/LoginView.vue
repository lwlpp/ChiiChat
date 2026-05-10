<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const submit = async () => {
  errorMsg.value = ''
  loading.value = true
  try {
    await auth.login({
      username: username.value,
      password: password.value,
    })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/chat'
    await router.replace(redirect || '/chat')
  } catch (e) {
    errorMsg.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <h1>ChiiChat</h1>
        <p class="hint">演示账号：任意用户名 + 任意非空密码</p>
      </div>

      <el-form class="form" @submit.prevent="submit">
        <el-form-item>
          <el-input
            v-model="username"
            size="large"
            placeholder="用户名"
            :prefix-icon="User"
            clearable
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            size="large"
            placeholder="密码"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <el-button
          type="primary"
          size="large"
          class="submit-btn"
          native-type="submit"
          :loading="loading"
        >
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: url('@/assets/photo/壁纸1.png') no-repeat center;
  background-size: cover;
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 2rem 1.75rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 12px 40px rgba(180, 80, 120, 0.15);
}

.brand {
  text-align: center;
  margin-bottom: 1.5rem;

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--el-color-primary-dark-2);
  }

  .hint {
    margin: 0;
    font-size: 0.8rem;
    color: #888;
    line-height: 1.4;
  }
}

.form {
  :deep(.el-input__wrapper) {
    border-radius: 10px;
  }
}

.error {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--el-color-danger);
  text-align: center;
}

.submit-btn {
  width: 100%;
  border-radius: 10px;
  margin-top: 0.25rem;
}
</style>
