import { Tuple2, Util } from "./util";

/**
 * very simple translation service class
 * [notice]
 * Both main and renderer processes need setLocale independently,
 * because T called from main and from renderer is different.
 */
export class T {
  // singleton
  private static _instance : T | null = null;
  private static _isMac : boolean = false;
  private constructor() {
    this.initDict();
  }
  static data() : T {
    if (T._instance === null) { T._instance = new T(); }
    return T._instance;
  }

  static t(basePhrase:string, context:string) : string {
    const phrase = T.data().getPhrase(basePhrase,context);
    if (phrase === "") return basePhrase;
    if (Util.isMac()) {
      phrase.replace("Ctrl+","Cmd+");
    }
    return phrase;
  }

  static a(basePhrase:string, context:string) : string {
    return T.data().analyze(basePhrase,context);
  }

  /**
   * check inner locale dictionaries and return locale that matches most.
   * if fallback language ("en" or "en-US") was chosen, returns "".
   * 
   * @param locale source locale string
   * @example  assumption: dictionaries for "ja", "th", "fr" exist
   * - matchLocale("en") // "" (same as fallback language)
   * - matchLocale("th") // "th"
   * - matchLocale("en-GB") // "" (not exact "en", but near)
   * - matchLocale("fr-CA") // "fr" (near "en")
   * - matchLocale("vi") // "" (no match : fallback was chosen)
   */
  static matchLocale(locale:string) : string {
    return T.data()._matchLocale(locale);
  }

  /**
   * get locale from browser APIs.
   * http://www1.kokusaika.jp/advisory/org/ja/js_point.html
   * https://qiita.com/shogo82148/items/548a6c9904eb19269f8c
   */
  static getBrowserLocale() : string {
    return (window.navigator.languages && window.navigator.languages[0]) 
    || window.navigator.language
  }

  /**
   * set locale for localization.
   * (if specified locale is not available, set fallback language (English).)
   * @param locale locale string to set
   */
  static setLocale(locale:string) : boolean {
    //const result = T.data().trySetLocale(locale);
    // return result;
    T.data().setInnerLocale(locale);
    return true;
  }

  static getLocales() : Array<Tuple2<string, string>> {
    var locales = ["en"];
    for (var locale of Object.keys(T.data()._dicts)) { locales.push(locale); }
    locales.sort();

    var result: Array<Tuple2<string, string>> = [];
    for (var locale of locales) {
      if (locale === "en") {
        result.push({ v1:"en" , v2:"English" });
        continue;
      }
      const d = T.data()._dicts[locale]; if (d === undefined) continue;
      const c = d["MyName"]; if (c === undefined) continue;
      const p = c["English"]; if (p === undefined) continue;
      result.push({ v1:locale , v2:p });
    }

    return result;
  }

  static getFails() : Array<Tuple2<string,string>> {
    return T.data().getAllFails();
  }

  // ========== ========== public instance methods  ========== ==========

  _matchLocale(locale:string) : string {
    // fallback languages
    if (locale === "en" || locale === "en-US") return "";

    if (this._dicts[locale] !== undefined) return locale;

    const indexHyphen = locale.indexOf("-");
    if (indexHyphen <= 0) return "";

    const locale2 = locale.substr(0,indexHyphen);
    if (this._dicts[locale2] !== undefined) return locale2;

    return "";
  }

  setInnerLocale(locale:string) {
    this._locale = this._matchLocale(locale);
    if (this._locale === "") {
      this._dict = null;
    } else {
      this._dict = this._dicts[this._locale];
    }
  }

  trySetLocale(locale:string) : boolean {
    // fallback languages
    if (locale === "en" || locale === "en-US") {
      this._locale = "";
      this._dict = null;
      return true;
    }

    const d = this._dicts[locale];
    if (d !== undefined && d !== null) {
      this._locale = locale;
      this._dict = d;
      return true;
    }

    const indexHyphen = locale.indexOf("-");
    if (indexHyphen <= 0) return false;
    const lang = locale.substr(0,indexHyphen);
    const d2 = this._dicts[lang];
    if (d2 !== undefined && d2 !== null) {
      this._locale = lang;
      this._dict = d2;
      return true;
    }
    return false;
  }

  analyze(basePhrase:string, context:string) : string {
    if (this._dict === null) return `dict===null. return [${basePhrase}]`;

    const phrases = this._dict[context];
    if (phrases === undefined) {
      return `dict[${context}] is undef.`;
    }

    const phrase = phrases[basePhrase];
    if (phrase === undefined) {
      return `phrases[${basePhrase}] is undef.`;
    }

    return `found [${phrase}]`;
  }

  getPhrase(basePhrase:string, context:string) : string {
    if (this._dict === null) return basePhrase;

    const phrases = this._dict[context];
    if (phrases === undefined) {
      this._failed.push({ v1: basePhrase, v2: context });
      return basePhrase;
    }

    const phrase = phrases[basePhrase];
    if (phrase === undefined) {
      this._failed.push({v1:basePhrase, v2:context});
      return basePhrase;
    }

    return phrase;
  }

  getAllFails() : Array<Tuple2<string,string>> {
    return this._failed;
  }

  // ========== ========== private  ========== ==========

  _locale = "";
  _failed : Array<Tuple2<string,string>> = [];

  _dicts : {[keyLocale:string]: {[keyCategory:string]: {[keyBase:string]: string}}} = {};
  _dict : {[keyCategory:string]: {[keyBase:string]: string}} | null = null;

  initDict() {
    this._dicts["ja"] = {
      "MyName" : {
        "English" : "日本語", // 必須：その言語による、その言語名。訳語ではない。
      },
      "General" : {
        "mekiku-web" : "web版mekiku",
        "OK" : "OK",
        "Cancel" : "キャンセル",
        "Error" : "エラー",
        "Warning" : "警告",
        "all files" : "全てのファイル",
        "file name" : "ファイル名",
        "Subtitler" : "入力者",
        "Viewer" : "閲覧者",
        "Number of Viewers" : "閲覧者数",
        "Error occured on file access.\nIf another application is using it, first quit it." : "ファイルへのアクセスでエラーが発生しました。\n他のプログラムでファイルを開いていたら、そちらを終了してください。",
        "Communication error." : "通信エラーです。",
        "System error." : "システムエラーです。",
        "Detail" : "詳細",
        "Internet Explorer and old version of Microsoft Edge are not supported." : "Internet Explorerおよび旧版のMicrosoft Edgeでは利用できません。",
      },
      "Input" : {
        "Input Window" : "入力ウインドウ",
      },
      "Chat" : {
        "Chat" : "連絡窓",
        "Start" : "カウントダウン開始",
        "Halt" : "カウントダウン停止",
        "Reset" : "残り時刻リセット",
        "Increase Timer By A Minute" : "タイマー1分延長",
        "Decrease Timer By A Minute" : "タイマー1分短縮",
        "0:00" : "0：00",
        "30 seconds to next turn." : "30秒前です。",
        " : " : "／",
        "It's new turn now." : "交代です。",
        "Timer started. Next " : "タイマーを開始しました。通知間隔 ",
        "Timer halted." : "タイマーを停止しました。",
        "login" : "新規ログイン", // real message : "(login : NAME_OF_MEMBER)"
        "New viewer" : "閲覧者がログイン",
        "logout" : "ログアウト", // real message : "(logout : NAME_OF_MEMBER)"
        "A viewer left" : "閲覧者が退室",
        "memo" : "メモ",
      },
      "Monitor" : {
        "Input Monitor" : "入力モニター",
        "name" : "名前",
        "current input window" : "入力中の内容",
        "connect" : "接続",
      },
      "PFT" : {
        "PFT (Pre-Formatted Text)" : "前ロール",
        "Open (Ctrl+O)" : "開く (Ctrl+O)",
        "Save As (Ctrl+S)" : "名前をつけて保存 (Ctrl+S)",
        "Next Comment (Ctrl+down)" : "次のコメント行へジャンプ (Ctrl+↓)",
        "Previous Comment (Ctrl+up)" : "前のコメント行へジャンプ (Ctrl+↑)",
        "Next Window (Ctrl+right)" : "次のウインドウへ移動 (Ctrl+→)",
        "Previous Window (Ctrl+left)" : "前のウインドウへ移動 (Ctrl+←)",
        "PFT files" : "前ロールファイル",
        "UTF-8 PFT files" : "UTF-8前ロールファイル",
        "Unicode PFT files" : "Unicode前ロールファイル",
        "text files" : "テキストファイル",
      },
      "PftMon" : {
        "PFT Monitor" : "前ロールモニター",
        "'s Pre-Formatted Text" : "の前ロールをモニター中",
      },
      "Fkey" : {
        "Shortcut" : "Fキー",
        "Parenthesize all" : "行全体をかっこでくくる",
        "Undo" : "入力部へ1回分引く(undo)",
        "(Not available)" : "（使用不能）",
      },
      "Log" : {
        "Log" : "ログ",
      },
      "Login" : {
        "Login" : "ログイン",
        "LAN card" : "LANカード",
        "Name" : "名前",
        "Channel" : "チャンネル",
        "Group" : "班",
        "The network port is occupied by other application.\nSelect another channel and login." : "同じネットワークポートが別のプログラムに使われています。\n別チャンネルを指定して再ログインしてみてください。",
        "Network error occurs. Make sure network connection." : "ネットワークエラーです。接続を再確認してください。",
        "(No Network Available)" : "（接続可能なLANがありません）",
        "Room" : "ルーム",
        "Viewer" : "利用者・閲覧者",
        "Subtitler" : "入力者（要約筆記者）",
        "Password" : "パスワード",
        "Login failed." : "ログインに失敗しました。",
        "No Room." : "ルームが存在しません。",
      },
      "Config" : {
        "Config" : "設定",
      },
      "Config|General" : {
        "Font Size" : "文字の大きさ",
        "Font Name" : "フォント名",
        "Font Color" : "文字色",
        "Bold" : "太字",
        "Background Color" : "背景色",
        "Show" : "表示する",
      },
      "Config|Misc" : {
        "General" : "全体的な設定",
        "Re-Login" : "LANカードを選んで（再）接続",
        "Full Screen" : "全画面化",
        "Select Language" : "言語の選択",
        "To make your choice effective, Restart mekiku-M." : "言語選択を有効にするには、mekiku-Mを再起動してください。",
        "Save main log" : "表示部のログを保存する",
        "Save chat log" : "連絡窓のログを保存する",
        "Startup Settings" : "起動時設定",
        "Keep Last Settings" : "前回終了時の設定を初期設定にする",
      },
      "Config|Main" : {
        "Main Display" : "メイン表示部",
        "Display style" : "表示形式",
        "Normal" : "通常表示",
        "Full Width" : "幅を最大化",
        "Full Window" : "ウインドウ内最大化",
        "Line Height" : "1行の高さ",
        "Scroll interval per line" : "1行のスクロール間隔",
        "msec" : "ミリ秒",
      },
      "Config|Input" : {
        "Parentheses on F8 press" : "F8押下時に囲む文字",
        "Parentheses on Shift+F8 press" : "Shift+F8押下時に囲む文字",
        "“" : "「",
        "”" : "」",
        "(" : "（",
        ")" : "）",
      },
      "Config|Chat" : {
        "Notification Color" : "通知時の背景色",
        "Play sound on timer-notifications" : "タイマー通知で音を出す",
      },
      "Config|Monitor" : {
        "Background Color On Loss" : "通信断の際の背景色",
      },
      "Config|PFT" : {
        "Background Color (Name)" : "前ロール名の背景色",
        "Background Color (Name of Other Panes)" : "非選択前ロール名の背景色",
        "Display All" : "全ウインドウを表示",
        "Current Window Width" : "選択中のウインドウ幅",
        "Same As Others (x1.0)" : "他と同じ（1.0倍）",
        "50% wider (x1.5)" : "他の5割増（1.5倍）",
        "double (x2.0)" : "他の2倍（2.0倍）",
        "triple (x3.0)" : "他の3倍（3.0倍）",
      },
      "Menu|Menu" : {
        "Menu" : "メニュー",
        "File" : "ファイル",
        "Edit" : "編集",
        "Re-Login" : "LANカードを選んで（再）接続",
        "Open Settings..." : "設定ファイルを開く...",
        "Save Settings As..." : "設定に名前をつけて保存...",
        "Config..." : "設定...",
        "Reset All Settings" : "設定を初期化",
        "Current As Default" : "現在の設定を初期設定にする",
        "Full Screen" : "全画面化",
        "Version..." : "バージョン...",
        "Exit" : "終了",
        "mekiku-M settings files" : "mekiku-M設定ファイル",
        "Undo" : "元に戻す",
        "Cut" : "切り取り",
        "Copy" : "コピー",
        "Paste" : "貼り付け",
        "Select All" : "すべて選択",
      },
    };

    this._dicts["th"] = {
      "MyName" : {
        "English" : "ภาษาไทย",
      },
      "General" : {
        // "mekiku-web" : "",
        "OK" : "OK",
        "Cancel" : "ยกเลิก",
        "Error" : "ข้อผิดพลาด",
        "Warning" : "เตือน",
        "all files" : "ไฟล์ทั้งหมด",
        // "file name" : "",
        // "Subtitler" : "",
        // "Viewer" : "",
        // "Number of Viewers" : "",
        "Error occured on file access.\nIf another application is using it, first quit it." : "เกิดข้อผิดพลาดในการอ่านไฟล์\nถ้าแอพพลิเคชั่นอื่นกำลังใช้ไฟล์นี้\nให้ปิดไฟล์นี้ก่อน",
        // "Communication error." : "",
        // "System error." : "",
        // "Detail" : "",
        // "Internet Explorer and old version of Microsoft Edge are not supported." : "",
      },
      "Input" : {
        "Input Window" : "หน้าต่างอินพุท",
      },
      "Chat" : {
        "Chat" : "แช็ท",
        "Start" : "เริ่ม",
        "Halt" : "หยุด",
        "Reset" : "ตั้งใหม่",
        "Increase Timer By A Minute" : "เพิ่มเวลาเป็น A นาที",
        "Decrease Timer By A Minute" : "ลดเวลาเป็น A นาที",
        "0:00" : "0:00",
        "30 seconds to next turn." : "อีกสามสิบวิ.จะเริ่มใหม่",
        " : " : " : ",
        "It's new turn now." : "เริ่มใหม่",
        "Timer started. Next " : "ไทเมอร์เริ่ม ถัดไป ",
        "Timer halted." : "ไทเมอร์หยุด ",
        // "login" : "", // real message : "(login : NAME_OF_MEMBER)"
        // "New viewer" : "",
        // "logout" : "", // real message : "(logout : NAME_OF_MEMBER)"
        // "A viewer left" : "",
        // "memo" : "",
      },
      "Monitor" : {
        "Input Monitor" : "มอนิเตอร์อินพุท",
        "name" : "ชื่อ",
        "current input window" : "หน้าต่างที่กำลังอินพุท",
        "connect" : "เชื่อมต่อ",
      },
      "PFT" : {
        "PFT (Pre-Formatted Text)" : "พรีฟอร์แม็ทเท็กซ์",
        "Open... (Ctrl+O)" : "เปิด... (Ctrl+O)",
        "Save As (Ctrl+S)" : "บันทึกเป็น... (Ctrl+S)",
        "Next Comment (Ctrl+down)" : "คอมเมนต์ถัดไป (Ctrl+down)",
        "Previous Comment (Ctrl+up)" : "คอมเมนต์ก่อนหน้า (Ctrl+up)",
        "Next Window (Ctrl+right)" : "หน้าต่างถัดไป (Ctrl+right)",
        "Previous Window (Ctrl+left)" : "หน้าต่างก่อนหน้า (Ctrl+left)",
        "PFT files" : "พีเอฟทีไฟล์ ",
        "UTF-8 PFT files" : "UTF-8 พีเอฟทีไฟล์ ",
        "Unicode PFT files" : "ยูนิโค้ด พีเอฟทีไฟล์ ",
        "text files" : "เท็กซ์ไฟล์",
      },
      "PftMon" : {
        "PFT Monitor" : "มอนิเตอร์พีเอฟที",
        "'s Pre-Formatted Text" : "พรีฟอร์แม็ทเท็กซ์",
      },
      "Fkey" : {
        "Shortcut" : "ปุ่มลัด",
        "Parenthesize all" : "วงเล็บทั้งหมด ",
        "Undo" : "กลับที่เดิม",
        "(Not available)" : "(ไม่สามารถใช้ได้)",
      },
      "Log" : {
        "Log" : "ล็อก",
      },
      "Login" : {
        "Login" : "ล็อกอิน ",
        "LAN card" : "แลนการ์ด",
        "Name" : "ชื่อ",
        "Channel" : "ช่องทาง",
        "Group" : "กลุ่ม",
        "The network port is occupied by other application.\nSelect another channel and login." : "เน็ทเวิร์คพอร์ต\nมีแอพพลิเคชั่นอื่นใช้อยู่\nเลือกช่องทางอื่นแล้ว\nล็อกอิน",
        "Network error occurs. Make sure network connection." : "เกิดข้อผิดพลาดจากเน็ทเวิร์ค \nตรวจสอบการเชื่อมต่อ\nเน็ทเวิร์ค",
        "(No Network Available)" : "(ไม่มีเน็ทเวิร์ค)",
        // "Room" : "",
        // "Viewer" : "",
        // "Subtitler" : "",
        // "Password" : "",
        // "Login failed." : "",
        // "No Room." : "",
      },
      "Config" : {
        "Config" : "การตั้งค่า ",
      },
      "Config|General" : {
        "Font Size" : "ขนาดฟอนต์",
        "Font Name" : "ฟ้อนต์",
        "Font Color" : "สีฟ้อนต์",
        "Bold" : "ตัวหนา",
        "Background Color" : "สีพื้นหลัง",
        "Show" : "แสดง",
      },
      "Config|Misc" : {
        "General" : "การติดตั้งทั้งหมด",
        "Re-Login" : "ล็อกอินใหม่",
        "Full Screen" : "เต็มจอภาพ",
        "Select Language" : "เลือกภาษา",
        "To make your choice effective, Restart mekiku-M." : "เพื่อให้ได้งานตามที่คุณ เลือก, เริ่มเปิด mekiku-M อีกครั้ง",
        "Save main log" : "บันทึก (ล็อกหน้าต่างหลัก)",
        "Save chat log" : "บันทึก (ล็อกหน้าต่างแช็ท)",
        "Startup Settings" : "ตั้งค่าเริ่มต้น",
        "Keep Last Settings" : "ตั้งเป็นค่าล่าสุด",
      },
      "Config|Main" : {
        "Main Display" : "จอแสดงผลหลัก",
        "Display style" : "การแสดงรูปแบบ",
        "Normal" : "ปกติ",
        "Full Width" : "ความกว้างเต็มจอ",
        "Full Window" : "เต็มหน้าต่าง",
        "Line Height" : "ความสูงบรรทัด",
        "Scroll interval per line" : "ระยะห่างของสกรอล ต่อบรรทัด",
        "msec" : "มิลลิเซ็คเคิ่น",
      },
      "Config|Input" : {
        "Parentheses on F8 press" : "ใส่วงเล็บโดยกด F8",
        "Parentheses on Shift+F8 press" : "Shift+F8",
        "“" : "\"\"",
        "”" : "\"\"",
        "(" : "(",
        ")" : ")",
      },
      "Config|Chat" : {
        "Notification Color" : "สีเตือน",
        // "Play sound on timer-notifications" : "",
      },
      "Config|Monitor" : {
        "Background Color On Loss" : "สีพื้นหลัง  เปิดและตัด",
      },
      "Config|PFT" : {
        "Background Color (Name)" : "สีพื้นหลัง(ชื่อไฟล์)",
        "Background Color (Name of Other Panes)" : "สีพื้นหลัง(ชื่อไฟล์อื่น)",
        "Display All" : "ดิสเพลย์ทั้งหมด",
        "Current Window Width" : "ความกว้างหน้าต่างปัจจุบัน",
        "Same As Others (x1.0)" : "เหมือนอื่นๆ",
        "50% wider (x1.5)" : "กว้างขึ้น 1.5 เท่า",
        "double (x2.0)" : "2 เท่า",
        "triple (x3.0)" : "3 เท่า",
      },
      "Menu|Menu" : {
        "Menu" : "เมนู",
        "File" : "ไฟล์",
        "Edit" : "การแก้ไข",
        "Re-Login" : "ล็อกอินใหม่",
        "Open Settings..." : "เปิดไฟล์ตั้งค่าที่เซฟไว้ ...",
        "Save Settings As..." : "บันทึกค่าที่ตั้งไว้เป็น ...",
        "Config..." : "การตั้งค่า ...",
        "Reset All Settings" : "ตั้งค่าใหม่หมด",
        "Current As Default" : "ตั้งค่าปัจจุบันเป็นค่าเริ่มต้น",
        "Full Screen" : "เต็มจอภาพ",
        "Version..." : "เวอร์ชั่น ...",
        "Exit" : "ออก",
        "mekiku-M settings files" : "ไฟล์ตั้งค่า mekiku-M",
        "Undo" : "เลิกทำ",
        "Cut" : "ตัด",
        "Copy" : "คัดลอก",
        "Paste" : "วาง",
        "Select All" : "เลือกทั้งหมด",
      },
    };
  }

}
