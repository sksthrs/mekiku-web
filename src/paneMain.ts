import { AppConfig } from "./appConfig";
import { ContentManager, MainUpdateFlags, DisplayLines, DisplayLinesClass } from "./contentManager";
import { ContentType, Content, ContentDataDisplay, ContentDataGross, ContentDataUndo, ContentToSend } from "./content";
import { Tuple2, Util } from "./util";
import { Pane } from "./pane";
import { UtilDom } from "./utilDom";
import Log from "./log";
import { MekikuUnitData, MekikuUnitDataClass, MekikuUnitDataForEstimate, MekikuUnitDataFlags } from "./mekikuAnalyzer";

export class PaneMain implements Pane {
  getName() { return "PaneMain"; }
  
  private readonly pane = document.getElementById("display") as HTMLDivElement
  private readonly mainText = document.getElementById("mainText") as HTMLDivElement
  private readonly lineHeightChecker = document.getElementById("mainLineHeightChecker") as HTMLDivElement
  private readonly mainCache = document.getElementById("mainCache") as HTMLDivElement

  private lineHeight: number = 0;
  private linesDisplayed: number = 6; // just an initial value
  private delimiter: string = "";
  static readonly NEW_LINE: string = "\n";
  static readonly NBSP: string = String.fromCharCode(160);

  private contents: ContentManager = new ContentManager();
  private newItems: Array<MekikuUnitData> = new Array();
  private scrollManager: ScrollManager;
  private undoQueue: Array<Content & ContentDataUndo> = new Array()

  private isViewerMode: boolean = false

  constructor() {
    const arg = {
      pane: this.pane,
      mainText: this.mainText,
      lineHeightChecker: this.lineHeightChecker,
    };
    this.scrollManager = new ScrollManager(arg);
    this.scrollManager.setOnScroll(() => {
      this.contents.proceedLine();
      this.restructureMainText();
      this.scrollManager.startScrollIfNeeded();
    });

    // exec finally in constructor. (in configToScreen, scroll.lineHeightPx is set.)
    this.configToScreen();
  }

  onScrollCancelForRestructure() {
    this.updateScreenParameters();
    this.contents.loopItemsFromTop((d) => {
      return this.addMeasureItems(d);
    });
    this.restructureMainText();
    this.scrollManager.startScrollIfNeeded();
  }

  getMainLog() : Array<string> {
    return this.contents.getLog();
  }
  hasMainLog() : boolean {
    return this.contents.hasLog()
  }

  /**
   * add "inner" new item to main display.
   * 
   * (notice) this affect real display and scroll.
   * @param text new line (without newline)
   */
  addNewItem(data:Content & ContentDataDisplay) {
    const isUndone = this.undoIfQueued(data)
    const d = MekikuUnitDataClass.fromContent(data)
    d.contentType = ContentType.DISPLAY
    d.id = data.senderID
    d.content = data.D
    if (isUndone) {
      d.flag |= MekikuUnitDataFlags.UNDONE
    }
    this.contents.addLog(d);
    if (isUndone) {
      return // undone item does not affect visible content
    }

    this.contents.loopItems((d) => {
      return this.addMeasureItems(d);
    });
    this.restructureMainText();
    this.contents.notifyPacketEnd();
    this.scrollManager.startScrollIfNeeded();
  }

  /**
   * add new gross (lines) to main display.
   * 
   * (notice) this affect real display. scroll stops when argument has valid text.
   * @param lines new lines
   */
  addNewGross(data:Content & ContentDataGross) {
    const d = MekikuUnitDataClass.fromContent(data)
    d.contentType = ContentType.GROSS
    d.id = data.senderID
    d.content = data.G
    this.contents.addLog(d);

    this.contents.loopItems((d) => {
      return this.addMeasureItems(d);
    });
    this.restructureMainText();
    this.stopScrollAndJumpToLatest();
  }

  undoLastItem() : MekikuUnitDataForEstimate | null {
    const undoed = this.contents.undoLastItem()
    if (undoed == null) { return null }
    
    this.contents.loopItems((d) => {
      return this.addMeasureItems(d)
    })
    this.restructureMainText()
    this.contents.notifyPacketEnd()
    this.scrollManager.startScrollIfNeeded()
    return undoed
  }

  private undoIfQueued(data:Content) : boolean {
    const ix = this.undoQueue.findIndex((dataUndo) => {
      return (data.senderID === dataUndo.U_ID) && (data.sendTimeCount === dataUndo.U_SENDTIME)
    })
    if (ix < 0) return false
    this.undoQueue.splice(ix, 1)
    return true
  }

  /**
   * add new undo to main display.
   */
  addNewUndo(data:Content & ContentDataUndo) {
    const undone = this.contents.undoItem(data.U_ID, data.U_SENDTIME)
    if (undone == null) {
      this.undoQueue.push(data)
      return
    }
    if (undone === false) return

    this.contents.loopItems((d) => {
      return this.addMeasureItems(d);
    });
    this.restructureMainText();
    this.contents.notifyPacketEnd();
    this.scrollManager.startScrollIfNeeded();
  }

  /**
   * add new erase to main display
   */
  addNewErase(data:Content) {
    const erase = MekikuUnitDataClass.fromContent(data)
    erase.contentType = ContentType.ERASE
    erase.content = PaneMain.NEW_LINE.repeat(this.linesDisplayed + 1)
    this.contents.addLog(erase);

    this.contents.loopItems((d) => {
      return this.addMeasureItems(d);
    });
    this.restructureMainText();
    this.stopScrollAndJumpToLatest();
  }

  /**
   * add (possibly) new item into temporary memory.
   * 
   * assumption : call with main content and complements in one packet, then call notifyNewItemsFinish.
   * @param newData item (mekiku's unit data, like d/g/e...) that can be new
   */
  notifyNewItem(newData:MekikuUnitData) {
    if (newData.contentType === ContentType.ERASE) {
      newData.content = PaneMain.NEW_LINE.repeat(this.linesDisplayed + 1);
    }
    this.newItems.push(newData);
  }

  /**
   * notify all items (in a bulk, mainly a packet) searched (and called notifyNewItem).
   * 
   * Packets in mekiku contains multiple data (including complements),
   * sometimes displaying text adds multiple data.
   * So decision about handling packet is determined after all data be processed.
   */
  notifyNewItemsFinish() {
    if (this.newItems.length < 1) return;

    for (const item of this.newItems) {
      const f = this.contents.updateLog(item);
    }
    const flags = this.contents.getUpdateFlags();
    if (flags === MainUpdateFlags.NOP) return;

    this.newItems = new Array();

    this.contents.loopItems((d) => {
      return this.addMeasureItems(d);
    });

    if (flags & (MainUpdateFlags.ERASE | MainUpdateFlags.GROSS)) {
      this.stopScrollAndJumpToLatest();
    } else {
      this.restructureMainText();
      this.contents.notifyPacketEnd();
      this.scrollManager.startScrollIfNeeded();
    }
  }

  /**
   * Set latest display-log into main-text.
   * No scrolling management, no log pointer management.
   */
  private restructureMainText() : number {
    const lines = this.contents.getDisplayLog();
    const joined = this.joinAndCountLines(lines);
    this.mainText.textContent = this.makeText(joined.v1);
    return joined.v2;
  }

  private jumpToLatest() {
    let lines = this.contents.getDisplayLog();
    let joined = this.joinAndCountLines(lines);
    if (joined.v2 > this.linesDisplayed) {
      this.contents.proceedLine(joined.v2 - this.linesDisplayed);
      lines = this.contents.getDisplayLog();
      joined = this.joinAndCountLines(lines);
    }
    this.mainText.textContent = this.makeText(joined.v1);
  }

  private stopScrollAndJumpToLatest() {
    this.scrollManager.cancelScroll(() => {
      this.jumpToLatest();
      this.contents.notifyPacketEnd();
    });
  }

  private joinAndCountLines(lines:Array<string>) : Tuple2<string, number> {
    const r = {
      v1: lines.join(PaneMain.NEW_LINE),
      v2: lines.length
    };
    return r;
  }

  private makeText(src:string) : string {
    return src.endsWith('\n') ? src + PaneMain.NBSP : src;
  }

  /**
   * add and measure the height of new item.
   * @param d item to add and measure
   * @returns divided lines
   */
  private addMeasureItems(d: MekikuUnitDataForEstimate): Array<string> {
    const result = this.divideTextIntoDisplayLines(d.content);
    return result;
  }

  /**
   * Divide text into displaying lines, each line is within pane width.
   * If text contains newline, it consists single array item.
   * (text="abcde\nfghij", returns ["abcde","\n","fghij"].)
   * @param text text to divide
   */
  private divideTextIntoDisplayLines(text:string) : Array<string> {
    const logicalLines = text.split(PaneMain.NEW_LINE);
    var result = new Array<string>();
    for (var logicalLine of logicalLines) {
      let lines = this.divideLineIntoDisplayLines(logicalLine);
      result.push(... lines);
    }
    return result;
  }

  /**
   * Divide single line into display-width lines.
   * 
   * (notice)
   * This utilize displayed height, so even this uses "length" and "substring", 
   * this can handle text segmentation such as emoji modifier, joined codepoints.
   * @param line string to divide
   */
  private divideLineIntoDisplayLines(line:string) : Array<string> {
    const len = line.length;
    var ix1 = 0;
    var ix2 = len;
    var ix2Min = ix1;
    var ix2Max = ix2;
    var result = new Array<string>();
    for (var i=0 ; true ; i++) {
      this.mainCache.textContent = line.substring(ix1, ix2);
      const b = this.mainCache.getBoundingClientRect();
      const n = Math.round(b.height / this.lineHeight);
      if (n <= 1) {
        ix2Min = Math.max(ix2,ix2Min);
        ix2 = Math.ceil((ix2Min+ix2Max)/2);
      } else {
        ix2Max = Math.min(ix2,ix2Max);
        ix2 = Math.floor((ix2Min+ix2Max)/2);
      }
      if (ix2Max - ix2Min <= 1) {
        result.push(line.substring(ix1, ix2Min));
        if (ix2Min >= len) break;
        ix1 = ix2Min;
        ix2Max = len;
        ix2 = ix2Max;
      }
      if (i > 10000) { // infinite?
        Log.w('Error', `divideLineIntoDisplayLines cycle too much! arg:\n${line}`);
        break;
      }
    }
    return result;
  }

  // ========== ========== Configuration ========== ==========

  private configToScreen() {
    this.pane.style.backgroundColor = this.getBackColor()

    this.applyFont(this.mainText);
    this.mainText.style.lineHeight = this.getLineHeight() + "%";

    this.applyFont(this.lineHeightChecker);
    this.lineHeightChecker.style.lineHeight = this.getLineHeight() + "%";

    this.applyFont(this.mainCache);

    this.updateScreen()
  }

  updateScreen() {
    this.updateScreenParameters();

    this.scrollManager.cancelScroll(() => {
      this.contents.loopItemsFromTop((d) => {
        return this.addMeasureItems(d);
      });
      this.restructureMainText();
      this.scrollManager.startScrollIfNeeded();
    });
  }

  private updateScreenParameters() {
    this.mainCache.style.lineHeight = this.getLineHeight() + "%"
    this.mainCache.style.width = this.mainText.getBoundingClientRect().width + "px"

    const bL = this.lineHeightChecker.getBoundingClientRect()

    this.lineHeight = bL.height
    this.scrollManager.lineHeightPx = this.lineHeight

    const bP = this.pane.getBoundingClientRect();
    this.linesDisplayed = Math.floor(bP.height / this.lineHeight);
    this.scrollManager.linesDisplayed = this.linesDisplayed;
    // Log.w('Debug',`paneMain.updateScreenParameters pane-cw=${this.pane.clientWidth} text-width=${this.mainText.style.width} cache-width=${this.mainCache.style.width} pane:${JSON.stringify(bP)} th=${this.textHeight} lh=${this.lineHeight} #l=${this.linesDisplayed} bL:${JSON.stringify(bL)}}`)
  }

  private applyFont(el:HTMLDivElement) {
    el.style.fontFamily = UtilDom.makeFontFamily(this.getFontFamily())
    el.style.fontSize = this.getFontSize() + "pt"
    el.style.fontWeight = this.isBold() ? "bold" : "normal"
    el.style.color = this.getForeColor()
    el.style.backgroundColor = this.getBackColor()
  }

  private getFontFamily() : string {
    return this.isViewerMode ? AppConfig.data.main_v_font_familyName : AppConfig.data.main_font_familyName
  }

  // ==================== AppConfig Interface ====================

  private getFontSize() : number {
    return this.isViewerMode ? AppConfig.data.main_v_font_size : AppConfig.data.main_font_size
  }

  private isBold() : boolean {
    return this.isViewerMode ? AppConfig.data.main_v_font_isBold : AppConfig.data.main_font_isBold
  }

  private getForeColor() : string {
    return this.isViewerMode ? AppConfig.data.main_v_foreColor : AppConfig.data.main_foreColor
  }

  private getBackColor() : string {
    return this.isViewerMode ? AppConfig.data.main_v_backColor : AppConfig.data.main_backColor
  }

  private getLineHeight() : number {
    return this.isViewerMode ? AppConfig.data.main_v_lineHeight : AppConfig.data.main_lineHeight
  }

  // ==================== End of AppConfig Interface ====================

  setViewerMode(isViewer:boolean) {
    this.isViewerMode = isViewer
  }

  updateConfig() {
    this.configToScreen();
  }

  setPaneToConfig() {
  }

  focus() {
  }

  toggle() {
    // NOP (just for implements Pane)
  }

  show() {
    // NOP (just for implements Pane)
  }

  hide() {
    // NOP (just for implements Pane)
  }

}

interface DisplayArguments {
  pane: HTMLDivElement;
  mainText: HTMLDivElement;
  lineHeightChecker: HTMLDivElement;
}

class ScrollManager {
  readonly pane: HTMLDivElement;
  readonly mainText: HTMLDivElement;
  readonly lineHeightChecker: HTMLDivElement;

  readonly SCROLL_NAME = "scroll";

  public lineHeightPx: number;
  /** number of lines to display (part of them might be occulted) */
  public linesDisplayed: number = 0;
  private isScrolling: boolean = false;
  public isHalt: boolean = false;

  /** set function executed when single scroll ended. */
  setOnScroll(callback:() => void) { this.doOnScroll = () => callback(); }
  /** function executed when single scroll ended. */
  private doOnScroll: () => void = () => {};

  constructor(arg:DisplayArguments) {
    this.pane = arg.pane;
    this.mainText = arg.mainText;
    this.lineHeightChecker = arg.lineHeightChecker;
    
    const b = this.lineHeightChecker.getBoundingClientRect();
    this.lineHeightPx = b.height;

    this.mainText.addEventListener("transitionend",() => this.onScrollEnd());
  }

  onScrollEnd() {
    this.isScrolling = false;
    this.mainText.classList.remove(this.SCROLL_NAME);
    this.setTop(0);
    this.doOnScroll();
  }

  startScrollIfNeeded() {
    if (this.isScrolling) return;
    if (this.isHalt) return;
    if (!this.isTextBottomBelowPane()) return; // text in pane, needless to scroll

    // Do start scrolling.
    this.isScrolling = true;
    this.mainText.classList.add(this.SCROLL_NAME);
    this.setTop(-this.lineHeightPx);
  }

  /**
   * Stop scroll.
   * If scrolling, text DIV jumps out of screen (top=-8000px) and back to zero after callback.
   * @param callback [Async] procedure after scroll stopped (animation is disabled), executed even if not scrolling.
   */
  cancelScroll(callback:() => void) {
    const wasScrolling = this.isScrolling;
    this.isScrolling = false;
    this.mainText.classList.remove(this.SCROLL_NAME);
    if (wasScrolling) {
      this.setTop(-8000); // Temporary, move out of screen
    }
    window.setTimeout(() => {
      this.setTop(0);
      callback();
    }, 0);
  }

  setTop(top: number) {
    this.mainText.style.transform = `translate(0px,${top}px)`;
  }

  moveToTopNow() {
    this.mainText.classList.remove(this.SCROLL_NAME);
    this.setTop(0);
  }

  isTextBottomBelowPane() : boolean {
    const bPane = this.pane.getBoundingClientRect()
    const bText = this.mainText.getBoundingClientRect()
    const result = bText.bottom > bPane.bottom
    // console.log(`bPane=${JSON.stringify(bPane)} h=${h} btm=${btm} bText=${JSON.stringify(bText)} r=${result}`)
    return result
  }
}
