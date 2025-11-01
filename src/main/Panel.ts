import { is } from "@electron-toolkit/utils";
import { BaseWindow, WebContentsView } from "electron";
import { join } from "path";
import { LLMClient } from "./LLMClient";

type LayoutMode = "topbar" | "sidebar";

export class Panel {
  private webContentsView: WebContentsView;
  private baseWindow: BaseWindow;
  private llmClient: LLMClient;
  private isVisible: boolean = true;
  private layoutMode: LayoutMode = "topbar";
  private isBarVisible: boolean = true;

  constructor(baseWindow: BaseWindow) {
    this.baseWindow = baseWindow;
    this.webContentsView = this.createWebContentsView();
    baseWindow.contentView.addChildView(this.webContentsView);
    this.setupBounds();

    // Initialize LLM client
    this.llmClient = new LLMClient(this.webContentsView.webContents);
  }

  private createWebContentsView(): WebContentsView {
    const webContentsView = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, "../preload/panel.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Need to disable sandbox for preload to work
      },
    });

    // Load the Panel React app
    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
      // In development, load through Vite dev server
      const panelUrl = new URL("/panel/", process.env["ELECTRON_RENDERER_URL"]);
      void webContentsView.webContents.loadURL(panelUrl.toString());
    } else {
      void webContentsView.webContents.loadFile(
        join(__dirname, "../renderer/panel.html"),
      );
    }

    return webContentsView;
  }

  private setupBounds(): void {
    const bounds = this.baseWindow.getBounds();
    // Position panel on-screen when visible, off-screen when hidden
    const xPosition = this.isVisible ? bounds.width - 400 : bounds.width;

    // Adjust y position and height based on layout mode AND bar visibility
    const yPosition =
      this.layoutMode === "topbar" && this.isBarVisible ? 88 : 0;
    const height =
      this.layoutMode === "topbar" && this.isBarVisible
        ? bounds.height - 88
        : bounds.height;

    this.webContentsView.setBounds({
      x: xPosition,
      y: yPosition,
      width: 400,
      height: height,
    });
  }

  updateBounds(): void {
    this.setupBounds();
  }

  setLayoutMode(mode: LayoutMode): void {
    this.layoutMode = mode;
    this.updateBounds();
  }

  setBarVisibility(isVisible: boolean): void {
    this.isBarVisible = isVisible;
    this.updateBounds();
  }

  get view(): WebContentsView {
    return this.webContentsView;
  }

  get client(): LLMClient {
    return this.llmClient;
  }

  show(): void {
    this.isVisible = true;
    this.animatePosition(false);
    // Notify renderer of visibility change
    this.webContentsView.webContents.send("panel-visibility-changed", true);
  }

  hide(): void {
    this.isVisible = false;
    this.animatePosition(true);
    // Notify renderer of visibility change
    this.webContentsView.webContents.send("panel-visibility-changed", false);
  }

  // Animate panel sliding in/out
  private animatePosition(isHiding: boolean): void {
    const bounds = this.baseWindow.getBounds();
    const duration = 300; // ms
    const startTime = Date.now();

    const startX = isHiding ? bounds.width - 400 : bounds.width;
    const endX = isHiding ? bounds.width : bounds.width - 400;

    // Adjust y position and height based on layout mode AND bar visibility
    const yPosition =
      this.layoutMode === "topbar" && this.isBarVisible ? 88 : 0;
    const height =
      this.layoutMode === "topbar" && this.isBarVisible
        ? bounds.height - 88
        : bounds.height;

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        this.webContentsView.setBounds({
          x: endX,
          y: yPosition,
          width: 400,
          height: height,
        });
        return;
      }

      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentX = startX + (endX - startX) * easedProgress;

      this.webContentsView.setBounds({
        x: Math.round(currentX),
        y: yPosition,
        width: 400,
        height: height,
      });

      setTimeout(animate, 16); // ~60fps
    };

    animate();
  }

  getAnimationDuration(): number {
    // Return animation duration in ms (based on spring animation)
    // Spring with stiffness 400, damping 35, mass 0.7 takes ~400-500ms
    return 500;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
