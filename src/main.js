import { createApp } from 'vue'
import { createPinia } from 'pinia'

import persist from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import './assets/styles/pink-theme.css'
import '@/lib/http'
import 'animate.css'
import '@vue-office/docx/lib/v3/style.css'
import '@vue-office/excel/lib/v3/style.css'




const app = createApp(App)

app.use(createPinia().use(persist))
app.use(router)

app.mount('#app')
