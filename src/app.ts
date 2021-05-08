import MekikuComm, { MekikuCommEvents, MekikuCommOpenOption } from "./mekikuComm"
import Log from "./log";
import AppControlPane from "./appControlPane";
import DialogLogin from "./dialogLogin";
import LoginInfo from "./loginInfo";
import { PaneInput } from "./paneInput";
import { PaneFkey } from "./paneFkey";
import { PaneMonitor } from "./paneMonitor";
import { ContentType, ContentUtil, Content, ContentClass, ContentDataDisplay, MemberType } from "./content";
import { MemberInfoClass } from "./memberManager";
import { Util } from "./util";
import { PaneChat } from "./paneChat";
import { PanePft } from "./panePft";
import { PanePftMon } from "./panePftMon";
import { T } from "./t";
import { PaneMain } from "./paneMain";
import { MekikuUnitDataClass } from "./mekikuAnalyzer";
import { UtilDom } from "./utilDom";
import { PaneContainer1, PaneContainer2, PaneContainer3 } from "./paneContainers";
import { Pane } from "./pane";
import FileController, { Downloader } from "./fileController";
import { DialogConfig } from "./dialogConfig";
import { AppConfig } from "./appConfig";
import DialogInput from "./dialogInput";
import TmpConfig from "./TmpConfig";
import { DialogConfigViewer } from "./dialogConfigViewer";
import Split from "split.js"
import DialogNotify from "./dialogNotify";
import { Apis } from "./apis";

class App {
  private comm: MekikuComm
  private appControl: AppControlPane
  private paneContainer1: PaneContainer1
  private paneContainer2: PaneContainer2
  private paneContainer3: PaneContainer3
  private dialogLogin: DialogLogin
  private paneInput: PaneInput
  private paneFkey: PaneFkey
  private paneMonitor: PaneMonitor
  private paneChat: PaneChat
  private panePft: PanePft
  private panePftMon: PanePftMon
  private paneMain: PaneMain
  private pftFileController: FileController
  private configFileController: FileController
  private dialogConfig: DialogConfig
  private dialogConfigViewer: DialogConfigViewer
  private dialogInput: DialogInput
  private dialogNotify: DialogNotify
  private loginInfo?: LoginInfo
  private id: string = ""
  private roomName: string = ""
  private panes: { [ch:string] : Pane; };
  private pageTitle:string = ""
  private isViewer: boolean = false
  private splitContainer?: Split.Instance
  private splitDisplayMonitor?: Split.Instance
  private splitPft?: Split.Instance
  private isErrorHandling: boolean = false

  constructor() {
    const localConfig = localStorage.getItem('config')
    if (localConfig != null) {
      Log.w('Info', 'config found in localStorage')
      AppConfig.trySetJSON(localConfig)
    }
    const locale = AppConfig.data.getLocale()
    Log.w("Info",`locale:${locale}`)
    T.setLocale(locale)

    TmpConfig.setInitialLocation(document.location)

    window.addEventListener('beforeunload', (ev) => { this.onBeforeUnload(ev) })
    window.addEventListener('unload', (ev) => { this.onUnload(ev) })

    UtilDom.makeDialogsRespondToKey()

    this.dialogInput = new DialogInput()
    this.dialogNotify = new DialogNotify()

    this.configFileController = new FileController('cfg-file-opener')
    this.dialogConfig = new DialogConfig()
    this.dialogConfigViewer = new DialogConfigViewer()
    this.setConfigDialogEvents()

    const handlers = this.makeCommEventHandlers()
    this.comm = new MekikuComm(handlers)

    this.appControl = new AppControlPane()
    this.setAppControlEvents()

    this.paneContainer1 = new PaneContainer1()
    this.paneContainer2 = new PaneContainer2()
    this.paneContainer3 = new PaneContainer3()

    this.dialogLogin = new DialogLogin()
    this.setLoginDialogEvents()
    this.dialogLogin.hidePass() // default : no password
    this.dialogLogin.setName(TmpConfig.getName())
    const roomHash = this.getInitialRoomIfLegit()
    if (roomHash !== '') {
      this.dialogLogin.setRoom(roomHash)
      this.dialogLogin.hideRoom()
    }
    this.updatePageTitleWithRoom(roomHash)

    // Cannot support old browsers (MSIE=IE(<11), Trident=IE11, Edge=EdgeHTML). Chromium Edge('Edg') is okay.
    if (Util.contains(navigator.userAgent, 'MSIE', 'Trident', 'Edge')) {
      // do nothing for no-support browser, so shutter remains topmost.
    } else {
      // seems running on not no-support browser. hide shutter and show login dialog.
      const shutter = document.getElementById('shutter') as HTMLDivElement;
      shutter.style.display = 'none'
      this.dialogLogin.showDialog()
    }

    this.fetchConfig().then(result => {
      if (result !== true) {
        this.dialogLogin.hideDialog()
        this.dialogNotify.showDialog(T.t('Error', 'General'), T.t('No Room.', 'Login'), false)
      }
    })

    this.paneMain = new PaneMain()

    this.paneFkey = new PaneFkey()
    this.paneInput = new PaneInput()
    this.setInputEvents()

    this.paneMonitor = new PaneMonitor()
    this.setMonitorEvents()

    this.paneChat = new PaneChat()
    this.setChatEvents()

    this.pftFileController = new FileController('pft-file-opener')
    this.panePft = new PanePft()
    this.setPftEvents()

    this.panePftMon = new PanePftMon()

    this.panes = {
      "i" : this.paneInput,
      "r" : this.paneChat,
      "p" : this.panePft,
      "f" : this.paneFkey,
    };

    this.localize()
    this.setEvents()
  } // end of constructor

  // ==================== Sending ====================

  private sendMain(text:string) {
    const dRaw = ContentUtil.makeDisplayData(text)
    const d = this.comm.send_room(dRaw)
    const dR = ContentClass.fromSendData(this.id, d)
    this.paneMain.addNewItem(dR)
  }

  private sendGross(lines:string[]) {
    const text = lines.join('\n')
    const dRaw = ContentUtil.makeGrossData(text)
    const d = this.comm.send_room(dRaw)
    const dR = ContentClass.fromSendData(this.id, d)
    this.paneMain.addNewGross(dR)
  }

  // ==================== Misc ====================

  private getInitialRoomIfLegit() : string {
    const location = TmpConfig.getInitialLocation()
    const queryString = location?.search?.substring(1)
    if (queryString == null) return ''
    const room = Util.extractPossibleRoomName(queryString)
    return (Util.isRoomNameLegit(room)) ? room : ''
  }

  private updateUrlWithRoom(room:string) {
    const q = Util.makeQueryStringWithNewRoom(room, UtilDom.getQuery())
    UtilDom.setQuery(q)
  }

  private updatePageTitleWithRoom(room:string, atStart:boolean = true) {
    if (room.length > 0) {
      this.updatePageTitle(T.t("Room","General") + " " + room)
    } else {
      this.updatePageTitle('')
    }
  }

  private updatePageTitle(title:string, atStart:boolean = true) {
    if (this.pageTitle.length < 1) {
      this.pageTitle = document.title
    }

    if (title.length < 1) {
      document.title = this.pageTitle
      return
    }

    if (atStart) {
      document.title = title + " - " + this.pageTitle
    } else {
      document.title = this.pageTitle + " - " + title
    }
  }

  // ==================== Asynchronous ====================

  private async fetchConfig() : Promise<boolean> {
    const responseJson = await fetch( "config.json?" + Date.now().toString() )
    const json = await responseJson.json()
    if (this.onConfigFetch(json) !== true) return false

    const authType = TmpConfig.getAuthType()

    // [CASE] no authectication
    if (authType === 'none') {
      return true
    }

    // [CASE] client-only password (use for roomhash)
    if (authType === 'browser') {
      this.dialogLogin.showPass()
      return true
    }

    // [CASE] application-server authentication
    const roomHash = this.getInitialRoomIfLegit()
    if (roomHash == null || roomHash == '') { // if room is not specified, there is no error now.
      this.dialogLogin.showName()
      this.dialogLogin.showPass()
      return true;
    }
    const responseQuery = await Apis.queryRoom(roomHash)
    if (responseQuery.ok)
    {
      const jsonRoom = await responseQuery.json()
      return this.onRoomFetch(jsonRoom)
    } else {
      return false
    }
  }

  private onConfigFetch(json:unknown) : boolean {
    if (!Apis.isFetchConfigResponse(json)) return false

    TmpConfig.setApiKey(json.api_key)
    this.dialogLogin.enableLogin()
    TmpConfig.setDebugLevel(json.debug_level)
    TmpConfig.setAuthUrl(json.auth_url)

    TmpConfig.setUserType('')
    this.dialogLogin.clearRole()
    if (json.subtitler_url_value != null && json.subtitler_url_value !== '') {
      const queries = Util.queryString2kvArray(UtilDom.getQuery())
      if (queries.some(q => q.key === 'u' && q.value === json.subtitler_url_value)) {
        TmpConfig.setUserType('i')
        this.dialogLogin.fixRoleAsSubtitler()
      } else {
        TmpConfig.setUserType('v')
        this.dialogLogin.fixRoleAsViewer()
      }
    }

    return true
  }

  private onRoomFetch(json:unknown) : boolean {
    if (!Apis.isGetRoomResponse(json)) return false

    const showhide = (name: string, pass: string) => {
      if (name === Apis.HIDE) {
        this.dialogLogin.hideName()
      } else {
        this.dialogLogin.showName()
      }
      if (pass === Apis.HIDE) {
        this.dialogLogin.hidePass()
      } else {
        this.dialogLogin.showPass()
      }
    }

    switch (TmpConfig.getUserType()) {
      case 'i':
        showhide(Apis.SHOW, json.ip)
        break
      case 'v':
        showhide(json.vn, json.vp)
        break
      default:
        showhide(Apis.SHOW, Apis.SHOW)
        break
    }
    return true
  }

  // ==================== Events ====================

  private setConfigDialogEvents() {
    this.configFileController.onLoad = ev => {
      if (ev.target?.result == null) return
      Log.w('Info','Config opened.')
      const text = ev.target.result as string // this must be string
      AppConfig.trySetJSON(text)
      this.reflectNewConfig()
      this.dialogConfig.configToDialog() // apply new config into config dialog
      this.dialogConfigViewer.configToDialog() // apply new config into config dialog
    }
    this.dialogConfig.setOnSet((names) => {
      this.updateSomeConfigs(names);
    });
    this.dialogConfigViewer.setOnSet((names) => {
      this.updateSomeConfigs(names);
    });
    this.dialogConfig.onResetClicked = () => {
      AppConfig.resetAll()
      this.reflectNewConfig()
      this.dialogConfig.configToDialog() // apply initial config into config dialog
      this.dialogConfigViewer.configToDialog() // apply initial config into config dialog
    }
    this.dialogConfigViewer.onResetClicked = () => {
      AppConfig.resetAll()
      this.reflectNewConfig()
      this.dialogConfig.configToDialog() // apply initial config into config dialog
      this.dialogConfigViewer.configToDialog() // apply initial config into config dialog
    }
    this.dialogConfig.onOpenClicked = () => {
      this.configFileController.openDialogAndReadFile(AppConfig.getExtensionMekikuWeb())
    }
    this.dialogConfigViewer.onOpenClicked = () => {
      this.configFileController.openDialogAndReadFile(AppConfig.getExtensionMekikuWeb())
    }
    this.dialogConfig.onSaveClicked = () => {
      this.dialogInput.onOkClick = filename => {
        Downloader.start(filename, AppConfig.getJSON())
      }
      const label = T.t("file name", "General")
      const name = Util.getIsoStyleDateString() + AppConfig.getExtensionMekikuWeb()
      this.dialogInput.showDialog(label,name)
    }
    this.dialogConfigViewer.onSaveClicked = () => {
      this.dialogInput.onOkClick = filename => {
        Downloader.start(filename, AppConfig.getJSON())
      }
      const label = T.t("file name", "General")
      const name = Util.getIsoStyleDateString() + AppConfig.getExtensionMekikuWeb()
      this.dialogInput.showDialog(label,name)
    }
    this.configFileController.onError = (ev,file) => {
      alert(`Error loading ${file.name} : ${ev.target?.error}`)
    }
  }

  private setAppControlEvents() {
    this.appControl.onLogout = () => {
      this.comm.send_room(ContentUtil.makeLogoffData())
      this.comm.leaveRoom()
      if (TmpConfig.getAuthType() === 'server') {
        const f = async () => {
          const response = await Apis.logoutRoom()
          if (response.ok !== true) {
            Log.w('Error', `Logout POST failed : ${response.status}:${response.statusText}`)
          }
        }
      }
    }
    this.appControl.onSetting = () => {
      if (this.isViewer) {
        this.dialogConfigViewer.showDialog()
      } else {
        this.dialogConfig.showDialog()
      }
    }
  }
  
  private setLoginDialogEvents() {
    this.dialogLogin.onDownloadMain = () => {
      const name = Util.getIsoModifiedDateTimeString() + "_main.log"
      const log = this.paneMain.getMainLog().join(Util.getNewLineCode())
      Downloader.start(name, log)
    }
    this.dialogLogin.onDownloadChat = () => {
      const name = Util.getIsoModifiedDateTimeString() + "_chat.log"
      const log = this.paneChat.getLog()
      Downloader.start(name, log)
    }

    this.dialogLogin.onLoginClick = info => {
      this.loginInfo = info
      TmpConfig.setName(info.name)
      TmpConfig.setMemberType(info.memberType)
      switch (TmpConfig.getAuthType()) {
        case 'none':
          this.doLogin(info)
          break
        case 'browser':
          this.doLogin(info)
          break
        case 'server':
          const f = async () => {
            const response = await Apis.loginRoom({
              roomHash: info.room,
              userName: info.name,
              userType: info.memberType,
              password: info.pass,
            })
            if (response.ok !== true) {
              Log.w('Error', `Login POST failed : ${response.status}:${response.statusText}`)
              this.dialogLogin.showDialogWithMessage(T.t('Login failed.', 'Login'))
              return
            }
            const json = await response.json()
            if (Apis.isPostLoginResponse(json)) {
              TmpConfig.setZoomUrl(json.zoomUrl)
              this.doLogin(info, {
                id: json.id,
                credential: json.credential,
              })
            } else {
              this.dialogNotify.showDialog(T.t('Error', 'General'), T.t('System error.', 'General'), false)
              return
            }
          }
          f() // execution of async...
          break
        default:
          throw new Error('wrong authentication type!')
      }
    }
  }

  private doLogin(info:LoginInfo, option?:MekikuCommOpenOption) {
    const login_info = info
    const openOption:MekikuCommOpenOption = {
      handleOpen: id => {
        this.comm.joinRoom(login_info)
        .then(() => {})
        .catch(error => {})
      },
      debugLevel: TmpConfig.getDebugLevel(),
      ...option
    }
    this.comm.open(TmpConfig.getApiKey(), openOption)
    const initialRoom = this.getInitialRoomIfLegit()
    const room = /*(initialRoom !== '') ? initialRoom :*/ info.room
    if (initialRoom === '') {
      this.updatePageTitleWithRoom(room)
      this.updateUrlWithRoom(room)
    }
    this.roomName = room
    this.paneMonitor.clearMembers()
    if (info.memberType === MemberType.WEB_VIEWER) {
      this.setViewerStyle()
    } else {
      this.setSubtitlerStyle()
    }
  }

  private setInputEvents() {
    this.paneInput.setGetFkey((ix) => {
      return this.paneFkey.getFKey(ix)
    })
    this.paneInput.setDoOnInput((text) => {
      this.comm.queue_room(ContentUtil.makeMonitorData(text))
    })
    this.paneInput.setDoOnEnter((text) => {
      this.sendMain(text)
    })
    this.paneInput.setDoOnUndo(() => {
      const undoed = this.paneMain.undoLastItem()
      if (undoed == null) { return "" }
      
      const d = ContentUtil.makeUndoData(undoed.id, undoed.sentMsec)
      this.comm.send_room(d)
      return undoed.content
    })
  }

  private setMonitorEvents() {
    this.paneMonitor.setOnNewJoined(member => {
      if (member.memberType === MemberType.WEB_SUBTITLER) {
        this.paneChat.addSystemMessage(`(${T.t('login','Chat')} : ${member.name})`)
      } else {
        this.paneChat.addSystemMessage(`(${T.t('New viewer','Chat')} : ${member.name})`)
      }
    })

    this.paneMonitor.setOnLeft(member => {
      if (member.memberType === MemberType.WEB_SUBTITLER) {
        this.paneChat.addSystemMessage(`(${T.t('logout','Chat')} : ${member.name})`)
      } else {
        this.paneChat.addSystemMessage(`(${T.t('A viewer left','Chat')} : ${member.name})`)
      }
    })
  }

  private setChatEvents() {
    this.paneChat.setGetFkey((ix) => {
      return this.paneFkey.getFKey(ix)
    })
    this.paneChat.setOnSend((text) => {
      this.comm.send_room(ContentUtil.makeChatData(text))
      this.paneChat.addMessage(TmpConfig.getName(), text)
    })
    this.paneChat.setOnSendSystem((type,arg) => {
      this.comm.send_room(ContentUtil.makeChatSystemData(type,arg))
      this.paneChat.addChatSystemMessage(TmpConfig.getName(), type, arg)
    })
  }

  private setPftEvents() {
    // Events about PFT itself
    this.panePft.setOnSend((text) => {
      //this.comm.send_room(ContentUtil.makeDisplayData(text))
      this.sendMain(text)
    })
    this.panePft.setOnGross((lines) => {
      //this.comm.send_room(ContentUtil.makeGrossData(lines.join("\n")))
      this.sendGross(lines)
    })
    this.panePft.setOnChange((aLines,bLines) => {
      const a = aLines.join("\n")
      const b = bLines.join("\n")
      const data = this.comm.queue_room(ContentUtil.makePftMonData(a,b))
      this.panePftMon.update(data.A, data.B, data)
    })
    this.panePft.setGetFkey((ix) => {
      return this.paneFkey.getFKey(ix)
    })

    // Events about PFT file
    this.panePft.setOnOpenCommand((i) => {
      this.pftFileController.openDialogAndReadFile(".mk8,.txt")
    })
    this.panePft.setOnSaveCommand((text,name) => {
      const label = T.t("file name", "General")
      this.dialogInput.onOkClick = (filename => {
        this.panePft.NotifyPftSaved(filename)
        Downloader.start(filename, text)
      })
      this.dialogInput.showDialog(label,name)
    })
    this.pftFileController.onLoad = (ev,file,text) => {
      if (ev.target?.result == null) return
      this.panePft.NotifyPftOpened(text,file)
    }
    this.pftFileController.onError = (ev,file) => {
      alert(`Error loading ${file.name} : ${ev.target?.error}`)
    }
  }

  // ==================== Configurations ====================

  private reflectNewConfig() {
    const locale = AppConfig.data.getLocale()
    Log.w("Info",`new config : locale=[${locale}]`)
    T.setLocale(locale)
    this.updateAllConfig()
  }

  private setSubtitlerStyle() {
    this.isViewer = false
    this.setSplits()
    this.paneMain.setViewerMode(this.isViewer)
    this.paneMain.updateConfig()
    this.appControl.hideShortState()
    this.paneContainer2.show()
    this.paneContainer3.show()
    this.paneContainer1.setDefault()
    // TODO
    this.paneInput.show()
    this.paneMonitor.show()
    this.appControl.goBottom()
    this.paneInput.focus()
  }

  private setViewerStyle() {
    this.isViewer = true
    this.unsetSplits()
    this.paneMain.setViewerMode(this.isViewer)
    this.paneMain.updateConfig()
    this.appControl.showShortState()
    this.paneContainer2.hide()
    this.paneContainer3.hide()
    this.paneContainer1.setFullWidth()
    this.paneInput.hide()
    this.paneMonitor.hide()
    this.appControl.goTop()
  }

  private updateSomeConfigs(names: string[]) {
    for (var name of names) {
      Log.w("Info",`config updated [${name}]`)
      switch (name) {
        case "misc": {
          this.updateConfig();
          break;
        }
        case "main": {
          this.paneMain.updateConfig();
          break;
        }
        case "input": {
          this.paneInput.updateConfig();
          break;
        }
        case "chat": {
          this.paneChat.updateConfig();
          break;
        }
        case "monitor": {
          this.paneMonitor.updateConfig();
          break;
        }
        case "pft": {
          this.panePft.updateConfig();
          break;
        }
        case "pftMon": {
          this.panePftMon.updateConfig();
          break;
        }
        case "fkey": {
          this.paneFkey.updateConfig();
          break;
        }
      }
    }
  }

  private updateAllConfig() {
    this.updateConfig()
    this.paneMain.updateConfig();
    this.paneInput.updateConfig();
    this.paneChat.updateConfig();
    this.paneMonitor.updateConfig();
    this.panePft.updateConfig();
    this.panePftMon.updateConfig();
    this.paneFkey.updateConfig();
  }

  private updateConfig() {
    const locale = AppConfig.data.getLocale()
    T.setLocale(locale)
    this.localizeAll()
  }

  private setSplits() {
    const gutterWidth = 6
    if (this.splitContainer == null) {
      this.splitContainer = Split(['#pane1','#pane2','#pane3'],{
        sizes: [
          AppConfig.data.misc_pane1_width, 
          AppConfig.data.misc_pane2_width, 
          AppConfig.data.misc_pane3_width,
        ],
        direction: 'horizontal',
        gutterSize: gutterWidth,
        onDragEnd: sizes => {
          AppConfig.data.misc_pane1_width = sizes[0]
          AppConfig.data.misc_pane2_width = sizes[1]
          AppConfig.data.misc_pane3_width = sizes[2]
          this.paneMain.updateScreen()
        },
      })
    } else {
      this.splitContainer.setSizes([
        AppConfig.data.misc_pane1_width, 
        AppConfig.data.misc_pane2_width, 
        AppConfig.data.misc_pane3_width,
      ])
    }

    if (this.splitDisplayMonitor == null) {
      this.splitDisplayMonitor = Split(['#display-input', '#monitor'],{
        sizes: [
          AppConfig.data.misc_display_input_height,
          AppConfig.data.misc_monitor_height,
        ],
        direction: 'vertical',
        gutterSize: gutterWidth,
        onDragEnd: sizes => {
          AppConfig.data.misc_display_input_height = sizes[0]
          AppConfig.data.misc_monitor_height = sizes[1]
          this.paneMain.updateScreen()
        },
      })
    } else {
      this.splitDisplayMonitor.setSizes([
        AppConfig.data.misc_display_input_height,
        AppConfig.data.misc_monitor_height,
      ])
    }

    if (this.splitPft == null) {
      this.splitPft = Split(['#pft', '#pftMon'],{
        sizes: [
          AppConfig.data.misc_pft_height,
          AppConfig.data.misc_pftmon_height,
        ],
        direction: 'vertical',
        gutterSize: gutterWidth,
        onDragEnd: sizes => {
          AppConfig.data.misc_pft_height = sizes[0]
          AppConfig.data.misc_pftmon_height = sizes[1]
        },
      })
    } else {
      this.splitPft.setSizes([
        AppConfig.data.misc_pft_height,
        AppConfig.data.misc_pftmon_height,
      ])
    }
  }

  private unsetSplits() {
    if (this.splitContainer != null) {
      this.splitContainer.destroy(true)
      delete this.splitContainer
    }
    if (this.splitDisplayMonitor != null) {
      this.splitDisplayMonitor.destroy(true)
      delete this.splitDisplayMonitor
    }
    if (this.splitPft != null) {
      this.splitPft.destroy(true)
      delete this.splitPft
    }
  }

  private localizeAll() {
    this.localize()
    this.paneInput.localize()
    this.paneChat.localize()
    this.paneMonitor.localize()
    this.panePft.localize()
    this.panePftMon.localize()
    this.paneFkey.localize()
  }

  private onPeerIdAcquired(id:string) {
    this.id = id
  }

  private onJoined() {
    this.paneMain.updateScreen() // make sure update after CSS reflow finished
    this.comm.send_room(ContentUtil.makeLoginData())
  }

  private onLeft() {
    if (this.dialogLogin == null) return
    if (this.isErrorHandling) return // avoid during communication-error dialog appearing (after close it, this method is called)
    if (this.dialogLogin.isShown()) return // already shown
    this.dialogLogin.setRoom(this.roomName)
    this.dialogLogin.setName(TmpConfig.getName())
    const initialRoom = this.getInitialRoomIfLegit()
    if (initialRoom === '') {
      this.updatePageTitleWithRoom('')
      this.updateUrlWithRoom('')
    }
    this.paneMonitor.clearMembers()
    const isSubtitler = TmpConfig.getMemberType() === MemberType.WEB_SUBTITLER
    const hasMain = this.paneMain.hasMainLog() && isSubtitler
    const hasChat = this.paneChat.hasLog() && isSubtitler
    this.dialogLogin.showDialog(hasMain, hasChat)
  }

  private onSomeoneJoined(id:string) {
    // nop
  }

  private onSomeoneLeft(id:string) {
    // you can catch leaving like operation (reload,etc.)
    this.paneMonitor.deleteMember(id)
  }

  private onReceived(data:Content) {
    const member = MemberInfoClass.fromContent(data)
    if (ContentType.LOGIN in data) {
      this.comm.send_room(ContentUtil.makeResponseData())
    }

    if (ContentType.RESPONSE in data) {
      // nop
    }

    if (ContentUtil.hasDisplayData(data)) {
      const item = MekikuUnitDataClass.fromContent(data)
      item.contentType = ContentType.DISPLAY
      item.content = data.D
      this.paneMain.notifyNewItem(item)
    }
    if (ContentUtil.hasGrossData(data)) {
      this.paneMain.addNewGross(data)
    }

    if (ContentUtil.hasUndoData(data)) {
      this.paneMain.addNewUndo(data)
    }
    if (ContentType.HB in data) {
    }

    if (TmpConfig.getMemberType() === MemberType.WEB_SUBTITLER) {
      if (ContentUtil.hasChatData(data)) {
        this.paneChat.addMessage(data.senderName, data.C)
      }
      if (ContentUtil.hasChatSystemData(data)) {
        this.paneChat.addChatSystemMessage(data.senderName, data.C_TYPE, data.C_ARG)
      }
      if (ContentUtil.hasMonitorData(data)) {
        member.inputContent = data.M
      }
      if (ContentUtil.hasPftMonData(data)) {
        this.panePftMon.update(data.A, data.B, data)
      }
    }

    if (ContentType.LOGOFF in data) {
      this.paneMonitor.deleteMember(data.senderID)
    } else {
      this.paneMonitor.updateMember(member, data)
    }
    this.paneMain.notifyNewItemsFinish()
  }

  private onAuthError() {
    // Show auth-error on login dialog
    this.dialogNotify.onOkClick = () => {
      this.onLeft()
    }
    this.dialogNotify.showDialog(
      T.t("Error","General"), 
      T.t("Login failed.","Login")
    )
  }

  private onCommunicationError(err:any) {
    // Logout (if not done) and show notification dialog
    this.isErrorHandling = true
    this.comm.leaveRoom()
    this.dialogNotify.onOkClick = () => {
      this.isErrorHandling = false
      this.onLeft()
    }
    const detail = (err.message != null) 
      ? "\n" + T.t("Detail","General") + " : " + err.message 
      : ""
    this.dialogNotify.showDialog(
      T.t("Error","General"), 
      T.t("Communication error.","General") + detail
    )
  }

  private onSomeError(err:any) {
    // Logout (if not done) and show notification dialog
    this.isErrorHandling = true
    this.comm.leaveRoom()
    this.dialogNotify.onOkClick = () => {
      this.isErrorHandling = false
      this.onLeft()
    }
    const detail = (err.message != null) 
      ? "\n" + T.t("Detail","General") + " : " + err.message 
      : ""
    this.dialogNotify.showDialog(
      T.t("Error","General"), 
      T.t("Communication error.","General") + detail
    )
  }

  private onPeerError(err:any) {
    if (err.type === "authentication") {
      this.onAuthError()
    } else if (err.type === "socket-error") {
      this.onCommunicationError(err)
    } else {
      this.onSomeError(err)
    }
  }

  private makeCommEventHandlers() : MekikuCommEvents {
    const r = new MekikuCommEvents()
    r.onPeerIdAcquired = (id) => { this.onPeerIdAcquired(id) }
    r.onPeerError = (err) => { this.onPeerError(err) }
    r.onJoinedRoom = () => { this.onJoined() }
    r.onLeftRoom = () => { this.onLeft() }
    r.onReceived = (data) => { this.onReceived(data) }
    r.onSomeoneJoined = (id) => { this.onSomeoneJoined(id) }
    r.onSomeoneLeft = (id) => { this.onSomeoneLeft(id) }
    r.logger = (msg) => { Log.w("Comm", msg) }
    return r
  }

  private onBeforeUnload(ev:BeforeUnloadEvent) : string | undefined {
    if (this.comm?.isInRoom() === true) {
      // if in room, confirm if unload is of intention
      ev.preventDefault()
      ev.returnValue = "Truly exit?" // these literals are not used by browsers
      return "Truly exit?"
    }
  }

  private onUnload(ev:Event) {
    if (this.comm?.isInRoom() === true) {
      this.comm.send_room(ContentUtil.makeLogoffData())
      this.comm.leaveRoom()
    }
    const config = AppConfig.getJSON()
    localStorage.setItem('config',config)
  }

  private setEvents() {
    window.addEventListener('resize', ev => {
      this.paneMain.updateScreen()
    })
    document.addEventListener('visibilitychange', ev => {
      if (document.hidden) {
        this.paneMain.stopScrollAndJumpToLatest()
      }
    })
    document.addEventListener('keydown', ev => {
      // no F5 reload when logged in
      if (ev.key === "F5" && this.comm.isInRoom()) {
        ev.preventDefault()
        ev.stopImmediatePropagation()
        ev.stopPropagation()
      }

      // no F1 reload when logged in
      if (ev.key === "F1" && this.comm.isInRoom()) {
        ev.preventDefault()
        ev.stopImmediatePropagation()
        ev.stopPropagation()
      }

      // shortcuts
      const ifCmdOrCtrlOnly = UtilDom.isCommandOrControlPressed(ev) && (!ev.shiftKey)
      if (ifCmdOrCtrlOnly) {
        const key = ev.key.toLowerCase()
        if (key in this.panes) {
          this.panes[key].focus()
          ev.preventDefault()
          ev.stopImmediatePropagation()
          ev.stopPropagation()
        }
      }

      if (ev.key === "o" && ifCmdOrCtrlOnly) {
        ev.preventDefault()
        ev.stopImmediatePropagation()
        ev.stopPropagation()
        // open config open dialog
      }
      if (ev.key === "s" && ifCmdOrCtrlOnly) {
        ev.preventDefault()
        ev.stopImmediatePropagation()
        ev.stopPropagation()
        // download config open dialog
      }
    })
  }

  private localize() {
    const targets = document.getElementsByClassName("l10n");
    for (const target of targets) {
      const id = target.id;
      const el = document.getElementById(id);
      if (el === null) continue;

      // l10n-items should have textContent in base language (English).
      // First time, text(English) is copied to "data-key" attribute (not written in HTML)
      // Later, "data-key" is used as key for l10n.
      const key1 = el.dataset["key"]
      const key2 = el.textContent
      var base:string
      if (key1 != null) {
        base = key1
      } else if (key2 != null) {
        base = key2
        el.dataset["key"] = base
      } else {
        Log.w('Warning',`app.localize element[${id}] no textContent.`)
        continue
      }

      const context = el.dataset["context"];
      if (context === undefined) {
        Log.w('Warning',`app.localize element[${id}] data-context not exists.`)
        continue
      }

      const phrase = T.t(base, context);
      el.textContent = phrase;
    }

    const targetsTitle = document.getElementsByClassName("title-l10n");
    for (const target of targetsTitle) {
      const id = target.id;
      const el = document.getElementById(id);
      if (el === null) continue;
      const base = el.title;
      if (base === null) continue;
      const context = el.dataset["context"];
      if (context === undefined) continue;
      const phrase = T.t(base, context);
      el.title = phrase;
    }
  }

}

export default App
