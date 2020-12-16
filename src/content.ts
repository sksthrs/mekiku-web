import { Util } from "./util"

export interface ContentToSend {
  /** sequence counter */
  seqCount: number
  /** [set-by-sender] send-time (milliseconds elapsed since 1970-01-01T00:00:00.000Z) */
  sendTimeCount: number
  /** [set-by-sender] */
  senderName: string
  /** [set-by-sender] */
  memberType: string
}

export class ContentToSendClass implements ContentToSend {
  seqCount: number
  sendTimeCount: number
  senderName: string
  memberType: string

  constructor(name:string, type:string) {
    this.seqCount = ++ContentToSendClass.counter
    this.sendTimeCount = Date.now()
    this.senderName = name
    this.memberType = type
  }

  private static counter:number = 0
}

/**
 * interface defines incoming packet
 */
export interface Content extends ContentToSend {
  /** [set-by-receiver] receive-time (milliseconds elapsed since 1970-01-01T00:00:00.000Z) */
  receiveTimeCount: number
  /** [set-by-receiver] */
  senderID: string
}

/**
 * Data-storage class (similar to UdpContent of mekiku-web)
 */
export class ContentClass implements Content {
  seqCount: number = 0
  sendTimeCount: number = 0
  senderName: string = ""
  memberType: string = MemberType.WEB_SUBTITLER
  receiveTimeCount: number = 0
  senderID: string = ""

  constructor(mType: string) {
    this.sendTimeCount = Date.now()
    this.memberType = mType
  }

  /**
   * Creating "Content" class object from received data
   * @param id id of the sender
   * @param val data received
   */
  static fromAny(id:string, val:any) : Content | null {
    if (val == null) return null
    if (!Util.isNumber(val.seqCount)) return null
    if (!Util.isNumber(val.sendTimeCount)) return null
    if (!Util.isString(val.memberType)) return null
    if (!Util.isString(val.senderName)) return null
    val.receiveTimeCount = Date.now()
    val.senderID = id
    const d = val as Content
    return d
  }

  static fromSendData<T extends ContentToSend>(id:string, d:T) : T & Content {
    const r = d as T & Content
    r.senderID = id
    r.receiveTimeCount = d.sendTimeCount
    return r
  }
}

export class ContentUtil {
  static makeLoginData() : object {
    return { "L" : "" }
  }

  static makeResponseData() : object {
    return { "R" : "" }
  }

  static makeDisplayData(text:string) : ContentDataDisplay & ContentDataMonitor {
    return {
      "D" : text,
      "M" : "",
    }
  }

  /**
   * Check if parameter has "display" data or not.
   * Necessary for accessing "d.D" value in TypeScript.
   * https://qiita.com/ma2saka/items/eb2d26236c20afb7f764
   * @param d any object
   * @returns boolean (true if the parameter has "display" data)
   */
  static hasDisplayData(d:any) : d is ContentDataDisplay {
    if (!d) return false
    if (d.D != null && typeof d.D === 'string') return true
    return false
  }

  static makeGrossData(text:string) : ContentDataGross {
    return {
      "G" : text,
    }
  }
  static hasGrossData(d:any) : d is ContentDataGross {
    if (!d) return false
    if (d.G && typeof d.G === 'string') return true
    return false
  }

  static makeChatData(text:string) : ContentDataChat {
    return {
      "C" : text
    }
  }
  static hasChatData(d:any) : d is ContentDataChat {
    if (!d) return false
    if (d.C && typeof d.C === 'string') return true
    return false
  }

  static makeMonitorData(text:string) : ContentDataMonitor {
    return {
      "M" : text
    }
  }
  static hasMonitorData(d:any) : d is ContentDataMonitor {
    if (!d) return false
    if (d.M != null && typeof d.M === 'string') return true
    return false
  }

  static makePftMonData(above:string, below:string) : ContentDataPftMon {
    return {
      "A" : above,
      "B" : below,
    }
  }
  static hasPftMonData(d:any) : d is ContentDataPftMon {
    if (!d) return false
    if (d.A != null && d.B != null && typeof d.A === 'string' && typeof d.B === 'string') return true
    return false
  }

  static makeUndoData(id:string, sendTime:number) : ContentDataUndo {
    return {
      "U_ID" : id,
      "U_SENDTIME" : sendTime
    }
  }
  static hasUndoData(d:any) : d is ContentDataUndo {
    if (!d) return false
    if (d.U_ID && d.U_SENDTIME 
      && typeof d.U_ID === 'string'
      && typeof d.U_SENDTIME === 'number') return true
    return false
  }

  static makeLogoffData() : object {
    return { "F" : "" }
  }
}

export const MemberType = {
  WEB_SUBTITLER : "wi",
  WEB_VIEWER : "wv",
} as const

export const ContentType = {
  LOGIN : "L",
  RESPONSE : "R",
  DISPLAY : "D",
  GROSS : "G",
  CHAT : "C",
  MONITOR : "M",
  PFT_ABOVE : "A",
  PFT_BELOW : "B",
  UNDO_ID : "U_ID",
  UNDO_SENDTIME : "U_SENDTIME",
  ERASE : "E",
  LOGOFF : "F",
  HB : "H",
} as const

export interface ContentDataDisplay {
  D : string
}
export interface ContentDataGross {
  G : string
}
export interface ContentDataChat {
  C : string
}
export interface ContentDataMonitor {
  M : string
}
export interface ContentDataPftMon {
  A : string,
  B : string
}
export interface ContentDataUndo {
  U_ID : string,
  U_SENDTIME : number
}
