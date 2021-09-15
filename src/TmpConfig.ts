export type UserType = 'wi' | 'wv' | ''
export type AuthType = 'none' | 'browser' | 'server'

class TmpConfig {
  static readonly BROWSER_AUTH = 'browser'

  // initial URL (URL might be overwritten)
  private static initialLocation:string = ''
  /**
   * provide initial location object
   * (only with properties, you cannot call methods of Location class)
   * @returns Location-like data-object or null
   */
  static getInitialLocation() : Location|null {
    if (this.initialLocation === '') return null
    return JSON.parse(this.initialLocation) as Location
  }
  /**
   * set initial location. can set only once.
   * (after first call, all calls are ignored)
   * @param location location object (window.location or document.location)
   */
  static setInitialLocation(location:Location) {
    if (this.initialLocation === '') {
      this.initialLocation = JSON.stringify(location)
    }
  }

  // user name
  private static username?:string // cache
  static getName() : string {
    if (this.username == null) {
      this.username = localStorage.getItem('tmp-config-name') || ''
    }
    return this.username
  }
  static setName(name:string) {
    if (name !== this.username) {
      this.username = name
      localStorage.setItem('tmp-config-name', name)
    }
  }

  // user member-type
  private static memberType:string = '';
  static getMemberType() : string {
    return this.memberType
  }
  static setMemberType(memberType:string) {
    this.memberType = memberType
  }

  // API key
  private static apiKey:string = ''
  static getApiKey() : string {
    return this.apiKey
  }
  static setApiKey(key:string) {
    this.apiKey = key
  }

  private static debugLevel:number = 1
  static getDebugLevel() : number {
    return this.debugLevel
  }
  static setDebugLevel(level:number) {
    this.debugLevel = level
  }

  private static authUrl:string = ''
  /**
   * Provide authorization URL
   * @returns URL ends with '/', ''(no-auth) or 'browser'
   */
  static getAuthUrl() : string {
    return this.authUrl
  }
  static setAuthUrl(url:string) {
    if (url === '' || url === TmpConfig.BROWSER_AUTH)
    {
      this.authUrl = url
    }
    else
    {
      this.authUrl = url + ((url.endsWith('/')) ? '' : '/')
    }
  }
  static getAuthType() : AuthType {
    if (this.authUrl === '') return 'none'
    if (this.authUrl === TmpConfig.BROWSER_AUTH) return 'browser'
    return 'server'
  }
  static useServer() : boolean {
    return this.getAuthType() === 'server';
  }

  private static userType:UserType = ''
  static getUserType() : UserType {
    return this.userType
  }
  static setUserType(t:UserType) {
    this.userType = t
  }

  private static zoomUrl:string = ''
  static getZoomUrl() : string {
    return this.zoomUrl
  }
  static setZoomUrl(url:string) {
    if (this.useServer() !== true) {
      this.zoomUrl = ''
      return
    }
    if (this.isZoomUrl(url) !== true) {
      this.zoomUrl = ''
      return
    }
    this.zoomUrl = url
  }
  static isZoomAvailable(): boolean {
    return this.isZoomUrl(this.zoomUrl)
  }
  static isZoomUrl(url:string) : boolean {
    return /^https:\/\/([A-Za-z0-9_\-\.]+\.)?zoom\.us\//.test(url)
  }
  static isZoomUrlValid(url:string) : boolean {
    if (url === '') return true
    return this.isZoomUrl(url)
  }

  // Hide/Show buttons(controls) on top-right of viewer screen
  private static ifHideViewerButtons:boolean = false;
  static getIfHideViewerButtons(): boolean {
    return this.ifHideViewerButtons
  }
  static setIfHideViewerButtons(hidden:boolean) {
    this.ifHideViewerButtons = hidden
  }

} // end of TmpConfig

export default TmpConfig
