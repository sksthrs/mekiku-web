import { UtilDom } from "./utilDom"

class DialogInput {
  private readonly dialog = document.getElementById('inputdialog') as HTMLDivElement
  private readonly label = document.getElementById('inputdialog_label') as HTMLLabelElement
  private readonly input = document.getElementById('inputdialog_text') as HTMLInputElement
  private readonly buttonOk = document.getElementById('inputdialog-ok-button') as HTMLButtonElement
  private readonly buttonCancel = document.getElementById('inputdialog-cancel-button') as HTMLDivElement

  onOkClick:(text:string) => void = text => {}
  onCancelClick:() => void = () => {}

  constructor() {
    this.buttonOk.addEventListener('click', ev => {
      this.hideDialog()
      this.onOkClick(this.input.value)
      this.resetOkCancelEvents()
    })
    this.buttonCancel.addEventListener('click', ev => {
      this.hideDialog()
      this.onCancelClick()
      this.resetOkCancelEvents()
    })
  }

  private resetOkCancelEvents() {
    this.onOkClick = () => {}
    this.onCancelClick = () => {}
  }

  showDialog(label:string, initialValue:string='') {
    this.label.textContent = label
    this.input.value = initialValue
    UtilDom.show(this.dialog)
    this.input.focus()
  }

  hideDialog() {
    UtilDom.hide(this.dialog)
  }
}

export default DialogInput
