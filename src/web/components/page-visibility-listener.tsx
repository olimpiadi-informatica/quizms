import { Modal } from "@olinfo/react-components";
import { useCallback, useEffect, useRef, useState } from "react";

const WARNING_DELAY_MS = 500;
// IMPORTANTE: in alcuni dispositivi mobile non è possibile mettere a schermo intero. Per cui eventuali segnalazioni dovrebbero essere forse solo fatte nel caso l'utente esca dalla pagina
export function PageVisibilityListener({ onWarning }: { onWarning?: () => void }) {
  const lastHidden = useRef<boolean | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pendingTimerID = useRef<number | null>(null);

  const [isCtxFullScreen, setIsCtxFullScreen] = useState(false);

  const openDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.showModal === "function") {
      if (!d.open) {
        try {
          d.showModal();
        } catch {}
      }
    } else {
      d.setAttribute("open", "");
    }
  }, []);

  const closeDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.close === "function") {
      try {
        d.close();
      } catch {
        d.removeAttribute("open");
      }
    } else {
      d.removeAttribute("open");
    }
  }, []);

  const handleGoFullScreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        closeDialog();
        return;
      }

      await document.documentElement.requestFullscreen();
      closeDialog();
    } catch (err) {
      console.error("Error attempting to enable full-screen mode:", err);
    }
  }, [closeDialog]);

  const scheduleWarning = useCallback(() => {
    onWarning?.();
    if (pendingTimerID.current) {
      clearTimeout(pendingTimerID.current);
    }
    const timerId = window.setTimeout(() => {
      openDialog();
      pendingTimerID.current = null;
    }, WARNING_DELAY_MS);

    pendingTimerID.current = timerId;
  }, [openDialog, onWarning]);

  const cancelWarning = useCallback(() => {
    if (pendingTimerID.current) {
      clearTimeout(pendingTimerID.current);
      pendingTimerID.current = null;
    }
  }, []);

  useEffect(() => {
    const isFullScreen = () => !!document.fullscreenElement;

    const updateFsState = () => setIsCtxFullScreen(isFullScreen());

    const onHidden = () => scheduleWarning();
    const onVisible = () => cancelWarning();

    const handleVisibility = () => {
      const hidden = document.hidden;
      if (lastHidden.current === hidden) return;
      lastHidden.current = hidden;

      if (!hidden && !isFullScreen()) {
        onHidden();
        return;
      }

      hidden ? onHidden() : onVisible();
    };

    const handleBlur = () => {
      const active = document.activeElement;
      if (active instanceof HTMLIFrameElement && active.classList.contains("iframe_blockly")) {
        if (isFullScreen()) {
          onVisible();
        } else {
          onHidden();
        }
        return;
      }
      onHidden();
    };

    const handleFocus = () => {
      if (!isFullScreen()) {
        onHidden();
        return;
      }
      onVisible();
    };

    const handleFullScreenChange = () => {
      updateFsState();

      if (isFullScreen()) {
        if (!document.hidden) {
          onVisible();
        }
      } else {
        onHidden();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    if (!isFullScreen()) {
      scheduleWarning();
    }
    updateFsState();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullScreenChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      cancelWarning();
      closeDialog();
    };
  }, [closeDialog, scheduleWarning, cancelWarning]);

  return (
    <Modal ref={dialogRef} title="Attenzione">
      <div className="flex flex-col items-center justify-center pt-3 gap-6">
        <span className="pt-1 font-mono text-3xl text-center">
          Durante la gara, devi stare a schermo intero e non puoi uscire dalla pagina!
        </span>

        <button
          type="button"
          onClick={handleGoFullScreen}
          className="rounded bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          {isCtxFullScreen ? "Riprendi" : "Torna a Schermo Intero"}
        </button>
      </div>
    </Modal>
  );
}
