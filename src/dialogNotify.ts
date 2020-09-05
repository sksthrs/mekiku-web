import { UtilDom } from "./utilDom"

class DialogNotify {
  private readonly dialog = document.getElementById('notify') as HTMLDivElement
  private readonly title = document.getElementById('notify-title') as HTMLDivElement
  private readonly message = document.getElementById('notify-message') as HTMLDivElement
  private readonly buttonPane = document.getElementById('notify-buttons') as HTMLDivElement
  private readonly okButton = document.getElementById('notify-ok-button') as HTMLButtonElement

  onOkClick : () => void = () => {}

  constructor() {
    this.okButton.addEventListener('click',() => {
      this.hideDialog()
      this.onOkClick()
      this.resetOkEvents()
    })
  }

  private resetOkEvents() {
    this.onOkClick = () => {}
  }

  showDialog(title:string, message:string) {
    this.title.textContent = title
    this.message.textContent = message
    UtilDom.show(this.dialog)
    // do not focus okButton, because dialog would be closed just after shown (think you hit enter key in login button with wrong password)
  }

  hideDialog() {
    UtilDom.hide(this.dialog)
  }
}

export default DialogNotify
