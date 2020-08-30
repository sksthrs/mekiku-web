import { MemberType, Content } from "./content";

export interface MemberInfo {
  id: string;
  memberType: string;
  name?: string;
  inputContent?: string;
  lastReceived: number;
  lastSequence: number
}

export class MemberInfoClass implements MemberInfo {
  id: string;
  memberType: string;
  name?: string;
  inputContent?: string;
  lastReceived: number;
  lastSequence: number

  private constructor(id:string, mType:string) {
    this.id = id;
    this.memberType = mType;
    this.lastReceived = Date.now();
    this.lastSequence = 0
  }

  static fromContent(data:Content) : MemberInfoClass {
    const d = new MemberInfoClass(data.senderID , data.memberType)
    d.name = data.senderName
    d.lastReceived = data.sendTimeCount
    d.lastSequence = data.seqCount
    return d
  }
}
