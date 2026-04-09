import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'leaflet/dist/leaflet.css'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
