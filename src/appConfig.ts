import { T } from './t';

export class AppConfig {
  // for "config[key]" style
  [key: string]: string | number | boolean | object;

  // miscellaneous
  _misc_locale: string = ""; // access through getLocale/setLocale.
  // empty string : use OS default locale
  getLocale() : string {
    return (this._misc_locale === "") ? T.getBrowserLocale() : this._misc_locale;
  }
  setLocale(locale:string) {
    if (locale === T.getBrowserLocale()) {
      this._misc_locale = "";
    } else {
      this._misc_locale = locale;
    }
  }

  misc_pane1_width: number = 45
  misc_pane2_width: number = 25
  misc_pane3_width: number = 30
  misc_display_input_height: number = 65
  misc_monitor_height: number = 35
  misc_pft_height: number = 50
  misc_pftmon_height: number = 50

  // display pane
  main_font_familyName: string = "";
  main_font_size: number = 24;
  main_font_isBold: boolean = false;
  main_foreColor: string = "#ffffff";
  main_backColor: string = "#000000";

  main_outline_enabled: boolean = false;
  main_outline_color: string = "#80ff80";
  main_outline_width: number = 2;

  main_scrollMsec: number = 200; // [msec]
  main_lineHeight: number = 140; // [%]

  // display pane (viewer mode)
  main_v_font_familyName: string = "";
  main_v_font_size: number = 28;
  main_v_font_isBold: boolean = false;
  main_v_foreColor: string = "#ffffff";
  main_v_backColor: string = "#000000";

  main_v_outline_enabled: boolean = false;
  main_v_outline_color: string = "#80ff80";
  main_v_outline_width: number = 2;

  main_v_scrollMsec: number = 200; // [msec]
  main_v_lineHeight: number = 140; // [%]

  // input pane
  input_font_familyName: string = "";
  input_font_size: number = 14;
  input_font_isBold: boolean = false;
  input_foreColor: string = "#000000";
  input_backColor: string = "#ffffff";
  input_parentheses_1: string = "";
  input_parentheses_2: string = "";
  input_parenthesesShift_1: string = "";
  input_parenthesesShift_2: string = "";

  private getParentheses1_Default() : string { return T.t("“", "Config|Input"); }
  private getParentheses2_Default() : string { return T.t("”", "Config|Input"); }
  private getParenthesesShift1_Default() : string { return T.t("(", "Config|Input"); }
  private getParenthesesShift2_Default() : string { return T.t(")", "Config|Input"); }

  getParentheses1() :string {
    if (this.input_parentheses_1 === "") return this.getParentheses1_Default();
    return this.input_parentheses_1;
  }
  setParentheses1(p:string) :boolean {
    if (p === this.getParentheses1_Default()) {
      if (this.input_parentheses_1 === "") return false;
      this.input_parentheses_1 = "";
    } else {
      if (this.input_parentheses_1 === p) return false;
      this.input_parentheses_1 = p;
    }
    return true;
  }

  getParentheses2() :string {
    if (this.input_parentheses_2 === "") return this.getParentheses2_Default();
    return this.input_parentheses_2;
  }
  setParentheses2(p:string) :boolean {
    if (p === this.getParentheses2_Default()) {
      if (this.input_parentheses_2 === "") return false;
      this.input_parentheses_2 = "";
    } else {
      if (this.input_parentheses_2 === p) return false;
      this.input_parentheses_2 = p;
    }
    return true;
  }

  getParenthesesShift1() :string {
    if (this.input_parenthesesShift_1 === "") return this.getParenthesesShift1_Default();
    return this.input_parenthesesShift_1;
  }
  setParenthesesShift1(p:string) :boolean {
    if (p === this.getParenthesesShift1_Default()) {
      if (this.input_parenthesesShift_1 === "") return false;
      this.input_parenthesesShift_1 = "";
    } else {
      if (this.input_parenthesesShift_1 === p) return false;
      this.input_parenthesesShift_1 = p;
    }
    return true;
  }

  getParenthesesShift2() :string {
    if (this.input_parenthesesShift_2 === "") return this.getParenthesesShift2_Default();
    return this.input_parenthesesShift_2;
  }
  setParenthesesShift2(p:string) :boolean {
    if (p === this.getParenthesesShift2_Default()) {
      if (this.input_parenthesesShift_2 === "") return false;
      this.input_parenthesesShift_2 = "";
    } else {
      if (this.input_parenthesesShift_2 === p) return false;
      this.input_parenthesesShift_2 = p;
    }
    return true;
  }

  // chat pane
  chat_font_familyName: string = "";
  chat_font_size: number = 12;
  chat_font_isBold: boolean = false;
  chat_foreColor: string = "#ffffff";
  chat_backColor: string = "#000000";
  chat_notifyColor: string = "#ff0000";
  chat_timer: number = 5;

  // monitor pane
  monitor_font_familyName: string = "";
  monitor_font_size: number = 10;
  monitor_font_isBold: boolean = false;
  monitor_foreColor: string = "#ffffff";
  monitor_backColor: string = "#000000";

  // pft pane
  pft_font_familyName: string = "";
  pft_font_size: number = 12;
  pft_font_isBold: boolean = false;
  pft_foreColor: string = "#ffffff";
  pft_backColor: string = "#000000";
  pft_nameBackColor: string = "#000000";
  pft_nameOtherBackColor: string = "#333333";
  pft_show_isAll: boolean = true;
  pft_show_active_ratio: number = 100;

  /**
   * Limit the value of pft_show_active_ratio only in [100,150,200,300].
   */
  limitPftShowActiveRatio() {
    if (this.pft_show_active_ratio < 125) {
      this.pft_show_active_ratio = 100;
    }
    else if (this.pft_show_active_ratio < 175) {
      this.pft_show_active_ratio = 150;
    }
    else if (this.pft_show_active_ratio < 250) {
      this.pft_show_active_ratio = 200;
    }
    else {
      this.pft_show_active_ratio = 300;
    }
  }

  pft_fallbackEncoding: string = "Shift-JIS";

  // pft-monitor pane
  pftMon_font_familyName: string = "";
  pftMon_font_size: number = 12;
  pftMon_font_isBold: boolean = false;
  pftMon_foreColor: string = "#ffffff";
  pftMon_backColor: string = "#000000";

  // f-keys pane
  fkey_font_familyName: string = "";
  fkey_font_size: number = 10;
  fkey_font_isBold: boolean = false;
  fkey_foreColor: string = "#ffffff";
  fkey_backColor: string = "#000000";

  // singleton

  private constructor() {
  }

  private static configNow: AppConfig|undefined = undefined;
  public static get data():AppConfig {
    if (AppConfig.configNow === undefined) { AppConfig.configNow = new AppConfig(); }
    return AppConfig.configNow;
  }

  // utilities

  /**
   * returns config file extension (dot included)
   */
  static getExtensionMekikuWeb() : string {
    return '.mkw'
  }

  // set values

  static tryApplyNewData(loaded: {[key:string]: any}): boolean {
    this.configNow = new AppConfig();
    for (var key of Object.keys(loaded)) {
      if (key in this.configNow) {
        if (typeof this.configNow[key] === typeof loaded[key]) {
          this.configNow[key] = loaded[key];
        }
      }
    }
    return true;
  }

  static trySetJSON(json:string) : boolean {
    const obj = JSON.parse(json);
    return this.tryApplyNewData(obj);
  }

  static getJSON() : string {
    return JSON.stringify(AppConfig.data);
  }

  static resetAll() {
    AppConfig.configNow = new AppConfig()
  }

}
