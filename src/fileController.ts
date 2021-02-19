import { AppConfig } from "./appConfig"
import { DetectEncoding } from "./detectEncoding"

export class Downloader {
  private static readonly dlLink = document.getElementById('file-download') as HTMLAnchorElement

  static start(filename:string, content:string) {
    this.dlLink.download = filename
    this.dlLink.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}))
    this.dlLink.click()
  }

  private constructor() {}
}

class FileController {
  onAbort: (ev:ProgressEvent<FileReader>, file:File) => void = (e,f) => {}
  onError: (ev:ProgressEvent<FileReader>, file:File) => void = (e,f) => {}
  onLoad: (ev:ProgressEvent<FileReader>, file:File, text:string) => void = (e,f,t) => {}
  private readonly opener:HTMLInputElement

  constructor(idOpener:string) {
    // File element should be different by FileController instance (dlLink can be same)
    this.opener = document.getElementById(idOpener) as HTMLInputElement
    this.opener.onchange = ev => {
      if (this.opener.files?.length === 1) {
        const reader = new FileReader()
        const file = this.opener.files[0]
        reader.onabort = ev => { this.onAbort(ev,file) }
        reader.onerror = ev => { this.onError(ev,file) }
        reader.onload = ev => {
          const buf = ev.target?.result
          if (buf instanceof ArrayBuffer) {
            let encoding = DetectEncoding.detect(buf)
            if (encoding.length < 1) { encoding = AppConfig.data.pft_fallbackEncoding }
            const decoder = new TextDecoder(encoding)
            const text = decoder.decode(buf)
            this.onLoad(ev,file,text)
          }
        }
        // reader.readAsText(file)
        reader.readAsArrayBuffer(file)
      }
    }
  }

  openDialogAndReadFile(filetype:string | undefined) {
    if (filetype != null) {
      this.opener.accept = filetype
    }
    this.opener.click()
  }
}

export default FileController
