import { is } from "@electron-toolkit/utils";
import { BaseWindow, WebContentsView } from "electron";
import { join } from "path";
import { LLMClient } from "./LLMClient";

export class SideBar {
  private webContentsView: WebContentsView;
  private baseWindow: BaseWindow;
  private llmClient: LLMClient;
  private isVisible: boolean = true;

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
        preload: join(__dirname, "../preload/sidebar.js"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false, // Need to disable sandbox for preload to work
      },
    });

    // Load the Sidebar React app
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
    // Always set the sidebar bounds to allow animation to render
    // The React component handles the visual hide/show animation
    this.webContentsView.setBounds({
      x: bounds.width - 400, // 400px width sidebar on the right
      y: 88, // Start below the topbar
      width: 400,
      height: bounds.height - 88, // Subtract topbar height
    });
  }

  updateBounds(): void {
    // Always update bounds - let React handle the visual animation
    this.setupBounds();
  }

  get view(): WebContentsView {
    return this.webContentsView;
  }

  get client(): LLMClient {
    return this.llmClient;
  }

  show(): void {
    this.isVisible = true;
    // Notify renderer of visibility change FIRST so animation can start
    this.webContentsView.webContents.send("sidebar-visibility-changed", true);
  }

  hide(): void {
    this.isVisible = false;
    // Notify renderer of visibility change FIRST so animation can play
    this.webContentsView.webContents.send("sidebar-visibility-changed", false);
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
