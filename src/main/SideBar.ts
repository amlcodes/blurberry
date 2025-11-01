import { is } from "@electron-toolkit/utils";
import { BaseWindow, WebContentsView } from "electron";
import { join } from "path";

export class SideBar {
  private webContentsView: WebContentsView;
  private baseWindow: BaseWindow;
  private _width: number = 240; // Default width (increased from 72)
  private readonly MIN_WIDTH = 72; // Minimum width (icon-only mode)
  private readonly MAX_WIDTH = 400; // Maximum width
  private _isVisible: boolean = true;

  constructor(baseWindow: BaseWindow) {
    this.baseWindow = baseWindow;
    this.webContentsView = this.createWebContentsView();
    baseWindow.contentView.addChildView(this.webContentsView);
    this.setupBounds();
  }

  private createWebContentsView(): WebContentsView {
    const webContentsView = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, "../preload/sidebar.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Need to disable sandbox for preload to work
      },
    });

    // Load the SideBar React app
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      // In development, load through Vite dev server
      const sidebarUrl = new URL(
        "/sidebar/",
        process.env["ELECTRON_RENDERER_URL"],
      );
      void webContentsView.webContents.loadURL(sidebarUrl.toString());
    } else {
      void webContentsView.webContents.loadFile(
        join(__dirname, "../renderer/sidebar.html"),
      );
    }

    return webContentsView;
  }

  private setupBounds(): void {
    const bounds = this.baseWindow.getBounds();
    const xOffset = this._isVisible ? 0 : -this._width;
    this.webContentsView.setBounds({
      x: xOffset,
      y: 0,
      width: this._width,
      height: bounds.height,
    });
  }

  updateBounds(): void {
    this.setupBounds();
  }

  get view(): WebContentsView {
    return this.webContentsView;
  }

  get width(): number {
    return this._width;
  }

  setWidth(width: number): void {
    // Clamp width between min and max
    this._width = Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, width));
    this.updateBounds();
  }

  // Hide with animation
  hide(): void {
    this._isVisible = false;
    this.animatePosition(0, -this._width);
  }

  // Show with animation
  show(): void {
    this._isVisible = true;
    this.animatePosition(-this._width, 0);
  }

  // Show temporarily (on hover)
  showTemporarily(): void {
    this.animatePosition(-this._width, 0);
  }

  // Hide temporarily (on mouse leave)
  hideTemporarily(): void {
    this.animatePosition(0, -this._width);
  }

  // Smooth animation for position changes
  private animatePosition(fromX: number, toX: number): void {
    const bounds = this.baseWindow.getBounds();
    const duration = 200; // ms
    const startTime = Date.now();

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        this.webContentsView.setBounds({
          x: toX,
          y: 0,
          width: this._width,
          height: bounds.height,
        });
        return;
      }

      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentX = fromX + (toX - fromX) * easedProgress;

      this.webContentsView.setBounds({
        x: Math.round(currentX),
        y: 0,
        width: this._width,
        height: bounds.height,
      });

      setTimeout(animate, 16); // ~60fps
    };

    animate();
  }

  toggleDevTools(): void {
    if (this.webContentsView.webContents.isDevToolsOpened()) {
      this.webContentsView.webContents.closeDevTools();
    } else {
      this.webContentsView.webContents.openDevTools({ mode: "detach" });
    }
  }

  destroy(): void {
    this.baseWindow.contentView.removeChildView(this.webContentsView);
  }
}
