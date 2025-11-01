export interface GroupColor {
  id: string;
  name: string;
  hex: string;
}

export const GROUP_COLORS: GroupColor[] = [
  { id: "gray", name: "Gray", hex: "#8E8E93" },
  { id: "red", name: "Red", hex: "#FF3B30" },
  { id: "orange", name: "Orange", hex: "#FF9500" },
  { id: "yellow", name: "Yellow", hex: "#FFCC00" },
  { id: "green", name: "Green", hex: "#34C759" },
  { id: "cyan", name: "Cyan", hex: "#5AC8FA" },
  { id: "blue", name: "Blue", hex: "#007AFF" },
  { id: "purple", name: "Purple", hex: "#AF52DE" },
  { id: "pink", name: "Pink", hex: "#FF2D55" },
];

export class Group {
  private _id: string;
  private _title: string;
  private _color: GroupColor;
  private _isCollapsed: boolean;
  private _position: number;

  constructor(
    id: string,
    title: string,
    color: GroupColor = GROUP_COLORS[0],
    isCollapsed: boolean = false,
    position: number = 0,
  ) {
    this._id = id;
    this._title = title;
    this._color = color;
    this._isCollapsed = isCollapsed;
    this._position = position;
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  get color(): GroupColor {
    return this._color;
  }

  set color(value: GroupColor) {
    this._color = value;
  }

  get isCollapsed(): boolean {
    return this._isCollapsed;
  }

  set isCollapsed(value: boolean) {
    this._isCollapsed = value;
  }

  get position(): number {
    return this._position;
  }

  set position(value: number) {
    this._position = value;
  }

  toJSON() {
    return {
      id: this._id,
      title: this._title,
      color: this._color,
      isCollapsed: this._isCollapsed,
      position: this._position,
    };
  }
}
