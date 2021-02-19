import App from './app'
import Log from './log'

var _app: App | undefined

document.addEventListener('DOMContentLoaded', () => {
  Log.w('Info', 'DOMContentLoaded')
  const app = new App()
  _app = app
})
