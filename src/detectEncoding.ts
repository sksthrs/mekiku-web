import Log from "./log";

/**
 * Utility class that detects the encoding of byte-array.
 */
export class DetectEncoding {
  static readonly ENC_UTF8 = "UTF-8";
  static readonly ENC_UTF16LE = "UTF-16LE";
  static readonly ENC_UTF16BE = "UTF-16BE";
  static readonly ENC_UNKNOWN = "";

  /**
   * Detect encoding of input buffer. Returns one of below.
   * - "UTF-8"
   * - "UTF-16LE"
   * - "UTF-16BE"
   * - "" : empty string, other than above
   * 
   * (notice) assumes the buffer "is" string. (binary buffer is out of consideration)
   * 
   * @param buffer buffer to detect
   */
  static detect(buffer : ArrayBuffer) : string {
    // make a view for ArrayBuffer
    const view = new Uint8Array(buffer)

    // BOM detection
    if (buffer.byteLength >= 2 && view[0] === 0xFF && view[1] === 0xFE) {
      return this.ENC_UTF16LE;
    }
    if (buffer.byteLength >= 2 && view[0] === 0xFE && view[1] === 0xFF) {
      return this.ENC_UTF16BE;
    }
    if (buffer.byteLength >= 3 && view[0] === 0xEF && view[1] === 0xBB && view[2] === 0xBF) {
      return this.ENC_UTF8;
    }

    // test first N-octets
    var score_UTF16LE = 0; // number of [xx 00] pattern (very likely in UTF-16LE)
    var score_UTF16BE = 0; // number of [00 xx] pattern (very likely in UTF-16BE)
    let checker_UTF8 = new Utf8Checker();
    const LEN_MAX = 1000;
    const len = (buffer.byteLength < LEN_MAX) ? buffer.byteLength : LEN_MAX;
    for(var i=0 ; i<len ; i++) {
      if ((i % 2) === 1 && view[i] === 0) {
        score_UTF16LE++; // [xx 00] : UTF-16LE encoding of ASCII characters (including CR,LF)
      }
      if ((i % 2) === 0 && view[i] === 0) {
        score_UTF16BE++; // [00 xx] : UTF-16BE encoding of ASCII characters (including CR,LF)
      }
      checker_UTF8.append(view[i]);
    }

    Log.w('info', `detectEncode : UTF16LE:${score_UTF16LE} UTF16BE:${score_UTF16BE} UTF8:d${checker_UTF8.nDetect}/e${checker_UTF8.nError}`);

    if (score_UTF16LE > 0 && score_UTF16BE === 0) {
      return this.ENC_UTF16LE;
    } else if (score_UTF16BE > 0 && score_UTF16LE === 0) {
      return this.ENC_UTF16BE;
    } else if (checker_UTF8.nDetect > 0 && checker_UTF8.nError === 0) {
      return this.ENC_UTF8;
    }

    return this.ENC_UNKNOWN;
  }
}

/**
 * Receive byte stream and detect it is under UTF-8 rule or not.
 */
class Utf8Checker {
  /**
   * gets how many times UTF-8 compliant "characters" detected.
   */
  get nDetect() : number {
    return this._nDetect;
  }
  private _nDetect = 0;

  /**
   * gets how many times byte stream went out of UTF-8 rule.
   * basically this must be zero.
   */
  get nError() : number {
    return this._nError;
  }
  private _nError = 0;

  /** index in bytes of single character (0-3) */
  private index = 0;

  /** length of single character (1-4), determined from the first byte of single character */
  private length = 0;

  constructor() {
  }

  /**
   * append byte from byte stream. Checks automatically whether the encoding is UTF-8 or not.
   * @param b new byte in byte-stream
   */
  append(b: number) {
    // if the top byte of new single character...
    if (this.index === 0) {
      if ((b & 0x80) === 0) {
        this._nDetect++
        this.reset();
      } else if ((b & 0xE0) === 0xC0) {
        this.length = 2;
        this.index++;
      } else if ((b & 0xF0) === 0xE0) {
        this.length = 3;
        this.index++;
      } else if ((b & 0xF8) === 0xF0) {
        this.length = 4;
        this.index++;
      } else {
        this._nError++;
        this.reset();
      }
    } // if 2nd/3rd/4th byte of single character...
    else if ((b & 0xC0) !== 0x80) {
      this._nError++;
      this.reset();
    } else if (this.index === (this.length-1)) {
      this._nDetect++;
      this.reset();
    } else {
      this.index++;
    }
  }

  private reset() {
    this.index = 0;
    this.length = 0;
  }
}
