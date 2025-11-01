interface InteractionData {
  visitId: number;
  type: "click" | "input" | "scroll" | "select" | "clipboard" | "keypress";
  selector?: string;
  value?: string;
  x?: number;
  y?: number;
  timestamp: number;
}

declare global {
  interface Window {
    electronAPI: {
      trackInteraction: (data: InteractionData) => void;
    };
  }
}
