import { T } from "./t";
import { AppConfig } from "./appConfig";
import { UtilDom } from "./utilDom";
import { Tuple2 } from "./util";
import Log from "./log";
import TmpConfig from "./TmpConfig";

export class DialogConfig {
  private readonly container = document.getElementById('config-container') as HTMLDivElement
  private readonly pane = document.getElementById("config") as HTMLDivElement;
  private readonly GeneralTab = document.getElementById('menu-general') as HTMLInputElement
  private readonly paren1 = document.getElementById("config-input_parentheses_1") as HTMLInputElement;
  private readonly paren2 = document.getElementById("config-input_parentheses_2") as HTMLInputElement;
  private readonly parenShift1 = document.getElementById("config-input_parenthesesShift_1") as HTMLInputElement;
  private readonly parenShift2 = document.getElementById("config-input_parenthesesShift_2") as HTMLInputElement;
  private readonly selectLocale = document.getElementById("config-select-locale") as HTMLSelectElement;
  private readonly buttonOK = document.getElementById('config-button-ok') as HTMLButtonElement
  private readonly buttonCancel = document.getElementById('config-button-cancel') as HTMLButtonElement
  private readonly buttonOpen = document.getElementById('config-open') as HTMLButtonElement
  private readonly buttonSave = document.getElementById('config-save') as HTMLButtonElement
  private readonly buttonReset = document.getElementById('config-reset') as HTMLButtonElement
  private readonly zoomConfig = document.getElementById('config-general-zoom') as HTMLDivElement
  private readonly zoomApiKey = document.getElementById('config-general-zoom-api') as HTMLInputElement
  private locales: Array<Tuple2<string, string>> = [];

  private paneNames:Array<string> = [];
  public getChangedPanes() : Array<string> {
    return this.paneNames;
  }
  private doOnSet: ((names:Array<string>) => void) = (n) => {};
  public setOnSet(callback:((names:Array<string>) => void)) {
    this.doOnSet = (names) => callback(names);
  }

  onOpenClicked:() => void = () => {}
  onSaveClicked:() => void = () => {}
  onResetClicked:() => void = () => {}

  constructor() {
    this.setTitle(T.t("Config", "Config"))
    
    this.buttonOK.addEventListener('click', ev => {
      this.dialogToConfig()
      this.hideDialog()
      this.doOnSet(this.paneNames)
    })
    this.buttonCancel.addEventListener('click', ev => {
      this.hideDialog()
    })
    this.buttonOpen.addEventListener('click', ev => {
      this.onOpenClicked()
    })
    this.buttonSave.addEventListener('click', ev => {
      this.dialogToConfig()
      this.onSaveClicked()
    })
    this.buttonReset.addEventListener('click', ev => {
      this.onResetClicked()
    })
  } // end of constructor

  private setTitle(title:string) {
    // nop
  }

  showDialog() {
    if (this.locales.length < 1) {
      this.locales = T.getLocales();
      for (var locale of this.locales) {
        UtilDom.addSelectOption(this.selectLocale, locale.v2, locale.v1);
      }
    }
    this.configToDialog();

    if (TmpConfig.useServer()) {
      UtilDom.displayOn(this.zoomConfig)
      if (this.zoomApiKey.value.length > 0) {
        this.zoomApiKey.focus() // avoid strange display for very long text
      }
    } else {
      UtilDom.displayOff(this.zoomConfig)
    }

    this.GeneralTab.click()
    UtilDom.show(this.container)
  }

  hideDialog() {
    UtilDom.hide(this.container)
  }

  configToDialog() {
    // search input elements which id starts "config_", then apply config value for text/color/checkbox
    const elms = this.pane.getElementsByTagName("input");
    const len = elms.length;
    for (var i=0 ; i<len ; i++) {
      const elm = elms[i];
      if (!elm.id.startsWith("config_")) continue;
      const key = elm.id.substr(7);
      if (AppConfig.data[key] != undefined) {
        if (elm.type === "text" || elm.type === "number") {
          elms[i].value = AppConfig.data[key].toString();
        } else if (elm.type === "color") {
          elms[i].value = AppConfig.data[key].toString();
        } else if (elm.type === "checkbox") {
          if (AppConfig.data[key] === true) {
            elms[i].checked = true;
          } else if (AppConfig.data[key] === false) {
            elms[i].checked = false;
          } else {
            Log.w('Warning',`configToDialog checkbox item --- not boolean [${elm.id}]`)
          }
        } else {
          Log.w('Warning',`configToDialog type not found id:${key}`);
        }
      }
      else if (AppConfig.data[elm.name] != undefined) {
        const c = AppConfig.data[elm.name];
        if (elm.type === "radio") {
          var isMatch = false;
          switch (typeof c) {
            case "string":
              isMatch = c === elm.value;
              break;
            case "number":
              isMatch = c === Number(elm.value);
              break;
            case "boolean":
              isMatch = c === (elm.value.toLowerCase() === "true");
              break;
          }
          if (isMatch) {
            elms[i].checked = true;
          }
        } else {
          Log.w('Warning',`configToDialog type not found name:${elm.name} (id:${elm.id})`);
        }
      } else {
        Log.w('Warning',`configToDialog assign failed id:${elm.id} name:${elm.name}`);
      }
    }

    // special items
    this.paren1.value = AppConfig.data.getParentheses1();
    this.paren2.value = AppConfig.data.getParentheses2();
    this.parenShift1.value = AppConfig.data.getParenthesesShift1();
    this.parenShift2.value = AppConfig.data.getParenthesesShift2();
    this.zoomApiKey.value = TmpConfig.useServer() ? TmpConfig.getZoomUrl() : ''

    // initialize selection of locale select-box
    var localeIx = 0;
    const current = T.matchLocale(AppConfig.data.getLocale());
    for (var ix=0; ix<this.locales.length ; ix++) {
      if (this.locales[ix].v1 === current) {
        localeIx = ix;
        break;
      }
    }
    this.selectLocale.selectedIndex = localeIx;
  }

  dialogToConfig() {
    const elms = this.pane.getElementsByTagName("input");
    const len = elms.length;
    this.paneNames = [];

    for (var i=0 ; i<len ; i++) {
      if (!elms[i].id.startsWith("config_")) continue;
      var key = "";
      if (elms[i].type === "radio") {
        if (elms[i].checked) {
          key = elms[i].name; // For radio, there're many ids for single config item. Instead, name matches the item's key.
        } else {
          continue; // ignore non-checked radiobox
        }
      } else {
        key = elms[i].id.substr(7);
      }
      if (key !== "" && AppConfig.data[key] === undefined) {
        Log.w('Warning',`dialogToConfig not found : key=${key} element:${elms[i].id}`);
        continue;
      }

      const category = key.substring(0,key.indexOf("_"));
      var changed = false;

      if (typeof AppConfig.data[key] === "string" || AppConfig.data[key] instanceof String) {
        if (AppConfig.data[key] !== elms[i].value) {
          AppConfig.data[key] = elms[i].value;
          changed = true;
        }
      } else if (typeof AppConfig.data[key] === "number" || AppConfig.data[key] instanceof Number) {
        const n = Number(elms[i].value);
        if (n === undefined || n === null) continue;
        if (AppConfig.data[key] !== n) {
          AppConfig.data[key] = n;
          changed = true;
        }
      } else if (typeof AppConfig.data[key] === "boolean" || AppConfig.data[key] instanceof Boolean) {
        if (elms[i].type === "checkbox") {
          if (AppConfig.data[key] !== elms[i].checked) {
            AppConfig.data[key] = elms[i].checked;
            changed = true;
          }
        } else {
          Log.w('Warning',`config [${key}] matched non-checkbox input (id=${elms[i].id})`);
        }
      } else {
        Log.w('Warning',`configToDialog assign failed : [${elms[i].id}]`);
      }

      if (changed && !this.paneNames.includes(category)) {
        this.paneNames.push(category);
      }
    }

    // special items

    var rParen = false;
    if (AppConfig.data.setParentheses1(this.paren1.value)) { rParen = true; }
    if (AppConfig.data.setParentheses2(this.paren2.value)) { rParen = true; }
    if (AppConfig.data.setParenthesesShift1(this.parenShift1.value)) { rParen = true; }
    if (AppConfig.data.setParenthesesShift2(this.parenShift2.value)) { rParen = true; }
    if (rParen && !this.paneNames.includes("input")) { this.paneNames.push("input"); }
    const zoomKey = this.zoomApiKey.value
    if (TmpConfig.useServer() && TmpConfig.isZoomUrlValid(zoomKey)) {
      TmpConfig.setZoomUrl(zoomKey)
      this.paneNames.push("zoom")
    }

    const current = T.matchLocale(AppConfig.data.getLocale());
    const selectedLocale = this.locales[this.selectLocale.selectedIndex].v1;
    if (selectedLocale !== current) {
      AppConfig.data.setLocale(selectedLocale);
      this.paneNames.push("misc")
    }
  }
}
