import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import ScannerView from './components/ScannerView.vue'
import HistoryView from './components/HistoryView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/scan' },
    { path: '/scan', component: ScannerView },
    { path: '/history', component: HistoryView },
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
