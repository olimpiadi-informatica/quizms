import { useCallback, useEffect } from "react";

export default function useIcp(
  otherWindow: Window | null | undefined,
  onMessage: (data: any) => void,
) {
  useEffect(() => {
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);

    function handler(event: MessageEvent) {
      if (event.source !== otherWindow) return;
      onMessage(event.data);
    }
  }, [otherWindow, onMessage]);

  return useCallback((data: any) => otherWindow?.postMessage(data, "*"), [otherWindow]);
}
