import { BrowserProvider } from "@common/contexts/BrowserContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SidebarToolbar } from "./components/SidebarToolbar";
import { VerticalTabBar } from "./components/VerticalTabBar";

export const SideBarApp: React.FC = () => {
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(240);

  useEffect(() => {
    // Get initial sidebar width
    const getInitialWidth = async (): Promise<void> => {
      const width = await window.sideBarAPI.getSidebarWidth();
      setSidebarWidth(width);
    };
    void getInitialWidth();
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      resizeStartXRef.current = e.clientX;
      resizeStartWidthRef.current = sidebarWidth;
      e.preventDefault();
    },
    [sidebarWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent): void => {
      const delta = e.clientX - resizeStartXRef.current;
      const newWidth = Math.max(
        72,
        Math.min(400, resizeStartWidthRef.current + delta),
      );
      setSidebarWidth(newWidth);
      void window.sideBarAPI.resizeSidebar(newWidth);
    };

    const handleMouseUp = (): void => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <BrowserProvider api={window.sideBarAPI}>
      <div className="h-full w-full flex flex-row bg-background select-none relative">
        <div className="flex-1 flex flex-col border-r border-border dark:border-border">
          {/* macOS traffic lights spacing at top */}
          <div className="h-14 app-region-drag shrink-0" />

          {/* Toolbar with navigation controls */}
          <SidebarToolbar />

          {/* Vertical Tab Bar */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <VerticalTabBar />
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors app-region-no-drag z-50"
          onMouseDown={handleMouseDown}
          style={{
            backgroundColor: isResizing
              ? "rgba(59, 130, 246, 0.5)"
              : "transparent",
          }}
        />
      </div>
    </BrowserProvider>
  );
};
