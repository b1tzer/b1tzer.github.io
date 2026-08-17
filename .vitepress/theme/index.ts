import DefaultTheme from 'vitepress/theme'
import { enhanceApp } from 'vitepress-plugin-svg-editor/client'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp
}
