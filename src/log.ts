import {Util} from "./util"

class Log {
  static w(level:string, message:string) {
    const n = Util.getNowUTCTimeString()
    console.log(`${n} [${level}] ${message}`)
  }
}

export default Log
