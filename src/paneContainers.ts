import { UtilDom } from "./utilDom"

export class PaneContainer1 {
  private readonly pane = document.getElementById('pane1') as HTMLDivElement

  constructor() {
    // nop
  }

  setDefault() {
    this.pane.style.width = "45%"
  }

  setFullWidth() {
    this.pane.style.width = "100%"
  }
}

export class PaneContainer2 {
  private readonly pane = document.getElementById('pane2') as HTMLDivElement

  constructor() {
    // nop
  }

  show() {
    UtilDom.displayOn(this.pane, "flex")
  }

  hide() {
    UtilDom.displayOff(this.pane)
  }
}

export class PaneContainer3 {
  private readonly pane = document.getElementById('pane3') as HTMLDivElement

  constructor() {
    // nop
  }

  show() {
    UtilDom.displayOn(this.pane, "flex")
  }

  hide() {
    UtilDom.displayOff(this.pane)
  }
}
