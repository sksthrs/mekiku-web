import { T } from "./t";
import { AppConfig } from "./appConfig";
import { UtilDom } from "./utilDom";
import { Tuple2, Util } from "./util";
import Log from "./log";

export class DialogConfigViewer {
  private readonly container = document.getElementById('config-view-container') as HTMLDivElement
  private readonly pane = document.getElementById("config-view") as HTMLDivElement;
  private readonly inputFontSize = document.getElementById('config_main_v_font_size') as HTMLInputElement
  private readonly buttonFontSmaller = document.getElementById('config-view-font-size-down') as HTMLButtonElement
  private readonly buttonFontLarger = document.getElementById('config-view-font-size-up') as HTMLButtonElement
  private readonly selectLocale = document.getElementById("config-view-select-locale") as HTMLSelectElement;
  private readonly buttonReset = document.getElementById('config-view-reset') as HTMLButtonElement
  private readonly buttonOK = document.getElementById('config-view-button-ok') as HTMLButtonElement
  private readonly buttonCancel = document.getElementById('config-view-button-cancel') as HTMLButtonElement
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
    
    this.buttonFontSmaller.addEventListener('click', ev => {
      this.inputFontSize.stepDown()
    })
    this.buttonFontLarger.addEventListener('click', ev => {
      this.inputFontSize.stepUp()
    })
    this.buttonOK.addEventListener('click', ev => {
      this.dialogToConfig()
      this.hideDialog()
      this.doOnSet(this.paneNames)
    })
    this.buttonCancel.addEventListener('click', ev => {
      this.hideDialog()
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

    const current = T.matchLocale(AppConfig.data.getLocale());
    const selectedLocale = this.locales[this.selectLocale.selectedIndex].v1;
    if (selectedLocale !== current) {
      AppConfig.data.setLocale(selectedLocale);
      this.paneNames.push("misc")
    }
  }
}
