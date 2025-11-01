import { is } from "@electron-toolkit/utils";
import { BaseWindow, WebContentsView } from "electron";
import { join } from "path";

export class TopBar {
  private webContentsView: WebContentsView;
  private baseWindow: BaseWindow;
  private readonly HEIGHT = 88; // Fixed height for topbar
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
        preload: join(__dirname, "../preload/topbar.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Need to disable sandbox for preload to work
      },
    });

    // Load the TopBar React app
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      // In development, load through Vite dev server
      const topbarUrl = new URL(
        "/topbar/",
        process.env["ELECTRON_RENDERER_URL"],
      );
      void webContentsView.webContents.loadURL(topbarUrl.toString());
    } else {
      void webContentsView.webContents.loadFile(
        join(__dirname, "../renderer/topbar.html"),
      );
    }

    return webContentsView;
  }

  private setupBounds(): void {
    const bounds = this.baseWindow.getBounds();
    const yOffset = this._isVisible ? 0 : -this.HEIGHT;
    this.webContentsView.setBounds({
      x: 0,
      y: yOffset,
      width: bounds.width,
      height: this.HEIGHT,
    });
  }

  updateBounds(): void {
    this.setupBounds();
  }

  get view(): WebContentsView {
    return this.webContentsView;
  }

  // Hide with animation
  hide(): void {
    this._isVisible = false;
    this.animatePosition(0, -this.HEIGHT);
  }

  // Show with animation
  show(): void {
    this._isVisible = true;
    this.animatePosition(-this.HEIGHT, 0);
  }

  // Show temporarily (on hover)
  showTemporarily(): void {
    this.animatePosition(-this.HEIGHT, 0);
  }

  // Hide temporarily (on mouse leave)
  hideTemporarily(): void {
    this.animatePosition(0, -this.HEIGHT);
  }

  // Smooth animation for position changes
  private animatePosition(fromY: number, toY: number): void {
    const bounds = this.baseWindow.getBounds();
    const duration = 200; // ms
    const startTime = Date.now();

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        this.webContentsView.setBounds({
          x: 0,
          y: toY,
          width: bounds.width,
          height: this.HEIGHT,
        });
        return;
      }

      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentY = fromY + (toY - fromY) * easedProgress;

      this.webContentsView.setBounds({
        x: 0,
        y: Math.round(currentY),
        width: bounds.width,
        height: this.HEIGHT,
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
}
