import { createApp } from 'vue'
import App from './App.vue'
import { loadFonts } from './plugins/webfontloader'
import "bootstrap/dist/css/bootstrap.css";
import 'bootstrap-icons/font/bootstrap-icons.css'

loadFonts()

createApp(App)
  .mount('#app')

import "bootstrap/dist/js/bootstrap.js"