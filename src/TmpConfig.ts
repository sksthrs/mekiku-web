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
}

export default TmpConfig
