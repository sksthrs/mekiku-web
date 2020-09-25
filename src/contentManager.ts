import { MekikuUnitData, MekikuUnitDataForEstimate, MekikuUnitDataFlags } from "./mekikuAnalyzer";
import { ContentType } from "./content";
import Log from "./log";

/**
 * Manages main-display content.
 * assumed usage : instance in PaneMain (needs interactions with PaneMain)
 */
export class ContentManager {
  readonly MIN_D_MSEC_IN_SAME_ID = -20000;
  readonly MAX_LOG_SCAN = 50;
  readonly MAX_UNDO = 5;

  private loginMsec:number = Date.now()
  setLoginMsec(t:number) {
    this.loginMsec = t
  }

  /**
   * Storage of main-display-items (type:D,G,E).
   * (Undo items are not stored,
   *  but undone items remains with flag of MekikuUnitDataFlags.UNDONE)
   */
  private log: Array<MekikuUnitDataForEstimate> = new Array();

  private updateFlags: number = 0;
  getUpdateFlags ():number { return this.updateFlags; }
  private indexToAdd: number = 0;

  // ---------- ---------- Log Handling ---------- ----------

  /** Log position displayed at the top of main pane */
  private top: LogPosition = new LogPosition();

  /**
   * Proceed top line.
   * @param n number of line to proceed (default : 1)
   * @returns true if "cannot proceed because already at last" occurs
   */
  proceedLine(n:number = 1) : boolean {
    const res = this.proceedPosition(this.top, n);
    return res;
  }

  /**
   * proceed LogPosition
   * @returns true if "cannot proceed because already at last" occurs
   */
  private proceedPosition(p: LogPosition, n: number): boolean {
    var result = false;
    if (this.ignoreUndoneLogs(p) === true) {
      result = true;
    } else {
      for (var i = 0; i < n; i++) {
        if (this.isLineAtLastInThisLog(p)) {
          if (this.isLogItemAtLast(p)) {
            result = true;
            break;
          }
          p.log++;
          p.line = 0;
          if (this.ignoreUndoneLogs(p) === true) {
            result = true;
            break;
          }
        } else {
          p.line++; // same log, next line
        }
      }
    }
    return result;
  }

  /**
   * if current log-item is undone, proceed to next available log.
   * @param p position from where check begins
   * @returns true if all items from current one are all undone
   */
  private ignoreUndoneLogs(p: LogPosition): boolean {
    var result = false;
    while (this.isUndone(this.log[p.log])) {
      if (this.isLogItemAtLast(p)) { result = true; break;}
      p.log++;
      p.line = 0;
    }
    return result;
  }

  private isLogItemAtLast(p:LogPosition) : boolean {
    return (p.log >= (this.log.length - 1));
  }

  private isLineAtLastInThisLog(p:LogPosition) : boolean {
    return (p.line >= (this.log[p.log].lines.length - 1));
  }

  private isLogLineAtLast(p:LogPosition) : boolean {
    return (this.isLogItemAtLast(p) && this.isLineAtLastInThisLog(p));
  }

  getDisplayLog() : Array<string> {
    let result = new Array<string>();
    if (this.log.length < 1) return result;

    let pos = LogPosition.clone(this.top);
    while(true) {
      if (this.ignoreUndoneLogs(pos)) {
        break;
      } else {
        result.push(this.log[pos.log].lines[pos.line]);
        if (this.proceedPosition(pos,1)) { break; }
      }
    }
    return result;
  }

  // ---------- ---------- Log Handling END ---------- ----------

  getComplements(n:number) : Array<MekikuUnitDataForEstimate> {
    const len = this.log.length;
    const iBegin = len - 1;
    const iEnd = Math.max(iBegin - n + 1, 0);
    var result = [];
    for(var ix=iBegin ; ix>=iEnd ; ix--) {
      if (this.log[ix].estimatedRecvMsec < this.loginMsec) {
        break; // cut before login
      }
      result.push(this.log[ix]);
    }
    return result;
  }

  hasLog() : boolean {
    return this.log.length > 0
  }

  getLog(): Array<string> {
    return this.log
      .filter(
        (value: MekikuUnitDataForEstimate,
          index: number,
          array: Array<MekikuUnitDataForEstimate>) => {
          return (value.flag & MekikuUnitDataFlags.UNDONE) === 0;
        })
      .map(
        (value: MekikuUnitDataForEstimate,
          index: number,
          array: Array<MekikuUnitDataForEstimate>) => {
          return value.content;
        });
  }

  /**
   * scan items in the log (range of newly added or restructuring) and update lineBegin and lineEnd
   * @param callback function to handle items
   */
  loopItems(callback:(d:MekikuUnitDataForEstimate) => Array<string>) {
    if (this.updateFlags === 0) return;
    const rFlags = MainUpdateFlags.ERASE | MainUpdateFlags.GROSS | MainUpdateFlags.INBETWEEN | MainUpdateFlags.UNDO;
    const restructure = (this.updateFlags & rFlags) !== 0;
    const ixBegin = restructure ? this.top.log : this.indexToAdd;
    this.doLoopItems(ixBegin, (d) => {return callback(d);});
  }

  /**
   * scan from top-of-display item in the log and update lineBegin and lineEnd
   * @param callback function to handle items
   */
  loopItemsFromTop(callback:(d:MekikuUnitDataForEstimate) => Array<string>) {
    this.doLoopItems(this.top.log, (d) => {return callback(d);})
  }

  /**
   * scan items in the log
   * @param ixBegin starting index in the log
   * @param callback function to handle items, must return divided lines
   */
  private doLoopItems(
    ixBegin: number,
    callback: (d: MekikuUnitDataForEstimate) => Array<string>) 
    {
    const len = this.log.length;
    for (var ix = ixBegin; ix < len; ix++) {
      if (this.isUndone(this.log[ix])) continue;
      this.log[ix].lines = callback(this.log[ix]);
    }
  }

  undoLastItem() : MekikuUnitDataForEstimate | null {
    const len = this.log.length
    const min = Math.max(len - this.MAX_UNDO, 0);
    for (var ix=(len-1) ; ix>=min ; ix--) {
      if (this.log[ix].contentType === ContentType.ERASE
        || this.log[ix].contentType === ContentType.GROSS) {
          break; // cannot undo Gross, Erase and anything before Gross and Erase.
      }
      if (this.isNotUndone(this.log[ix])) {
        this.log[ix].flag |= MekikuUnitDataFlags.UNDONE
        this.updateFlags |= MainUpdateFlags.CHANGE | MainUpdateFlags.UNDO;
        return this.log[ix];
      }
    }
    return null;
  }

  /**
   * Try undo item in the log
   * @param id id of the sender
   * @param sentMsec time when the item is sent
   * @returns true(undo-ed successfully) false(already undo-ed) null(not found)
   */
  undoItem(id:string, sentMsec:number) : boolean | null {
    const len = this.log.length
    const min = Math.max(len - this.MAX_LOG_SCAN, 0);
    for (var ix=(len-1) ; ix>=min ; ix--) {
      if (this.log[ix].id === id && this.log[ix].sentMsec === sentMsec) {
        if (this.isNotUndone(this.log[ix])) {
          this.log[ix].flag |= MekikuUnitDataFlags.UNDONE
          return true
        } else {
          return false
        }
      }
    }
    return null;
  }

  /**
   * notify the end of one packet (main and possibly complements).
   */
  notifyPacketEnd() {
    this.updateFlags = 0;
    this.indexToAdd = this.log.length;
  }

  /**
   * add new data (received) into instance property.
   * supported content-types : D,G,E,U
   * @param newData data to add
   */
  updateLog(newData:MekikuUnitData) : MainUpdateFlags {
    const r = this.doUpdateLog(newData);
    this.updateFlags |= r;
    return r;
  }

  private doUpdateLog(newData:MekikuUnitData) : MainUpdateFlags {
    const baseFlag = this.MakeBaseFlag(newData);
    // RLog.w(`ContentManager.doUpdateLog : data ${newData.contentType}:[${newData.content}] base:[${baseFlag}]`)

    // reject if content type is out of scope.
    if (baseFlag === MainUpdateFlags.NOP) { return MainUpdateFlags.NOP; }

    // undo
    // TODO: yet implemented

    // make cache parameters
    const newDataForEstimate = new MekikuUnitDataForEstimate(newData);

    // reject too old (before login) data
    if (newDataForEstimate.estimatedRecvMsec < this.loginMsec) {
      // RLog.w(`too old (newdata[${newDataForEstimate.estimatedRecvMsec}] , login[${TmpConfig.I.login_time}])`); 
      return MainUpdateFlags.NOP; 
    }

    const estimate = this.scanLog(newDataForEstimate);

    if (estimate.result === EstimateResult.ADD) {
      // Log.w('Info',`result:add`)
      this.log.push(newDataForEstimate);
      return baseFlag;
    } else if (estimate.result === EstimateResult.INSERT) {
      // Log.w('Info',`result:insert at ${estimate.iInsert}`)
      this.log.splice(estimate.iInsert, 0, newDataForEstimate);
      return baseFlag | MainUpdateFlags.INBETWEEN;
    } else if (estimate.result === EstimateResult.UPDATE) {
      if (this.isNotUndone(this.log[estimate.iInsert])
        && this.isUndone(newDataForEstimate)
        && ((baseFlag & (MainUpdateFlags.ERASE | MainUpdateFlags.GROSS)) == 0)) 
      {
        // Log.w('Info',`result:undo at ${estimate.iInsert}`)
        this.log[estimate.iInsert].flag = MekikuUnitDataFlags.UNDONE;
        return MainUpdateFlags.CHANGE | MainUpdateFlags.INBETWEEN | MainUpdateFlags.UNDO;
      } else {
        // Log.w('Info',`result:update...nothing at ${estimate.iInsert}`)
        return MainUpdateFlags.NOP;
      }
    } else {
      // Log.w('Info',`result:${estimate.result}`)
      return MainUpdateFlags.NOP;
    }
  }

  /**
   * add new data. for use "send by myself".
   * supported content-types : D,G,E
   * @param newData data to add
   */
  addLog(newData:MekikuUnitData) : MainUpdateFlags {
    const baseFlag = this.MakeBaseFlag(newData);
    if (baseFlag === MainUpdateFlags.NOP) { return baseFlag; }

    const newDataForEstimate = new MekikuUnitDataForEstimate(newData);
    this.log.push(newDataForEstimate);
    this.updateFlags |= baseFlag;

    return baseFlag;
  }

  private isUndone(data: MekikuUnitData): boolean {
    return (data.flag & MekikuUnitDataFlags.UNDONE) !== 0;
  }

  private isNotUndone(data:MekikuUnitData) : boolean {
    return (data.flag & MekikuUnitDataFlags.UNDONE) === 0;
  }

  private MakeBaseFlag(newData:MekikuUnitData) : MainUpdateFlags {
    if (newData.contentType == ContentType.ERASE) {
      return MainUpdateFlags.CHANGE | MainUpdateFlags.ERASE;
    }
    if (newData.contentType == ContentType.GROSS) {
      return MainUpdateFlags.CHANGE | MainUpdateFlags.GROSS;
    }
    if (newData.contentType == ContentType.UNDO_ID) {
      return MainUpdateFlags.CHANGE | MainUpdateFlags.UNDO;
    }
    if (newData.contentType == ContentType.DISPLAY) {
      return MainUpdateFlags.CHANGE;
    }
    return MainUpdateFlags.NOP;
  }

  private scanLog(newData:MekikuUnitDataForEstimate) : RangeEstimation {
    //RLog.w(`scanLog begins`)
    let r = new RangeEstimation();

    const len = this.log.length;
    if (len < 1) { r.result = EstimateResult.ADD; return r; }

    const ixMax = this.log.length - 1;
    const ixMin = Math.max(ixMax - this.MAX_LOG_SCAN, 0);
    //RLog.w(`scan range:[${ixMin}:${ixMax}]`)

    for(var ix = ixMax ; ix >= ixMin ; ix--) {
      const logItem = this.log[ix];
      if (logItem.id === newData.id) {
        // from same IP
        if (logItem.sentTimeAnyway === newData.sentTimeAnyway) {
          r.result = EstimateResult.UPDATE;
          r.iInsert = ix;
          return r;
        } else if (logItem.sentTimeAnyway < newData.sentTimeAnyway) {
          r.iSameIpFirst = ix + 1;
          break;
        } else if (logItem.receivedMsec - newData.receivedMsec >= this.MIN_D_MSEC_IN_SAME_ID) {
          r.iSameIpLast = ix;
        }
      } else {
        // from other IP
        if (logItem.estimatedRecvMsec <= newData.estimatedRecvMsec) {
          if (r.iOtherIpFirst === -1) { r.iOtherIpFirst = ix + 1; }
        } else {
          if (r.iOtherIpFirst === -1) { r.iOtherIpLast = ix; }
        }
      }
    }

    if (r.iSameIpLast < r.iOtherIpFirst) {
      r.iInsert = r.iSameIpLast;
    } else if (r.iSameIpFirst > r.iOtherIpLast) {
      r.iInsert = r.iSameIpFirst;
    } else {
      r.iInsert = Math.max(
        Math.max(r.iSameIpFirst, r.iOtherIpFirst), 
        Math.min(r.iSameIpLast, r.iOtherIpLast));
    }

    if (r.iInsert >= len) {
      r.result = EstimateResult.ADD;
    } else if (r.iSameIpFirst === -1 && r.iOtherIpFirst === -1 && len > 0) {
      r.result = EstimateResult.UNIDENTIFIED;
    } else {
      r.result = EstimateResult.INSERT;
    }

    // RLog.w(`result ${r.toString()}`)
    return r;
  }
}

class LogPosition {
  log: number = 0;
  line: number = 0;

  constructor(log=0, line=0) {
    this.log = log;
    this.line = line;
  }

  static clone(p:LogPosition) : LogPosition {
    return new LogPosition(p.log, p.line);
  }
}

export interface DisplayLines {
  lineBegin: number;
  lineEnd: number;
  lines: Array<string>;
}

export class DisplayLinesClass implements DisplayLines {
  lineBegin: number;
  lineEnd: number;
  lines: Array<string>;

  constructor(begin:number, end:number, lines:Array<string>) {
    this.lineBegin = begin;
    this.lineEnd = end;
    this.lines = lines;
  }
}

class RangeEstimation {
  result? : EstimateResult;
  iInsert : number = Number.MAX_SAFE_INTEGER;
  iSameIpFirst : number = -1;
  iSameIpLast : number = Number.MAX_SAFE_INTEGER;
  iOtherIpFirst : number = -1;
  iOtherIpLast : number = Number.MAX_SAFE_INTEGER;

  toString() : string {
    return `[${this.result}] same[${this.iSameIpFirst}:${this.iSameIpLast}] other[${this.iOtherIpFirst}:${this.iOtherIpLast}]`;
  }
}

export enum EstimateResult {
  NOP,
  ADD,
  INSERT,
  UPDATE,
  UNIDENTIFIED,
  ERROR
}

export enum MainUpdateFlags {
  /** if no change exists */ NOP = 0,
  /** if some change exists */ CHANGE = 1 << 0,
  /** if the change is insert (in the middle of the log), not add */ INBETWEEN = 1 << 1,
  /** if type of the change is undo(delete) */ UNDO = 1 << 2,
  /** if type of the change is gross (both add/insert) */ GROSS = 1 << 3,
  /** if type of the change is screen-erase (both add/insert) */ ERASE = 1 << 4,
}
