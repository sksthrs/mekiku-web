import { AppConfig } from "./appConfig";
import { Tuple2, Util } from "./util";
import { Pane } from "./pane";
import { T } from "./t";
import { UtilDom } from "./utilDom";

export class PanePft implements Pane {
  getName() { return "PanePft"; }
  
  private readonly MAX_LINES_GROSS = 20;
  private readonly NEWLINE = "\n";
  private readonly GROSS_DELIMITER = "`@" + this.NEWLINE;
  private readonly COMMENT_IDENTIFIER = "<-";
  private readonly COMMENT_IPTALK_ID = "<--";

  private paneIdsVjs = ["pft1", "pft2", "pft3"];
  private panes: Array<HTMLDivElement>;
  private textIdsVjs = ["pft1-text", "pft2-text", "pft3-text"];
  private texts: Array<HTMLTextAreaElement>;
  private nameIdsVjs = ["pft1-name", "pft2-name", "pft3-name"];
  private names: Array<HTMLDivElement>;
  private nameTextIdsVjs = ["pft1-name-text", "pft2-name-text", "pft3-name-text"];
  private nameTexts: Array<HTMLSpanElement>;
  private paths: Array<string> = ["", "", ""];
  private encodings: Array<string> = ["utf-8", "utf-8", "utf-8"];
  private lastUsed: number = 0;
  private fileTarget: number = -1; // pft index to set opened/saved text (it is necessary because file handling is asynchronous)

  private readonly RESPONSE_KEYS = ["Home", "End", "PageUp", "PageDown", "Shift"];

  private readonly pane = document.getElementById('pft') as HTMLDivElement
  private readonly titlebar = document.getElementById('pft-title') as HTMLDivElement
  private buttonOpenFile = document.getElementById("pft-open-file") as HTMLButtonElement;
  private buttonSaveFile = document.getElementById("pft-save-file") as HTMLButtonElement;
  private buttonNextComment = document.getElementById("pft-next-comment") as HTMLButtonElement;
  private buttonPreviousComment = document.getElementById("pft-previous-comment") as HTMLButtonElement;
  private buttonNextPft = document.getElementById("pft-next-pft") as HTMLButtonElement;
  private buttonPreviousPft = document.getElementById("pft-previous-pft") as HTMLButtonElement;

  private isOnShow:boolean = false;

  private getFkey: (ix:number) => string = (ix) => { return ""; }
  setGetFkey(callback: (ix:number) => string) { this.getFkey = (ix) => callback(ix); }

  setOnSend(callback: (text:string) => void) { this.doOnSend = (t) => callback(t); }
  private doOnSend: (text:string) => void = (t) => {};
  private onSend(text:string) { this.doOnSend(text); }

  setOnGross(callback: (lines:Array<string>) => void) { this.doOnGross = (t) => callback(t); }
  private doOnGross: (lines:Array<string>) => void = (t) => {};
  private onGross(lines:Array<string>) { this.doOnGross(lines); }

  setOnChange(callback: (ta:Array<string>, tb:Array<string>) => void) { this.doOnChange = (ta,tb) => callback(ta,tb); }
  private doOnChange: (ta:Array<string>, tb:Array<string>) => void = (ta,tb) => {};
  private onChange(ta:Array<string>, tb:Array<string>) { this.doOnChange(ta,tb); }

  setOnOpenCommand(callback: (i:number) => void) { this.doOnOpenCommand = (i) => callback(i); }
  private doOnOpenCommand: (i:number) => void = (i) => {};
  private onOpenCommand(i:number) {
    this.fileTarget = i;
    this.doOnOpenCommand(i);
  }

  setOnSaveCommand(callback: (d:string, n:string) => void) { this.doOnSaveCommand = (d,n) => callback(d,n); }
  private doOnSaveCommand: (d:string,n:string) => void = (d,n) => {};
  private onSaveCommand(i:number) {
    const text = this.texts[i].value || ""
    this.fileTarget = i;
    const name = this.nameTexts[i].textContent || ""
    this.doOnSaveCommand(text, name);
  }

  NotifyPftOpened(text:string, file:File) {
    this.nameTexts[this.fileTarget].textContent = file.name
    this.paths[this.fileTarget] = ""
    this.encodings[this.fileTarget] = "UTF-8" // currently only UTF-8 is supported
    var area = this.texts[this.fileTarget]
    this.fileTarget = -1; // reset
    area.value = text;
    area.blur();
    area.setSelectionRange(0, 0);
    area.focus();
  }

  NotifyPftSaved(name:string) {
    this.nameTexts[this.fileTarget].textContent = name
    this.fileTarget = -1; // reset
  }

  constructor() {
    this.localize()

    this.panes = new Array();
    this.texts = new Array();
    this.names = new Array();
    this.nameTexts = new Array();

    for(var i=0 ; i < this.textIdsVjs.length ; i++) {
      const paneDiv = document.getElementById(this.paneIdsVjs[i]) as HTMLDivElement;
      this.panes.push(paneDiv);

      const nameDiv = document.getElementById(this.nameIdsVjs[i]) as HTMLDivElement;
      this.names.push(nameDiv);
      const nameTextSpan = document.getElementById(this.nameTextIdsVjs[i]) as HTMLSpanElement;
      this.nameTexts.push(nameTextSpan);

      const textArea = document.getElementById(this.textIdsVjs[i]) as HTMLTextAreaElement;
      this.texts.push(textArea);
      textArea.addEventListener("keydown", (e) => {
        const iFkey = UtilDom.getCtrlOrFKeyNumber(e) - 1;
        if (iFkey === 0) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (e.shiftKey) {
            const lines = this.getGrossLinesAndGoNext(textArea);
            this.onGross(lines);
          } else {
            const line = this.getCurrentLine(textArea);
            this.goNextLine(textArea);
            if (!line.startsWith("<-")) {
              this.onSend(line);
            }
          }
          const texts = this.getMonitorLines(textArea);
          this.onChange(texts.v1, texts.v2);
        }
        else if (iFkey > 0 && iFkey < 7) {
          const sFkey = this.getFkey(iFkey);
          if (sFkey.length > 0) { this.insertText(textArea,sFkey); }
        }
        else if (iFkey === 7) {
          if (e.shiftKey) {
            this.parenthesizeShift(textArea);
          } else {
            this.parenthesize(textArea);
          }
        }

        if (UtilDom.isCommandOrControlPressed(e)) {
          if (e.keyCode === UtilDom.KEY_ARROW_DOWN) { // ArrowDown key
            this.doOnGoNextComment(textArea);
            e.preventDefault();
          }
          else if (e.keyCode === UtilDom.KEY_ARROW_UP) { // ArrowUp key
            this.doOnGoPreviousComment(textArea);
            e.preventDefault();
          }
          else if (e.keyCode === UtilDom.KEY_ARROW_LEFT) { // ArrowLeft
            this.doOnGoPreviousPft(textArea);
            e.preventDefault();
          }
          else if (e.keyCode === UtilDom.KEY_ARROW_RIGHT) { // ArrowRight
            this.doOnGoNextPft(textArea);
            e.preventDefault();
          }
          else if (e.keyCode === UtilDom.KEY_O) { // o key
            e.preventDefault();
            e.stopImmediatePropagation();
            this.onOpenCommand(this.lastUsed);
          }
          else if (e.keyCode === UtilDom.KEY_S) { // s key
            e.preventDefault();
            e.stopImmediatePropagation();
            this.onSaveCommand(this.lastUsed);
          }
          else if (e.keyCode === UtilDom.KEY_K) { // k key
            e.preventDefault();
            e.stopImmediatePropagation();
            this.toggleComment(textArea);
          }
          else if (e.keyCode === UtilDom.KEY_P) { // p key
            e.preventDefault();
            e.stopImmediatePropagation();
            this.insertGrossDelimiter(textArea);
          }
        }
      });
      textArea.addEventListener("focus", (ev) => {
        this.lastUsed = parseInt(textArea.id.replace(/[^0-9]/g,""),10) - 1;
        this.updateAllPftSizes();
      });
      textArea.addEventListener("input", (e) => {
        const texts = this.getMonitorLines(textArea);
        this.onChange(texts.v1, texts.v2);
      });
      textArea.addEventListener("keyup",(e) => {
        if (e.key.includes("Arrow") || this.RESPONSE_KEYS.includes(e.key)) {
          const texts = this.getMonitorLines(textArea);
          this.onChange(texts.v1, texts.v2);
        }
      });
    }

    // UtilJQuery.setPositionAndWidth(this.dialog, AppConfig.data.getPftBounds());
    this.configToScreen();
    this.setEventListeners();
  }

  private setEventListeners() {

    this.buttonNextComment.addEventListener("click", (mouseEvent) => {
      this.doOnGoNextComment(this.getCurrentPane());
    });
    this.buttonPreviousComment.addEventListener("click", (mouseEvent) => {
      this.doOnGoPreviousComment(this.getCurrentPane());
    });
    this.buttonNextPft.addEventListener("click", (mouseEvent) => {
      this.doOnGoNextPft(this.getCurrentPane());
    });
    this.buttonPreviousPft.addEventListener("click", (mouseEvent) => {
      this.doOnGoPreviousPft(this.getCurrentPane());
    });

    this.buttonOpenFile.addEventListener("click", (e) => {
      this.onOpenCommand(this.lastUsed);
    });
    this.buttonSaveFile.addEventListener("click", (e) => {
      this.onSaveCommand(this.lastUsed);
    });

  }

  // ========== ========== methods for GUI operations ========== ==========

  private getCurrentPane(): HTMLTextAreaElement {
    return this.texts[this.lastUsed];
  }

  private getCurrentLine(area: HTMLTextAreaElement): string {
    const texts = this.splitText(area);
    return texts.v2[0];
  }

  private insertText(area: HTMLTextAreaElement, text:string) {
    const pos = area.selectionStart;
    const before = area.value.substr(0,pos);
    const after = area.value.substr(pos);
    const newPos = pos + text.length;
    area.value = before + text + after;
    area.blur();
    area.setSelectionRange(newPos,newPos);
    area.focus();
  }

  private parenthesize(area:HTMLTextAreaElement) {
    const pos = area.selectionStart;
    const texts = this.splitText(area);
    const currentLine = texts.v2.length > 0 ? texts.v2[0] : "";
    const newLine = AppConfig.data.getParentheses1() + currentLine + AppConfig.data.getParentheses2();
    const afterLines = texts.v2.length > 1 ? texts.v2.slice(1) : [];
    const newPos = pos + AppConfig.data.input_parentheses_1.length;
    area.value = texts.v1.join("\n") + "\n" + newLine + "\n" + afterLines.join("\n");
    area.blur();
    area.setSelectionRange(newPos,newPos);
    area.focus();
  }

  private parenthesizeShift(area:HTMLTextAreaElement) {
    const pos = area.selectionStart;
    const texts = this.splitText(area);
    const currentLine = texts.v2.length > 0 ? texts.v2[0] : "";
    const newLine = AppConfig.data.getParenthesesShift1() + currentLine + AppConfig.data.getParenthesesShift2();
    const afterLines = texts.v2.length > 1 ? texts.v2.slice(1) : [];
    const newPos = pos + AppConfig.data.input_parentheses_1.length;
    area.value = texts.v1.join("\n") + "\n" + newLine + "\n" + afterLines.join("\n");
    area.blur();
    area.setSelectionRange(newPos,newPos);
    area.focus();
  }

  private toggleComment(area:HTMLTextAreaElement) {
    const pos = area.selectionStart;
    const texts = this.splitText(area);
    const currentLine = texts.v2.length > 0 ? texts.v2[0] : "";
    const posTopOfCurrentLine = Util.arraySum(texts.v1, (line) => line.length);

    var newLine: string = "";
    var newPos: number = pos;
    if (currentLine.startsWith(this.COMMENT_IPTALK_ID)) {
      const id_length = this.COMMENT_IPTALK_ID.length;
      if (currentLine.length > id_length) {
        newLine = currentLine.substring(id_length);
        newPos = Math.max(pos - id_length, posTopOfCurrentLine);
      }
    }
    else if (currentLine.startsWith(this.COMMENT_IDENTIFIER)) {
      const id_length = this.COMMENT_IDENTIFIER.length;
      if (currentLine.length > id_length) {
        newLine = currentLine.substring(id_length);
        newPos = Math.max(pos - id_length, posTopOfCurrentLine);
      }
    }
    else {
      const id_length = this.COMMENT_IDENTIFIER.length;
      newLine = this.COMMENT_IDENTIFIER + currentLine;
      newPos = pos + id_length;
    }
    const afterLines = texts.v2.length > 1 ? texts.v2.slice(1) : [];
    var beforeLines = texts.v1.join("\n");
    if (beforeLines.length > 0) {
      beforeLines += "\n";
    }
    area.value = beforeLines + newLine + "\n" + afterLines.join("\n");
    area.blur();
    area.setSelectionRange(newPos,newPos);
    area.focus();
  }

  private insertGrossDelimiter(area:HTMLTextAreaElement) {
    const pos = area.selectionStart;
    const texts = this.splitText(area);
    const newPos = pos + this.GROSS_DELIMITER.length;
    var beforeLines = texts.v1.join("\n");
    if (beforeLines.length > 0) {
      beforeLines += "\n";
    }
    area.value = beforeLines + this.GROSS_DELIMITER + texts.v2.join("\n");
    area.blur();
    area.setSelectionRange(newPos,newPos);
    area.focus();
  }

  private getMonitorLines(area: HTMLTextAreaElement): Tuple2<Array<string>, Array<string>> {
    const texts = this.splitText(area);
    const textA = (texts.v1.length >= 4) ? texts.v1.slice(-4) : texts.v1;
    const textB = (texts.v2.length >= 10) ? texts.v2.slice(0, 10) : texts.v2;
    return { v1: textA, v2: textB };
  }

  private goNextLine(area:HTMLTextAreaElement) {
    const pos = area.selectionStart;
    const ix = area.value.indexOf("\n", pos);
    if (ix >= 0) {
      area.blur();
      area.setSelectionRange(ix+1, ix+1);
      area.focus();
    }
  }

  private getGrossLinesAndGoNext(area:HTMLTextAreaElement) : Array<string> {
    const texts = this.splitText(area);
    const candidate = (texts.v2.length <= this.MAX_LINES_GROSS)
      ? texts.v2
      : texts.v2.slice(0, this.MAX_LINES_GROSS);
    const ix = candidate.findIndex((line:string) => {
      return line === "`@";
    });
    if (ix<0) return [];
    const res = candidate.slice(0,ix);

    var aboveLen = 0;
    texts.v1.forEach((line) => {aboveLen += line.length + 1;}); // +1:LF
    var resLen = 0;
    res.forEach((line) => {resLen += line.length + 1;}); // +1:LF
    const newCaret = aboveLen + resLen + "`@\n".length;
    area.blur();
    area.setSelectionRange(newCaret, newCaret);
    area.focus();
    return res;
  }

  private jumpToPreviousComment(area:HTMLTextAreaElement) {
    var ixNew = 0;
    // search from the "end of above line"
    const ix = area.value.lastIndexOf("\n", area.selectionStart - 1);
    if (ix > 0) {
      const ix2 = area.value.lastIndexOf("\n<-", ix-1);
      if (ix2 >= 0) {
        ixNew = ix2 + 1; // only "found previous comment" case
      }
    }
    area.blur();
    area.setSelectionRange(ixNew, ixNew);
    area.focus();
  }

  private jumpToNextComment(area:HTMLTextAreaElement) {
    const ix = area.value.indexOf("\n<-", area.selectionStart);
    var ixNew = ix + 1;
    if (ix < 0) {
      const texts = this.splitText(area);
      ixNew = area.value.length - texts.v2[texts.v2.length-1].length;
    }
    area.blur();
    area.setSelectionRange(ixNew, ixNew);
    area.focus();
  }

  private goNextPft(area:HTMLTextAreaElement) : number {
    const n = this.textIdsVjs.indexOf(area.id);
    if (0 <= n && n < (this.textIdsVjs.length-1)) {
      this.lastUsed++;
      this.updateAllPftSizes();
    }
    this.getCurrentPane().focus();
    return this.lastUsed;
  }

  private goPreviousPft(area:HTMLTextAreaElement) : number {
    const n = this.textIdsVjs.indexOf(area.id);
    if (1 <= n && n < this.textIdsVjs.length) {
      this.lastUsed--;
      this.updateAllPftSizes();
    }
    this.getCurrentPane().focus();
    return this.lastUsed;
  }

  private doOnGoNextComment(textArea: HTMLTextAreaElement): void {
    this.jumpToNextComment(textArea);
    const texts = this.getMonitorLines(textArea);
    this.onChange(texts.v1, texts.v2);
  }

  private doOnGoPreviousComment(textArea: HTMLTextAreaElement): void {
    this.jumpToPreviousComment(textArea);
    const texts = this.getMonitorLines(textArea);
    this.onChange(texts.v1, texts.v2);
  }

  private doOnGoNextPft(textArea: HTMLTextAreaElement): void {
    const ix = this.goNextPft(textArea);
    if (ix >= 0) {
      const texts = this.getMonitorLines(this.texts[ix]);
      this.onChange(texts.v1, texts.v2);
    }
  }

  private doOnGoPreviousPft(textArea: HTMLTextAreaElement): void {
    const ix = this.goPreviousPft(textArea);
    if (ix >= 0) {
      const texts = this.getMonitorLines(this.texts[ix]);
      this.onChange(texts.v1, texts.v2);
    }
  }

  // ========== ========== config ========== ==========

  private updatePftSize(el:HTMLElement, index:number) {
    if (AppConfig.data.pft_show_isAll === true) {
      const ratio = AppConfig.data.pft_show_active_ratio;
      const ratioMain = Math.floor(100 * ratio / ((ratio - 100) + 100*this.texts.length));
      const ratioOther = Math.floor(100 * 100 / ((ratio - 100) + 100*this.texts.length));

      // display all PFTs, ratio considered.
      el.style.visibility = "visible";
      if (index === this.lastUsed) {
        el.style.flexBasis = ratioMain + "%";
        el.style.flexGrow = String(ratio/100);
        el.style.flexShrink = String(ratio/100);
      } else {
        el.style.flexBasis = ratioOther + "%";
        el.style.flexGrow = "1";
        el.style.flexShrink = "1";
      }
    } else {
      // display single PFT
      if (index === this.lastUsed) {
        el.style.visibility = "visible";
        el.style.flexBasis = "100%";
        el.style.flexGrow = "1";
        el.style.flexShrink = "1";
      } else {
        el.style.visibility = "hidden";
        el.style.flexBasis = "0%";
        el.style.flexGrow = "0";
        el.style.flexShrink = "0";
      }
    }
  }

  private updateAllPftSizes() {
    for (var i=0 ; i<this.texts.length ; i++) {
      this.updatePftSize(this.panes[i] , i);
    }
  }

  private applyFont(el:HTMLElement) {
    el.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.pft_font_familyName);
    el.style.fontSize = AppConfig.data.pft_font_size + "pt";
    el.style.fontWeight = AppConfig.data.pft_font_isBold ? "bold" : "normal";
  }

  private applyColor(el:HTMLElement) {
    el.style.color = AppConfig.data.pft_foreColor
    el.style.backgroundColor = AppConfig.data.pft_backColor
  }

  private applyNameColor(el:HTMLElement, ix:number) {
    el.style.color = AppConfig.data.pft_foreColor
    el.style.backgroundColor = (ix === this.lastUsed) 
      ? AppConfig.data.pft_nameBackColor 
      : AppConfig.data.pft_nameOtherBackColor
  }

  private applyAllStyles() {
    for (var i=0 ; i<this.texts.length ; i++) {
      this.applyFont(this.texts[i]);
      this.applyColor(this.texts[i]);
      this.applyFont(this.names[i]);
      this.applyNameColor(this.names[i] , i);
      this.applyFont(this.nameTexts[i]);
    }
  }

  private configToScreen() {
    // autoOpen: AppConfig.data.pft_isOpen,
    AppConfig.data.limitPftShowActiveRatio();

    this.applyAllStyles();
    this.updateAllPftSizes();
  }

  // ========== ========== in-class utility ========== ==========

  private splitText(area:HTMLTextAreaElement) : Tuple2<Array<string>, Array<string>> {
    const caretPos = area.selectionStart;
    const linesTill = area.value.substr(0, caretPos).split("\n");
    const linesAbove = (linesTill.length > 0) ? linesTill.slice(0,linesTill.length - 1) : [];
    const lineTopPos = caretPos - linesTill[linesTill.length-1].length;
    const linesBelow = area.value.substr(lineTopPos).split("\n");
    return {v1:linesAbove, v2:linesBelow};
  }

  // ========== ==========  ========== ==========

  updateConfig() {
    this.configToScreen();
  }

  localize() {
    this.setTitle(T.t("PFT (Pre-Formatted Text)","PFT") + Util.getShortcutParenthesized("P"))
  }

  private setTitle(title:string) {
    this.titlebar.textContent = title
  }

  focus() {
    if (0 <= this.lastUsed && this.lastUsed < this.texts.length) {
      this.texts[this.lastUsed].focus()
    } else {
      this.texts[0].focus()
    }
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
