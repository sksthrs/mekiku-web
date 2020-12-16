import { AppConfig } from "./appConfig";
import { MemberInfo } from "./memberManager";
import { Pane } from "./pane";
import { T } from "./t";
import { Util } from "./util";
import { UtilDom } from "./utilDom";
import { Content, ContentType, MemberType } from "./content";
import Log from "./log";

export class PaneMonitor implements Pane {
  getName() { return "PaneMonitor"; }

  setOnNewJoined(callback: (member:MemberInfo) => void) { this.onMemberNewJoined = m => callback(m) }
  private onMemberNewJoined: (member:MemberInfo) => void = member => {}
  setOnLeft(callback: (member:MemberInfo) => void) { this.onMemberLeft = m => callback(m) }
  private onMemberLeft: (member:MemberInfo) => void = member => {}

  private members: Array<MemberInfo> = []
  private viewers: Array<MemberInfo> = []
  
  private readonly pane = document.getElementById("monitor") as HTMLDivElement
  private readonly titlebar = document.getElementById('monitor-title') as HTMLDivElement
  private readonly table = document.getElementById("monitorTable") as HTMLTableElement
  private readonly fontChecker = document.getElementById("monitorFontChecker") as HTMLSpanElement
  private readonly header1 = document.getElementById("monitorHeader1") as HTMLTableDataCellElement
  private readonly header2 = document.getElementById("monitorHeader2") as HTMLTableDataCellElement
  private readonly footer = document.getElementById("monitorFooter") as HTMLDivElement
  private readonly shortState = document.getElementById('short_state') as HTMLSpanElement

  private readonly IX_NAME = 0
  private readonly IX_INPUT = 1
  private readonly N_COLUMNS = 2

  /**
   * Make member pane (materialize dialog)
   */
  constructor() {
    this.localize()
    this.configToScreen()
    this.updateFooter()
    this.updateShortState()
  }

  updateMember(member: MemberInfo, data: Content) {
    if (member.memberType === MemberType.WEB_VIEWER) {
      var ix = this.viewers.findIndex((info) => { return info.id === member.id })
      if (ix < 0) {
        this.viewers.push(member)
        this.updateFooter()
        this.updateShortState()
        if (ContentType.LOGIN in data) {
          this.onMemberNewJoined(member)
        }
      } else {
        const beforeList = this.viewers.splice(ix,1,member)
        if (beforeList.length === 1) {
          if (member.lastSequence !== (beforeList[0].lastSequence+1)) {
            Log.w('Warning', `Viewer [${member.id}](${member.name}) seq jump from ${beforeList[0].lastSequence} to ${member.lastSequence}`)
          }
        }
      }
    } else {
      var ix = this.members.findIndex((info) => { return info.id === member.id; });
      if (ix < 0) {
        this.members.push(member);
        this.addRow();
        ix = this.members.length - 1;
        this.updateShortState()
        if (ContentType.LOGIN in data) {
          this.onMemberNewJoined(member)
        }
      } else {
        const beforeList = this.members.splice(ix,1,member)
        if (beforeList.length === 1) {
          if (member.lastSequence !== (beforeList[0].lastSequence + 1)) {
            Log.w('Warning', `Member [${member.id}](${member.name}) seq jump from ${beforeList[0].lastSequence} to ${member.lastSequence}`)
          }
          if (member.inputContent == null && beforeList[0].inputContent != null) {
            member.inputContent = beforeList[0].inputContent
          }
        }
      }
      this.updateRow(ix, member);
    }
  }

  private updateFooter() {
    const delimiter = this.viewers.length>0 ? ': ' : ''
    const names = this.viewers.map(v => v.name ?? '?').join(' ')
    this.footer.textContent = `${T.t("Viewer","General")}(${this.viewers.length})${delimiter}${names}`
  }

  private updateShortState() {
    this.shortState.textContent = `${T.t("Subtitler","General")} : ${this.members.length} , ${T.t("Viewer","General")} : ${this.viewers.length + 1}`
    // short_state is shown only when you are a viewer, so number of viewers is +1'ed
  }

  deleteMember(id:string) {
    const ix = this.members.findIndex(info => { return info.id === id })
    if (ix >= 0) {
      const leftMembers = this.members.splice(ix,1)
      this.removeRow(ix + 1)
      if (leftMembers.length > 0) {
        this.onMemberLeft(leftMembers[0])
      }
    }

    const ix2 = this.viewers.findIndex(info => { return info.id === id })
    if (ix2 >= 0) {
      const leftMembers = this.viewers.splice(ix2,1)
      this.updateFooter()
      if (leftMembers.length > 0) {
        this.onMemberLeft(leftMembers[0])
      }
    }

    this.updateShortState()
  }

  clearMembers() {
    this.members = []
    this.viewers = []
    this.clearRows()
    this.updateFooter()
    this.updateShortState()
  }

  private configToScreen() {
    //autoOpen: AppConfig.data.monitor_isOpen,
    this.table.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.monitor_font_familyName);
    this.table.style.fontSize = AppConfig.data.monitor_font_size + "pt";
    this.table.style.fontWeight = AppConfig.data.monitor_font_isBold ? "bold" : "normal";
    this.table.style.color = AppConfig.data.monitor_foreColor;
    this.table.style.backgroundColor = AppConfig.data.monitor_backColor;
    this.pane.style.backgroundColor = AppConfig.data.monitor_backColor;

    this.fontChecker.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.monitor_font_familyName);
    this.fontChecker.style.fontSize = AppConfig.data.monitor_font_size + "pt";
    this.fontChecker.style.color = AppConfig.data.monitor_backColor;
    this.fontChecker.style.backgroundColor = AppConfig.data.monitor_backColor;

    this.footer.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.monitor_font_familyName)
    this.footer.style.fontSize = AppConfig.data.monitor_font_size + "pt"
    this.footer.style.color = AppConfig.data.monitor_foreColor
    this.footer.style.backgroundColor = AppConfig.data.monitor_backColor
  }

  private clearRows() {
    while(this.table.rows[1]) {
      this.table.deleteRow(1);
    }
  }

  private addRow() {
    const newRow = this.table.insertRow(-1);
    this.addColumns(newRow, this.N_COLUMNS);
  }

  private addColumns(row: HTMLTableRowElement, n: number) {
    for (var i = 0; i < n; i++) {
      const cell = row.insertCell(-1);
      const text = document.createTextNode("");
      cell.appendChild(text);
    }
  }

  private removeRow(ix: number) {
    this.table.deleteRow(ix);
  }

  private updateRow(ix: number, member: MemberInfo) {
    const row = this.table.rows[ix + 1];

    const nameNode = row.cells[this.IX_NAME].firstChild as Text;
    const nameStr = (member.name != undefined) ? member.name : "noname";
    if (nameNode) { nameNode.data = nameStr; }
    
    const nameCell = row.cells[this.IX_NAME];
    nameCell.title = member.id;

    const inputNode = row.cells[this.IX_INPUT].firstChild as Text;
    const inputStrBase = (member.inputContent === undefined) ? "" : member.inputContent;
    if (inputNode) {
      const len = this.seekTextStartForShowAll(inputStrBase);
      var inputStr = inputStrBase.substr(len);
      inputNode.data = inputStr;
    }

    this.updateStates();
  }

  private seekTextStartForShowAll(src: string): number {
    const lenMax = src.length;
    const wMessage = UtilDom.getWidth(this.header2);
    this.fontChecker.textContent = src;
    var w = UtilDom.getWidth(this.fontChecker);
    if (w <= wMessage) return 0;

    var len = Math.floor(lenMax/2);
    var upper = lenMax;
    var lower = 1;
    for (var i=0 ; i<10 ; i++) {
      this.fontChecker.textContent = src.substr(lenMax-len,len);
      w = UtilDom.getWidth(this.fontChecker);
      if (w > wMessage) {
        if (len < upper) { upper = len; }
      } else {
        if (len > lower) { lower = len; }
      }

      if (upper === (lower+1)) return lenMax-lower;

      len = Math.floor( (upper+lower)/2 );
    }

    return lenMax-lower; // avoid infinite loop
  }

  private updateStates() {
  }

  updateConfig() {
    this.configToScreen();
  }

  localize() {
    this.setTitle(T.t("Input Monitor","Monitor"))
    this.updateFooter()
    this.updateShortState()
  }

  private setTitle(title:string) {
    this.titlebar.textContent = title
  }

  focus() {
    // no operation
  }

  toggle(): void {
    if (UtilDom.isDisplayed(this.pane)) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    UtilDom.displayOn(this.pane)
  }

  hide(): void {
    UtilDom.displayOff(this.pane)
  }

}
