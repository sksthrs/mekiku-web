export class Util {
  /**
   * Extract string 'before delimiter' or whole if delimiter is not included.
   * 
   * beforeOf('abc/def', '/') === 'abc'
   * beforeOf('abc/def', ':') === 'abc/def'
   * beforeOf('abc/def', 'a') === ''
   * 
   * @param src source string
   * @param delimiter delimiter string
   */
  static beforeOf(src:string, delimiter:string) : string {
    const ix = src.indexOf(delimiter)
    if (ix<0) return src
    return src.substring(0,ix)
  }

  /**
   * Check if a string is legit for room-name.
   * @param name room name candidate
   */
  static isRoomNameLegit(name:string) : boolean {
    const re = /^[A-Za-z0-9]+$/
    return re.test(name)
  }

  /**
   * Check if a string contains one of substrings
   * @param text string which is checked if contains one of substrings
   * @param substrings string(s) which might be contained in text
   */
  static contains(text: string, ...substrings: string[]) : boolean {
    for (const ix in substrings) {
      if (text.indexOf(substrings[ix]) >= 0) { return true; }
    }
    return false;
  }

  /**
   * tell if argument is string or not.
   * @param v value to detect
   */
  static isString(v:any) : boolean {
    return typeof (v) === 'string' || v instanceof String
  }

  /**
   * tell if argument is number or not.
   * https://zero-plus-one.jp/javascript/isnumber/
   * @param val value to detect
   */
  static isNumber(val:any) : boolean {
    return ((typeof val === 'number') && isFinite(val))
  }

  /**
   * Translate value as number
   * @param val value translated as number
   * @param def default value (used when val is illegal)
   */
  static toNumber(val:any, def:number = 0) : number {
    if (this.isNumber(val)) {
      return val
    }
    if (this.isString(val)) {
      const n = parseInt(val,10)
      if (Number.isNaN(n) === false) {
        return n
      }
    }
    return def
  }

  /**
   * get UTC time in "hh:mm:ss.sss" format.
   */
  static getNowUTCTimeString() : string {
    const n = new Date()
    const h = n.getUTCHours().toString().padStart(2,'0')
    const m = n.getUTCMinutes().toString().padStart(2,'0')
    const s = n.getUTCSeconds().toString().padStart(2,'0')
    const ms = n.getUTCMilliseconds().toString().padStart(3,'0')
    return `${h}:${m}:${s}.${ms}`
  }

  /**
   * Sums up values in array (e.g. sum of lengths in string-array)
   * @param array source values
   * @param func function to get value for each item in the array
   */
  static arraySum<T>(
    array: T[],
    func: (value: T, index: number, array: T[]) => number): number {
    var sum = 0;
    array.forEach((value: T, index: number, array: T[]) => {
      sum += func(value, index, array);
    });
    return sum;
  }

  static toLf(src:string) : string {
    return src.replace(/\r\n?/g, "\n");
  }

  static toCrLf(src:string) : string {
    return this.toLf(src).replace(/\n/g,"\r\n");
  }

  /**
   * Translate number into "Zero-Padded" string (like "00123")
   * @param value the number translated to string
   * @param digit the length of the result string
   */
  static toStringWithZero(value:number, digit:number) : string {
    return ("0".repeat(digit) + value.toFixed(0)).slice(-digit);
  }

  static getNewLineCode() : string {
    return this.isWin() ? "\r\n" : "\n"
  }

  static isWin() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    if (platform.includes("win"))
    {
      return true
    }
    return false
  }

  static isMac() : boolean {
    const platform = window.navigator.platform.toLowerCase()
    if (platform.includes("mac") 
      || platform.includes("iphone") 
      || platform.includes("ipad"))
    {
      return true
    }
    return false
  }

  /**
   * provide shortcut-description string (ex. "Ctrl+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShortcutTextRaw(key: string) : string {
    if (key.length < 1) return ""
    const modifier = this.isMac() ? "Cmd+" : "Ctrl+"
    return modifier + key.charAt(0)
  }

  /**
   * provide shortcut-description string with leading space (ex. " Ctrl+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShortcutText(key: string) : string {
    if (key.length < 1) return "";
    return " " + this.getShortcutTextRaw(key);
  }

  /**
   * provide shortcut-description string with leading space and parenthesized (ex. " (Ctrl+S)").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShortcutParenthesized(key: string) : string {
    if (key.length < 1) return "";
    return " (" + this.getShortcutTextRaw(key) + ")";
  }

  /**
   * provide shortcut (with shift key) description string (ex. "Ctrl+Shift+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShiftShortcutTextRaw(key: string) : string {
    if (key.length < 1) return "";
    var modifier = (this.isMac()) ? "Shift+Cmd+" : "Ctrl+Shift+";
    return modifier + key.charAt(0);
  }

  /**
   * provide shortcut (with shift key) description string with leading space (ex. " Ctrl+Shift+S").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShiftShortcutText(key: string) : string {
    if (key.length < 1) return "";
    return " " + this.getShiftShortcutTextRaw(key);
  }

  /**
   * provide shortcut (with shift key) description string with leading space and parenthesized (ex. " (Ctrl+Shift+S)").
   * on macOS, "Cmd" is used instead of "Ctrl".
   * [notice] return value starts with space (u0020) because most usage need it.
   * @param key character of shortcut-base-key. assuming "R","1",...
   */
  static getShiftShortcutParenthesized(key: string) : string {
    if (key.length < 1) return "";
    return " (" + this.getShiftShortcutTextRaw(key) + ")";
  }

  static numberToText2(v:number) : string {
    return v.toString().padStart(2,'0')
  }

  /**
   * return current timestamp string as '2020-01-23_01:23:45'
   */
  static getIsoModifiedDateTimeString() : string {
    const n = new Date()
    const y = n.getFullYear().toString()
    const m = this.numberToText2(n.getMonth()+1)
    const d = this.numberToText2(n.getDate())
    const hh = this.numberToText2(n.getHours())
    const mm = this.numberToText2(n.getMinutes())
    const ss = this.numberToText2(n.getSeconds())
    return `${y}-${m}-${d}_${hh}:${mm}:${ss}`
  }

  /**
   * return current timestamp string as '2020-01-23'
   */
  static getIsoStyleDateString() : string {
    const n = new Date()
    const y = n.getFullYear().toString()
    const m = this.numberToText2(n.getMonth()+1)
    const d = this.numberToText2(n.getDate())
    return `${y}-${m}-${d}`
  }

  /**
   * make message digest and returns hex-ed string
   * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
   * @param message string to make digest
   */
  static async digestMessage(message:string) : Promise<string> {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  // Only for static-calling. Don't "new".
  private constructor() {}
}

export interface Tuple2<T1,T2> {
  v1: T1;
  v2: T2;
}
