import { AppConfig } from "./appConfig"
import { Pane } from "./pane"
import { UtilDom } from "./utilDom"
import { T } from "./t"
import { Util } from "./util"

export class PaneInput implements Pane {
  getName() { return "PaneInput" }

  getLastInput() : string {
    if (this.lastInput !== 1) {
      return this.input1Vjs.value
    } else {
      return this.input2Vjs.value
    }
  }

  private readonly pane = document.getElementById('input') as HTMLDivElement
  private readonly titlebar = document.getElementById('input-title') as HTMLDivElement
  private readonly input1Vjs = document.getElementById("input1") as HTMLInputElement
  private readonly input2Vjs = document.getElementById("input2") as HTMLInputElement
  private lastInput: number = 0

  private isOnShow: boolean = false

  private getFkey: (ix:number) => string = (ix) => { return "" }
  setGetFkey(callback: (ix:number) => string) { this.getFkey = (ix) => callback(ix) }

  private doOnInput: (text:string) => void = (t) => {}
  setDoOnInput(callback: (text:string) => void) { this.doOnInput = (t) => callback(t) }
  private lastSendInput: string = ''
  private onInput(text:string) {
    if (text === this.lastSendInput) return
    this.lastSendInput = text
    this.doOnInput(text)
  }

  private doOnEnter: (text:string) => void = (t) => {}
  setDoOnEnter(callback: (text:string) => void) { this.doOnEnter = (t) => callback(t) }
  private onEnter(text:string) { this.doOnEnter(text) }

  private doOnUndo: () => string = () => { return "" }
  setDoOnUndo(callback: () => string) { this.doOnUndo = () => callback() }
  private onUndo(): string { return this.doOnUndo() }

  private doOnErase: () => void = () => {}
  setDoOnErase(callback: () => void) { this.doOnErase = () => callback() }
  private onErase() { this.doOnErase() }

  constructor() {
    this.localize()

    this.input1Vjs.addEventListener("focus", (ev) => {
      this.lastInput = 0
    })

    this.input2Vjs.addEventListener("focus", (ev) => {
      this.lastInput = 1
    })

    this.input1Vjs.addEventListener("input", (ev) => {
      this.onInput(this.input1Vjs.value)
    })

    this.input2Vjs.addEventListener("input", (ev) => {
      this.onInput(this.input2Vjs.value)
    })

    this.input1Vjs.addEventListener("keydown", (ev) => {
      this.onType(this.input1Vjs, ev, this.input2Vjs)
    })

    this.input2Vjs.addEventListener("keydown",(ev) => {
      this.onType(this.input2Vjs, ev, this.input1Vjs)
    })

    this.configToScreen()

  } // end of constructor

  private onType(el:HTMLInputElement, ev:KeyboardEvent, another_el:HTMLInputElement) {
    // Only on macOS, when some key is typed while IME input, ev.key is same as when not IME inputing.
    // https://qiita.com/ledsun/items/31e43a97413dd3c8e38e
    if (ev.keyCode === UtilDom.KEY_CTRL) { return }
    if (ev.keyCode === UtilDom.KEY_TAB) {
      another_el.focus()
      ev.preventDefault()
      ev.stopImmediatePropagation()
    } else if (ev.keyCode === UtilDom.KEY_ENTER) {
      // if (UtilDom.isCommandOrControlPressed(ev) === true) {
      //   this.replacePart(el, "\n")
      // } else {
        this.onEnter(el.value)
        el.value = ""
      // }
      ev.preventDefault()
      ev.stopImmediatePropagation()
    } else if (ev.keyCode === UtilDom.KEY_ESC) {
      el.value = ""
      ev.preventDefault()
      ev.stopImmediatePropagation()
    } else {
      const iFkey = UtilDom.getCtrlOrFKeyNumber(ev) - 1
      if (iFkey >= 0 && iFkey < 7) {
        const sFkey = this.getFkey(iFkey)
        if (sFkey.length > 0) { this.replacePart(el, sFkey) }
        ev.preventDefault()
        ev.stopImmediatePropagation()
      } else if (iFkey === 7) {
        if (ev.shiftKey !== true) {
          this.enclose(el, 
            AppConfig.data.getParentheses1(), 
            AppConfig.data.getParentheses2())
        } else {
          this.enclose(el, 
            AppConfig.data.getParenthesesShift1(), 
            AppConfig.data.getParenthesesShift2())
        }
        ev.preventDefault()
        ev.stopImmediatePropagation()
      } else if (iFkey === 8) {
        const undone = this.onUndo()
        if (undone.length > 0) { this.insertTop(el, undone) }
        ev.preventDefault()
        ev.stopImmediatePropagation()
      }
    }
    this.onInput(el.value)
  }

  private applyStyle(el:HTMLElement) {
    el.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.input_font_familyName)
    el.style.fontSize = AppConfig.data.input_font_size + "pt"
    el.style.fontWeight = AppConfig.data.input_font_isBold ? "bold" : "normal"

    // special treatment because of browsers not align color of IME underline
    var foreColor = AppConfig.data.input_foreColor
    var backColor = AppConfig.data.input_backColor
    el.style.color = foreColor
    el.style.backgroundColor = backColor
  }

  private configToScreen() {
    this.applyStyle(this.input1Vjs)
    this.applyStyle(this.input2Vjs)
  }

  setPaneToConfig() {
  }

  private insertTop(el:HTMLInputElement, text:string) {
    // HTMLInputElement.selectionStart/End must exist in types text/password/search/tel/url/week/month
    const index = el.selectionEnd || 0
    el.value = text + el.value
    const newIndex = index + text.length
    el.blur() // workaround for Chromium (setSelectionRange doesn't textarea's scrollTop)
    el.setSelectionRange(newIndex, newIndex)
    el.focus()
  }

  private replacePart(el:HTMLInputElement, replaced:string) {
    // HTMLInputElement.selectionStart/End must exist in types text/password/search/tel/url/week/month
    const index0 = el.selectionStart || 0
    const index1 = el.selectionEnd || 0
    const text0 = el.value.substring(0, index0)
    const text1 = el.value.substring(index1)
    el.value = text0 + replaced + text1
    const newIndex = index0 + replaced.length
    el.blur() // workaround for Chromium (setSelectionRange doesn't textarea's scrollTop)
    el.setSelectionRange(newIndex, newIndex)
    el.focus()
  }

  private enclose(el:HTMLInputElement, strPre:string, strPost:string) {
    // HTMLInputElement.selectionStart/End must exist in types text/password/search/tel/url/week/month
    const index0 = el.selectionStart || 0
    const index1 = el.selectionEnd || 0
    const len = el.value.length
    el.value = strPre + el.value + strPost
    var newIndex0 = index0 + strPre.length
    var newIndex1 = index1 + strPre.length
    if (index0 === index1 && index1 === len) {
      newIndex0 += strPost.length
      newIndex1 += strPost.length
    }
    el.blur() // workaround for Chromium (setSelectionRange doesn't textarea's scrollTop)
    el.setSelectionRange(newIndex0, newIndex1)
    el.focus()
  }

  updateConfig() {
    this.configToScreen()
  }

  focus(): void {
    if (this.lastInput === 1) {
      this.input2Vjs.focus()
    } else {
      this.input1Vjs.focus()
    }
  }

  localize() {
    this.setTitle(T.t("Input Window","Input") + Util.getShortcutParenthesized("I"))
  }

  private setTitle(title:string) {
    this.titlebar.textContent = title
  }

  toggle(): void {
    if (UtilDom.isDisplayed(this.pane)) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    UtilDom.displayOn(this.pane, "flex") // input pane is "flex"
  }

  hide(): void {
    UtilDom.displayOff(this.pane)
  }

}
