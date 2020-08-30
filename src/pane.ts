export interface Pane {
  getName() : string;
  focus() : void;
  toggle() : void;
  updateConfig() : void;
}
