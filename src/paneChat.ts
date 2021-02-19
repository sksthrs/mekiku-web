import { AppConfig } from "./appConfig";
import { Pane } from "./pane";
import { Util } from "./util";
import { T } from "./t";
import { UtilDom } from "./utilDom";

export class PaneChat implements Pane {
  getName() { return "PaneChat"; }

  private readonly pane = document.getElementById('chat') as HTMLDivElement
  private readonly titlebar = document.getElementById('chat-title') as HTMLDivElement
  private logArea = document.getElementById("chat-log") as HTMLTextAreaElement;
  private inputArea = document.getElementById("chat-input") as HTMLInputElement;
  private buttonStart = document.getElementById("chat-timer-start") as HTMLButtonElement;
  private buttonPause = document.getElementById("chat-timer-pause") as HTMLButtonElement;
  private buttonResetTimer = document.getElementById("chat-timer-reset") as HTMLButtonElement;
  private textTimerNow = document.getElementById("chat-timer-now") as HTMLDivElement;
  private buttonUp = document.getElementById("chat-timer-up") as HTMLButtonElement;
  private buttonDown = document.getElementById("chat-timer-down") as HTMLButtonElement;
  private textTimerValue = document.getElementById("chat-timer-value") as HTMLInputElement;

  private countDownTimerId: number = -1;
  private countDown: number = 0;
  private countDownFrom: number = 0;
  private readonly T_COUNTDOWN = 1000;
  private notifyTimerId: number = -1;
  private readonly T_NOTIFY = 500;

  private isOnShow:boolean = false;

  constructor() {
    this.localize()

    this.inputArea.addEventListener("keydown", (ev: KeyboardEvent) => {
      // Only on macOS, when some key is typed while IME input, ev.key is same as when not IME inputing.
      // https://qiita.com/ledsun/items/31e43a97413dd3c8e38e
      if (ev.keyCode === UtilDom.KEY_ENTER) {
        this.onSend(this.inputArea.value);
        this.inputArea.value = "";
      } else if (ev.keyCode === UtilDom.KEY_ESC) {
        this.inputArea.value = "";
      }
      const iFkey = UtilDom.getCtrlOrFKeyNumber(ev) - 1;
      if (iFkey >= 0 && iFkey < 7) {
        const sFkey = this.getFkey(iFkey);
        if (sFkey.length > 0) { this.insertText(sFkey); }
      }
    });

    this.buttonPause.disabled = true;

    this.configToScreen();
    this.setEventListeners();
  }

  addMessage(sender:string, message:string) {
    this.logArea.value += sender + T.t(" : ", "Chat") + message + "\n";
    this.logArea.scrollTop = this.logArea.scrollHeight;
    this.beginNotify();
  }

  addSystemMessage(message:string) {
    const timestamp = (new Date()).toLocaleTimeString()
    this.logArea.value += message + " (" + timestamp + ")\n";
    this.logArea.scrollTop = this.logArea.scrollHeight;
    this.beginNotify();
  }

  hasLog() : boolean {
    return this.logArea.value.length > 0
  }
  getLog() : string {
    return this.logArea.value
  }

  setOnSend(callback: (message:string) => void) { this.doOnSend = (m) => callback(m); }
  private doOnSend: (message:string) => void = (m) => {};
  private onSend(message:string) { this.doOnSend(message); }

  private getFkey: (ix:number) => string = (ix) => { return ""; }
  setGetFkey(callback: (ix:number) => string) { this.getFkey = (ix) => callback(ix); }

  private setEventListeners() {

    this.buttonUp.addEventListener("click", (mouseEvent) => {
      const newTime = this.timerText2Config() + 1;
      if (this.isTimerPeriodValid(newTime)) {
        this.setTimerPeriod(newTime);
        this.timerConfig2Text();
      }
    });

    this.buttonDown.addEventListener("click", (mouseEvent) => {
      const newTime = this.timerText2Config() - 1;
      if (this.isTimerPeriodValid(newTime)) {
        this.setTimerPeriod(newTime);
        this.timerConfig2Text();
      }
    });

    this.textTimerValue.addEventListener("change", (ev) => {
      this.timerText2Config();
    });

    this.buttonStart.addEventListener("click", (mouseEvent) => {
      this.startCountDown();
    });

    this.buttonPause.addEventListener("click", (mouseEvent) => {
      this.stopCountDown();
    });

    this.buttonResetTimer.addEventListener("click", (mouseEvent) => {
      this.resetCountDown();
    });
  }

  private insertText(text:string) {
    if (this.inputArea.selectionStart == null) return;
    var begin = this.inputArea.selectionStart;
    var end = this.inputArea.selectionStart;
    if (this.inputArea.selectionEnd) {
      begin = Math.min(this.inputArea.selectionStart , this.inputArea.selectionEnd);
      end = Math.max(this.inputArea.selectionStart , this.inputArea.selectionEnd);
    }
    const before = this.inputArea.value.substr(0,begin);
    const after = this.inputArea.value.substr(end);
    this.inputArea.value = before + text + after;
    const newPos = (before+text).length;
    this.inputArea.setSelectionRange(newPos,newPos);
  }

  private startCountDown() {
    if (this.countDownTimerId >= 0) return;

    this.buttonStart.disabled = true;
    this.buttonPause.disabled = false;
    this.buttonResetTimer.disabled = true;

    this.onSend(
      T.t("Timer started. Next ", "Chat")
      + '[' + this.getRemainingTimeText() + ']'
      + ' (' + (new Date()).toLocaleTimeString() + ')'
      );

    this.countDownTimerId = window.setInterval(() => {
      this.onCount();
    }, this.T_COUNTDOWN);
  }

  private onCount() {
    this.countDown--;
    this.updateTimerNow();
    if (this.countDown === 30) {
      this.onSend(
        T.t("30 seconds to next turn.", "Chat")
        + ' (' + (new Date()).toLocaleTimeString() + ')'
        );
    } else if (this.countDown === 0) {
      this.onSend(
        T.t("It's new turn now.", "Chat")
        + ' (' + (new Date()).toLocaleTimeString() + ')'
        );
      const tNow = Number(this.textTimerValue.value);
      if (isNaN(tNow) === false && this.isTimerPeriodValid(tNow)) {
        this.countDownFrom = tNow * 60;
      }
      this.countDown = this.countDownFrom;
    }
  }

  private stopCountDown() {
    if (this.countDownTimerId < 0) return;

    window.clearInterval(this.countDownTimerId);
    this.countDownTimerId = -1;

    this.buttonStart.disabled = false;
    this.buttonPause.disabled = true;
    this.buttonResetTimer.disabled = false;

    this.onSend(
      T.t("Timer halted.", "Chat")
      + ' (' + (new Date()).toLocaleTimeString() + ')'
      );
  }

  private resetCountDown() {
    this.countDownFrom = AppConfig.data.chat_timer * 60;
    this.countDown = this.countDownFrom;
    this.updateTimerNow();
  }

  private updateTimerNow() {
    this.textTimerNow.textContent = this.getRemainingTimeText();
  }

  private getRemainingTimeText() : string {
    const m = Math.floor(this.countDown/60);
    const s = this.countDown - m*60;
    return `${m}:${Util.toStringWithZero(s,2)}`;
  }

  private timerText2Config() : number {
    const t = Number(this.textTimerValue.value);
    if (isNaN(t) || this.isTimerPeriodValid(t) !== true) {
      this.timerConfig2Text();
    } else {
      this.setTimerPeriod(t);
    }
    return this.getTimerPeriod();
  }

  private timerConfig2Text() {
    this.textTimerValue.value = this.getTimerPeriod().toString();
  }

  private getTimerPeriod() : number {
    return AppConfig.data.chat_timer;
  }

  private isTimerPeriodValid(t:number) : boolean {
    return (t >= 1 && t <= 99);
  }

  private setTimerPeriod(t:number) : number {
    if (this.isTimerPeriodValid(t)) {
      AppConfig.data.chat_timer = t;
    }
    return this.getTimerPeriod();
  }

  private beginNotify() {
    if (this.notifyTimerId >= 0) {
      window.clearTimeout(this.notifyTimerId);
    }
    this.logArea.style.backgroundColor = AppConfig.data.chat_notifyColor;
    this.notifyTimerId = window.setTimeout(() => {
      this.endNotify();
    }, this.T_NOTIFY);
  }

  private endNotify() {
    this.logArea.style.backgroundColor = AppConfig.data.chat_backColor;
    this.notifyTimerId = -1;
  }

  private configToScreen() {
    this.logArea.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.chat_font_familyName);
    this.logArea.style.fontSize = AppConfig.data.chat_font_size + "pt";
    this.logArea.style.fontWeight = AppConfig.data.chat_font_isBold ? "bold" : "normal";
    this.logArea.style.color = AppConfig.data.chat_foreColor;
    this.logArea.style.backgroundColor = AppConfig.data.chat_backColor;

    this.inputArea.style.fontFamily = UtilDom.makeFontFamily(AppConfig.data.chat_font_familyName);
    this.inputArea.style.fontSize = AppConfig.data.chat_font_size + "pt";
    this.inputArea.style.fontWeight = AppConfig.data.chat_font_isBold ? "bold" : "normal";
    
    var foreColor = AppConfig.data.chat_foreColor;
    var backColor = AppConfig.data.chat_backColor;
    this.inputArea.style.color = foreColor;
    this.inputArea.style.backgroundColor = backColor;

    this.resetCountDown();
  }

  updateConfig() {
    this.configToScreen();
  }

  setPaneToConfig() {
  }

  localize() {
    this.setTitle(T.t("Chat", "Chat") + Util.getShortcutParenthesized("R"))
  }

  private setTitle(title:string) {
    this.titlebar.textContent = title
  }

  focus() {
    this.inputArea.focus()
  }

  toggle(): void {
    if (UtilDom.isDisplayed(this.pane)) {
      this.hide()
    } else {
      this.show()
    }
  }

  show(): void {
    UtilDom.displayOn(this.pane, "flex")
  }

  hide(): void {
    UtilDom.displayOff(this.pane)
  }

}
