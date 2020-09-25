class TmpConfig {
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
  static getAuthUrl() : string {
    return this.authUrl
  }
  static setAuthUrl(url:string) {
    this.authUrl = url
  }
}

export default TmpConfig
