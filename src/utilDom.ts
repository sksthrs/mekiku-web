import { Util } from "./util"

export class UtilDom {
  /**
   * Get query string without leading '?'
   * @returns query string if exists, or '' if query string does not exist
   */
  static getQuery() : string {
    const q = location.search
    if (q.length > 0 && q[0] === '?') {
      return q.substring(1)
    }
    return ''
  }

  /**
   * Set query string in the address bar.
   * @param query query string without leading '?'
   */
  static setQuery(query:string) {
    history.replaceState({}, '', '?'+query)
  }

  static getWidth(el: HTMLElement): number {
    if (!el) return -1;
    const b = el.getBoundingClientRect();
    return b.width;
  }

  /**
   * Show element by setting "visibility" style to "visible"
   * @param el element to control
   */
  static show(el:HTMLElement | null) {
    if (el == null) return
    el.style.visibility = "visible"
  }

  /**
   * Hide element by setting "visibility" style to "hidden"
   * @param el element to control
   */
  static hide(el:HTMLElement | null) {
    if (el == null) return
    el.style.visibility = "hidden"
  }

  /**
   * Returns the "visibility" style
   * @param el element to detect
   */
  static isShown(el:HTMLElement | null) : boolean {
    if (el == null) return false
    return el.style.visibility === 'visible'
  }

  /**
   * Set "display" style to something
   * @param el element to control
   * @param display value to set
   */
  static displayOn(el:HTMLElement | null, display:string = "initial") {
    if (el == null) return
    el.style.display = display
  }

  /**
   * Set "display" style to "none", so the element goes invisible
   * @param el element to control
   */
  static displayOff(el:HTMLElement | null) {
    if (el == null) return
    el.style.display = "none"
  }

  /**
   * Return "display" style is other than "none"(invisible)
   * @param el element to detect
   */
  static isDisplayed(el:HTMLElement | null) : boolean {
    if (el == null) return false
    return el.style.display !== 'none'
  }

  static makeDialogsRespondToKey() {
    for(const dialog of document.querySelectorAll("div.dialog")) {
      if (dialog.classList.contains("ignore_return")) continue

      const okRaw = dialog.querySelector("button.submit")
      const buttonOk = (okRaw != null) ? okRaw as HTMLButtonElement : undefined
      const cancelRaw = dialog.querySelector("button.cancel")
      const buttonCancel = (cancelRaw != null) ? cancelRaw as HTMLButtonElement : undefined

      for (const element of dialog.querySelectorAll('input[type="text"]')) {
        const el = element as HTMLInputElement
        el.addEventListener('keydown',evKey => {
          if (evKey.keyCode === UtilDom.KEY_ENTER) { buttonOk?.click() }
          if (evKey.keyCode === UtilDom.KEY_ESC) { buttonCancel?.click() }
        })
      }

      for (const element of dialog.querySelectorAll('input[type="password"]')) {
        const el = element as HTMLInputElement
        el.addEventListener('keydown',evKey => {
          if (evKey.keyCode === UtilDom.KEY_ENTER) { buttonOk?.click() }
          if (evKey.keyCode === UtilDom.KEY_ESC) { buttonCancel?.click() }
        })
      }
        
    }
  }

  /**
   * check if input string represents Function-Keys and return the number.
   * (simply check the string format, like "F1", "F12". the number must be positive)
   * 
   * returns : number (1 when F1, 2 when F2...) or -1 (function key is not pressed)
   * 
   * @param key key value of key event
   */
  static getFKeyNumber(key:string) : number {
    if (key.length<2 || key.length>3) return -1;
    if (key.charAt(0) !== "F") return -1;
    const n = Number(key.substr(1));
    if (Number.isInteger(n) && n > 0) return n;
    return -1;
  }

  /**
   * check if input string represents Function-Keys (F1-F12) and return the number.
   * 
   * returns : number (1 when F1, 2 when F2...) or -1 (function key is not pressed)
   * 
   * @param keyCode keyCode value of key event
   */
  static getFKeyNumberByKeyCode(keyCode:number) : number {
      // Only on macOS, when some key is typed while IME input, ev.key is same as when not IME inputing.
      // https://qiita.com/ledsun/items/31e43a97413dd3c8e38e
      if (keyCode < 112 || keyCode > 123) return -1;
    return keyCode-111;
  }

  /**
   * Check if function key was pressed or (Control or Command) + number key were pressed.
   * If so, return the number.
   * 
   * returns : number (1 when F1 or CmdOrCtrl+1,...) or -1 (not pressed: function keys, CmdOrCtrl+number key)
   * 
   * @param ev KeyboardEvent
   */
  static getCtrlOrFKeyNumber(ev:KeyboardEvent) : number {
    // const fkey = this.getFKeyNumber(ev.key);
    const fkey = this.getFKeyNumberByKeyCode(ev.keyCode);
    if (fkey >= 0) {
      return fkey;
    }
    if (ev.key >= "0" && ev.key <= "9" && this.isCommandOrControlPressed(ev)) {
      const n = parseInt(ev.key);
      return n;
    }
    // if KeyboardEvent.code is available, use it. (because KeyboardEvent.key is affected by many things like shift key)
    if (/^Digit[0-9]$/.test(ev.code) && this.isCommandOrControlPressed(ev)) {
      const n = parseInt(ev.code.substr(5));
      return n;
    }
    return -1;
  }

  /**
   * Detect if Command (mac) or Control (other) key is pressed.
   * @param ev KeyboardEvent
   */
  static isCommandOrControlPressed(ev:KeyboardEvent) : boolean {
    const platform = navigator.platform;
    if (Util.isMac()) {
      return ev.metaKey;
    } else {
      return ev.ctrlKey;
    }
  }

  /**
   * Parse string (or null) into number.
   * @param text target string (possibly null)
   * @param defaultValue number returned when text is null.
   */
  static parseFloatEx(text: string | null, defaultValue: number = 0) : number {
    if (text !== null) {
      return parseFloat(text);
    } else {
      return defaultValue;
    }
  }

  /**
   * Make CSS 'font-family' specifier (adding 'sans-serif')
   * @param familyName name of font-family
   * @param genericName generic font-family name if you want specify
   */
  static makeFontFamily(familyName:string, genericName:string = 'sans-serif') : string {
    if (familyName === null || familyName.trim().length < 1) return genericName;
    if (familyName.trim() === genericName) return familyName;
    return familyName + ' , ' + genericName;
  }

  static addSelectOption(sel:HTMLSelectElement, text:string, value:string) {
    const opt = document.createElement("option") as HTMLOptionElement;
    opt.text = text;
    opt.value = value;
    sel.add(opt);
  }

  /**
   * Extract all rules contains certain keyword in CSS text.
   * @param keyword keyword to find in CSS text
   */
  static extractCSSRulesByText(keyword:string) : Array<CSSRule> {
    return this.extractCSSRules(rule => rule.cssText.indexOf(keyword) >= 0)
  }

  /**
   * Extract all rules matches certain condition.
   * @param pred predicate to filter rules.
   */
  static extractCSSRules(pred:(rule:CSSRule) => boolean) : Array<CSSRule> {
    var result:Array<CSSRule> = [];
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (pred(rule)) { result.push(rule) }
      }
    }
    return result;
  }

  /**
   * Get pressed modifier keys as number.
   * Returns sum(pressed-modifier-key-value), value are among "MK_" constants.
   * "MK_" constants are all different 2^n, so you can use bit operation.
   * (example)
   * - when control key pressed : MK_CTRL
   * - when shift and alt keys pressed : MK_SHIFT | MK_ALT
   * @param ev Keyboard event argument
   */
  static getModifierKey(ev:KeyboardEvent) : number {
    return (ev.shiftKey ? this.MK_SHIFT : 0)
    + (ev.ctrlKey ? this.MK_CTRL : 0)
    + (ev.altKey ? this.MK_ALT : 0)
    + (ev.metaKey ? this.MK_META : 0);
  }

  static readonly MK_SHIFT = 1;
  static readonly MK_CTRL = 2;
  static readonly MK_ALT = 4;
  static readonly MK_META = 8;

  static readonly KEY_TAB = 9;
  static readonly KEY_ENTER = 13;
  static readonly KEY_CTRL = 17;
  static readonly KEY_ESC = 27;
  static readonly KEY_ARROW_LEFT = 37;
  static readonly KEY_ARROW_UP = 38;
  static readonly KEY_ARROW_RIGHT = 39;
  static readonly KEY_ARROW_DOWN = 40;
  static readonly KEY_A = 65;
  static readonly KEY_B = 66;
  static readonly KEY_C = 67;
  static readonly KEY_D = 68;
  static readonly KEY_E = 69;
  static readonly KEY_F = 70;
  static readonly KEY_G = 71;
  static readonly KEY_H = 72;
  static readonly KEY_I = 73;
  static readonly KEY_J = 74;
  static readonly KEY_K = 75;
  static readonly KEY_L = 76;
  static readonly KEY_M = 77;
  static readonly KEY_N = 78;
  static readonly KEY_O = 79;
  static readonly KEY_P = 80;
  static readonly KEY_Q = 81;
  static readonly KEY_R = 82;
  static readonly KEY_S = 83;
  static readonly KEY_T = 84;
  static readonly KEY_U = 85;
  static readonly KEY_V = 86;
  static readonly KEY_W = 87;
  static readonly KEY_X = 88;
  static readonly KEY_Y = 89;
  static readonly KEY_Z = 90;

  /**
   * Calc luminance of the argument-specified-color.
   * Luminance is lightness of HLS color space (not HSV).
   * 
   * returns luminance (0-255) or -1 (when argument is not "#xxxxxx" style)
   * 
   * @param src color code ("#xxxxxx" style)
   */
  static getLuminance(src:string) : number {
    const pattern = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
    const result = pattern.exec(src);
    if (result === null) return -1;
    if (result[3]) {
      const r = parseInt(result[1],16);
      const g = parseInt(result[2],16);
      const b = parseInt(result[3],16);
      const rgbMax = Math.max(r,g,b);
      const rgbMin = Math.min(r,g,b);
      return (rgbMax+rgbMin)/2;
    }
    return -1;
  }

  // For static use only. Do not 'new'.
  private constructor() {}
}
