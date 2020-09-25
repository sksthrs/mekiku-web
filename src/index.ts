import App from './app'
import Log from './log'

var _app: App | undefined

document.addEventListener('DOMContentLoaded', () => {
  const app = new App()
  _app = app
})
