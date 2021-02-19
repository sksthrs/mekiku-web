import { AppConfig } from "./appConfig";
import { T } from "./t";
import { Pane } from "./pane";
import { Util } from "./util";
import { UtilDom } from "./utilDom";
import { Content, ContentToSend } from "./content";

export class PanePftMon implements Pane {
  getName() { return "PanePftMon"; }
  
  private readonly pane = document.getElementById("pftMon") as HTMLDivElement;
  private readonly titlebar = document.getElementById('pftMon-title') as HTMLDivElement
  private readonly logAbove = document.getElementById("pftMon-above") as HTMLDivElement;
  private readonly logText = document.getElementById("pftMon-log-text") as HTMLTextAreaElement;
  private readonly logState = document.getElementById("pftMon-state") as HTMLDivElement;
  private readonly logStateText = document.getElementById("pftMon-state-text") as HTMLSpanElement;
  private readonly container = document.getElementById("pftMon-log") as HTMLDivElement;
  private isOnShow:boolean = false;
  /** temporary "above" text storage for IPtalk (IPtalk sends each above lines and each below lines), so we need it */
  private aboveText = "";
  private belowText = "";

  constructor() {
    this.localize()

    // PftMon does not have editable element, but "Ctrl/Cmd+A" should be "Select-All".
    const parent = this.pane.parentElement;
    if (parent != null) {
      parent.addEventListener("keydown", (ev) => { this.selectAllWhenCtrlA(ev); });
    }

    this.configToScreen();
  }

  private selectAllWhenCtrlA(ev: KeyboardEvent) {
    if (ev.keyCode === UtilDom.KEY_A && UtilDom.isCommandOrControlPressed(ev)) { // a key
      this.logText.focus();
      this.logText.select();
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }

  update(above:string, below:string, data:ContentToSend) {
    this.updateAbove(above);
    this.updateBoth(above, below);
    this.updateState(data.senderName);
  }

  private updateAbove(str:string) {
    // if above ends \n, div ignores its height.
    const strWithLastLine = (str.endsWith("\n")) ? str+" " : str;
    this.logAbove.textContent = strWithLastLine;
  }

  private updateBoth(strA:string, strB:string) {
    if (strA.length > 0) {
      this.logText.textContent = strA + "\n" + strB;
    } else {
      this.logText.textContent = strB;
    }
  }

  private updateState(str?:string) {
    if (str) {
      this.logStateText.textContent = str + T.t("'s Pre-Formatted Text", "PftMon");
    } else {
      this.logStateText.textContent = T.t("'s Pre-Formatted Text", "PftMon");
    }
  }

  private applyStyle(el:HTMLElement) {
    el.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.pftMon_font_familyName);
    el.style.fontSize = AppConfig.data.pftMon_font_size + "pt";
    el.style.fontWeight = AppConfig.data.pftMon_font_isBold ? "bold" : "normal";
    el.style.color = AppConfig.data.pftMon_foreColor;
    el.style.backgroundColor = AppConfig.data.pftMon_backColor;
  }

  private applyFont(el:HTMLElement) {
    el.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.pftMon_font_familyName);
    el.style.fontSize = AppConfig.data.pftMon_font_size + "pt";
    el.style.fontWeight = AppConfig.data.pftMon_font_isBold ? "bold" : "normal";
  }

  private configToScreen() {
    // autoOpen: AppConfig.data.pftMon_isOpen,

    this.applyFont(this.logAbove);
    this.applyStyle(this.logText);
    this.applyStyle(this.container);
    this.applyStyle(this.logState);
    this.applyStyle(this.logStateText);
  }

  updateConfig() {
    this.configToScreen();
  }

  localize() {
    this.setTitle(T.t("PFT Monitor","PftMon"))
  }

  private setTitle(title:string) {
    this.titlebar.textContent = title
  }

  setPaneToConfig() {
  }

  focus() {
    this.logText.focus()
  }

  toggle(): void {
    if (UtilDom.isDisplayed(this.pane)) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    UtilDom.displayOn(this.pane, "flex")
  }

  hide(): void {
    UtilDom.displayOff(this.pane)
  }

}
