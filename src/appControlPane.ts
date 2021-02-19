import { UtilDom } from "./utilDom"

class AppControlPane {
  private control = document.getElementById('app_control') as HTMLDivElement
  private shortState = document.getElementById('short_state') as HTMLSpanElement
  private setting = document.getElementById('appSetting') as HTMLSpanElement
  private logout = document.getElementById('appLogout') as HTMLSpanElement
  onSetting: () => void = () => {}
  onLogout: () => void = () => {}

  constructor() {
    this.setting.addEventListener('click', (ev) => {
      this.onSetting()
    })

    this.logout.addEventListener('click', (ev) => {
      this.onLogout()
    })
  }

  goTop() {
    this.control.classList.remove('bottom')
    this.control.classList.add('top')
  }

  goBottom() {
    this.control.classList.remove('top')
    this.control.classList.add('bottom')
  }

  showShortState() {
    UtilDom.displayOn(this.shortState)
  }

  hideShortState() {
    UtilDom.displayOff(this.shortState)
  }
}

export default AppControlPane
