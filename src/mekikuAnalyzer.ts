import { ContentType, MemberType, Content } from "./content";

/**
 * Analyzed single item from mekiku-packet.
 * (Generally, mekiku packet contains base item and one or more complement items)
 */
export interface MekikuUnitData {
  /** peer id of the sender */
  id: string;
  /** name of the sender */
  name: string
  /** the timestamp when this application received, from 1970-01-01T00:00:00Z */
  receivedMsec: number;
  /** the timestamp when sender sent, from 1970-01-01T00:00:00Z */
  sentMsec: number;
  /** type of member */
  memberType: string;
  /** type of content (main-display, chat, ...) */
  contentType: string
  /** [optional, complement only] sentTime(msec in a day) in original data, set by original sender */
  sentTimeOriginal?: number;
  /** normally zero. if 1, the data has undone */
  flag: number;
  /** content (main-display text, chat message, monitor text, ...) */
  content: string;
}

export enum MekikuUnitDataFlags {
  NORMAL = 0,
  UNDONE = 1,
}

/**
 * class implements MekikuUnitData with constructor
 */
export class MekikuUnitDataClass implements MekikuUnitData {
  id: string = ""
  name: string = ""
  receivedMsec: number = 0
  sentMsec: number = 0
  memberType: string = MemberType.WEB_SUBTITLER
  contentType: string = ""
  sentTimeOriginal?: number
  flag: number = 0
  content: string = ""

  static fromContent(v:Content) : MekikuUnitDataClass {
    const r = new MekikuUnitDataClass()
    r.id = v.senderID
    r.name = v.senderName
    r.sentMsec = v.sendTimeCount
    r.receivedMsec = v.receiveTimeCount
    r.memberType = v.memberType
    return r
  }
}

/**
 * single mekiku item (display, gross, erase, undo and chat)
 * to analyze and log(main,chat).
 */
export class MekikuUnitDataForEstimate {
  /** IP address from where the data has come, acquired from socket metadata */
  id: string;
  /** name of the sender */
  name: string
  /** the timestamp when this application received */
  receivedMsec: number;
  /** msec value in a day (UTC-based) when sender sent. acquired from received data */
  sentMsec: number;
  /** type of member */
  memberType: string;
  /** type of content (main-display, chat, ...) */
  contentType: string;
  /** [optional, complement only] sentTime(msec in a day) in original data, set by original sender */
  sentTimeOriginal?: number;
  /** normally zero. if 1, the data has undone */
  flag: number;
  /** content (main-display text, chat message, monitor text, ...) */
  content: string;
  /** estimated received time from 1970-01-01T00:00:00Z (in main data, same as receivedMsec) */
  estimatedRecvMsec: number;
  /** time when content first sent (format:msec in a day). sentTime for main data, sentTimeOriginal for complement */
  sentTimeAnyway: number;
  /** (variable) lines divided by display-width */
  lines: Array<string> = [];

  /**
   * Cloning constructor for MekikuUnitData
   * notice: estimatedRecvMsec is set as receivedMsrc. Estimate later.
   * @param src source data
   */
  constructor(src: MekikuUnitData) {
    this.id = src.id;
    this.name = src.name
    this.receivedMsec = src.receivedMsec;
    this.sentMsec = src.sentMsec;
    this.memberType = src.memberType;
    this.contentType = src.contentType;
    this.sentTimeOriginal = src.sentTimeOriginal;
    this.flag = src.flag;
    this.content = src.content;
    this.estimatedRecvMsec = this.receivedMsec;
    this.sentTimeAnyway = (this.sentTimeOriginal === undefined)
      ? this.sentMsec
      : this.sentTimeOriginal;
  }
}
