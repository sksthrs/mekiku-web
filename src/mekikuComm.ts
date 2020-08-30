/// <reference types="skyway" />

import Log from "./log"
import {Content, ContentClass, ContentToSend, MemberType, ContentToSendClass} from './content'
import LoginInfo from "./loginInfo"

export class MekikuCommEvents {
  onIdAcquired: (id:string) => void = (id) => {}
  /** alled when someone sends a message */
  onReceived: (data:Content) => void = (d) => {}
  /** called when you joined a room */
  onJoinedRoom: () => void = () => {}
  /** called when you left the room */
  onLeftRoom: () => void = () => {}
  /** called when someone joined the room you are in */
  onSomeoneJoined: (id:string) => void = (id) => {}
  /** called when someone left the room you are in */
  onSomeoneLeft: (id:string) => void = (id) => {}
  logger: (msg:string) => void = (msg) => {}
}

/**
 * Communication class for mekiku-web
 */
class MekikuComm {
  private peer: Peer
  private room: SFURoom | MeshRoom | null | undefined
  private info: LoginInfo | undefined
  getInfo() : LoginInfo | undefined {
    return this.info == null ? undefined : LoginInfo.clone(this.info)
  }
  isInRoom() : boolean {
    return this.info != null
  }

  onIdAcquired: (id:string) => void = (id) => {}
  /** alled when someone sends a message */
  onReceived: (data:Content) => void = (d) => {}
  /** called when you joined a room */
  onJoinedRoom: () => void = () => {}
  /** called when you left the room */
  onLeftRoom: () => void = () => {}
  /** called when someone joined the room you are in */
  onSomeoneJoined: (id:string) => void = (id) => {}
  /** called when someone left the room you are in */
  onSomeoneLeft: (id:string) => void = (id) => {}
  logger: (msg:string) => void = (msg) => {}

  constructor(eventHandlers?:MekikuCommEvents) {
    // "debug" option values : NONE=0, ERROR=1, WARN=2, FULL=3
    this.peer = new Peer({
      key: '03ab2f52-64bb-4ffa-a395-9a335b8ce95d',
      debug: 1
    })
    if (eventHandlers != null) {
      this.onIdAcquired = eventHandlers.onIdAcquired
      this.onJoinedRoom = eventHandlers.onJoinedRoom
      this.onLeftRoom = eventHandlers.onLeftRoom
      this.onReceived = eventHandlers.onReceived
      this.onSomeoneJoined = eventHandlers.onSomeoneJoined
      this.onSomeoneLeft = eventHandlers.onSomeoneLeft
      this.logger = eventHandlers.logger
    }
    this.setPeerEvents(this.peer)
  }

  /**
   * Join room.
   * @param room_name name of room to join
   * @param mode connecting mode. "sfu" or "mesh" is available.
   * @returns success(true) or fail(false)
   */
  joinRoom(info:LoginInfo, mode="sfu") {
    Log.w('Info',`joining room room:${info.room}, name:${info.name}, type:${info.memberType}, pass:${info.pass}, mode:${mode}`)
    if (this.peer == null) {
      Log.w('Error','peer is null.')
      return false
    }

    const r = this.peer.joinRoom(info.room, {
      mode: mode
    })
    if (r == null) {
      Log.w('Error','joinRoom failed.')
      return false
    }
    this.info = LoginInfo.clone(info)

    this.room = r
    this.setRoomEvents(this.room)
    return true
  }

  /**
   * Leave room
   */
  leaveRoom() {
    if (this.room != null) {
      this.room.close()
    }
  }

  /**
   * Queue message to all room members (except self)
   * @param data object to send
   */
  queue_room<T>(data:T) : T & ContentToSend {
    const name = this.info?.name ?? ""
    const type = this.info?.memberType ?? MemberType.WEB_SUBTITLER
    const sendBase = new ContentToSendClass(name,type)
    const d = {...data , ...sendBase}
    // Log.w('Info',`queue data:${JSON.stringify(d)}`)
    this.room?.send(d) // yet not queueing
    return d
  }

  /**
   * send message to all room members (except self)
   * @param data object to send
   */
  send_room<T>(data:T) : T & ContentToSend {
    const name = this.info?.name ?? ""
    const type = this.info?.memberType ?? MemberType.WEB_SUBTITLER
    const sendBase = new ContentToSendClass(name,type)
    const d = {...data , ...sendBase}
    Log.w('Info',`send data:${JSON.stringify(d)}`)
    this.room?.send(d)
    return d
  }

  private setPeerEvents(p:Peer) {
    p.on('open', id => {
      Log.w('Info',`peer opened id=${id}`)
      this.onIdAcquired(id)
    })
    p.on('close', () => {
      Log.w('Info',`peer closed`)
    })
    p.on('connection', conn => {
      Log.w('Info',`peer connected from ${JSON.stringify(conn)}`)
    })
    p.on('disconnected', id => {
      Log.w('Info',`peer disconnected id=${id}`)
    })
    p.on('error', err => {
      Log.w('Error',`peer error (${err.type}) <${err.message}>`)
    })
  }

  private setRoomEvents(r:SFURoom|MeshRoom) {
    r.on('open', () => {
      Log.w('Info',`room opened`)
      this.onJoinedRoom()
    })
    r.on('peerJoin', peerId => {
      Log.w('Info',`room : ${peerId} joined`)
      this.onSomeoneJoined(peerId)
    })
    r.on('peerLeave', peerId => {
      Log.w('Info',`room : ${peerId} left`)
      this.onSomeoneLeft(peerId)
    })
    r.on('data', ({src,data}) => {
      const t = Date.now()
      Log.w('Info',`room: data from ${src} : ${JSON.stringify(data)}`)
      const d = ContentClass.fromAny(src,data)
      if (d != null) {
        this.onReceived(d)
      }
    })
    r.on('close', () => {
      Log.w('Info',`room closed`)
      delete this.room
      delete this.info
      this.onLeftRoom()
    })
  }
}

export default MekikuComm
