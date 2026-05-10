<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="home-page">
    <header class="header">
      <div class="header-inner">
        <span class="logo-text">ChiiChat</span>
        <RouterLink to="/chat" class="nav-chat">进入对话</RouterLink>
      </div>
    </header>

    <main class="main-content">
      <div class="hero-section">
        <h1 class="title">欢迎使用 ChiiChat</h1>
        <p class="description">基于大语言模型的对话界面，支持流式回复与附件上传</p>
        <RouterLink to="/chat" class="start-button">
          <span class="mirror-text">开始对话</span>
        </RouterLink>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: url('@/assets/photo/壁纸1.png') no-repeat center;
  background-size: cover;
}

.header {
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color);

  .header-inner {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 600;
    color: #171717;
    user-select: none;
    white-space: nowrap;
  }

  .nav-chat {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      opacity: 0.85;
    }
  }
}

.main-content {
  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: end;
    margin-top: 17vw;
    margin-right: 5vw;

    .title {
      font-size: 4vw;
      font-weight: 700;
      color: #1a1a1a;
    }

    .description {
      margin: 0;
      font-size: 2vw;
      color: #666;
      line-height: 1.5;
      text-align: right;
      max-width: 44rem;
    }

    .start-button {
      position: relative;
      display: inline-block;
      margin: 1vw 0 0 0;
      padding: 1vw 6vw;
      font-size: 2vw;
      font-weight: 600;
      color: #fff;
      background: var(--el-color-primary);
      border-radius: 12px;
      text-decoration: none;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 6px 30px -10px var(--el-color-primary);

      .mirror-text {
        position: relative;
        z-index: 1;
        font-weight: 700;
        text-transform: uppercase;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 1) 0%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(255, 255, 255, 0.6) 100%
        );
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: 0.5s ease;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 40px -10px var(--el-color-primary);

        &::before {
          left: 100%;
        }
      }

      &:active {
        transform: scale(0.98) translateY(0);
        box-shadow: 0 5px 20px -10px var(--el-color-primary);
      }
    }
  }
}

@media (max-width: 767px) {
  .home-page {
    background: url('@/assets/photo/壁纸3.jpg') no-repeat center;
    background-size: cover;
  }

  .main-content .hero-section {
    margin-top: 18vw;
    margin-right: 2vw;

    .title {
      font-size: 9vw;
    }

    .description {
      font-size: 2.9vw;
    }

    .start-button {
      margin: 2vw 0 0 0;
      padding: 3vw 10vw;
      font-size: 4vw;
    }
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .home-page {
    background: url('@/assets/photo/壁纸3.jpg') no-repeat center;
    background-size: cover;
  }

  .main-content .hero-section {
    margin-top: 50vw;
    margin-right: 2vw;

    .title {
      font-size: 6vw;
    }

    .description {
      font-size: 2vw;
    }

    .start-button {
      margin: 1vw 0 0 0;
      padding: 1vw 7vw;
      font-size: 3vw;
    }
  }
}
</style>
