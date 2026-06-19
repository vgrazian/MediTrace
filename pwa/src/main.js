import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { startReminderNotificationsLoop } from './services/notifications'
import './style.css'

createApp(App).use(router).mount('#app')

startReminderNotificationsLoop()
