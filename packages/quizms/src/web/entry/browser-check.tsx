import { type ReactNode, useEffect, useRef } from "react";

import { Modal } from "@olinfo/react-components";
import type { IResult } from "ua-parser-js";
import { BrowserName } from "ua-parser-js/enums";

import { useUserAgent } from "~/utils";

export function BrowserCheck({ children }: { children: ReactNode }) {
  const ua = useUserAgent();

  const name = ua.browser.name?.replace("Mobile ", "");
  const version = Number(ua.browser.major);

  if (!name || !(name in browserVersions)) {
    return (
      <>
        {children}
        <BrowserModal
          message="stai usando un browser non supportato!"
          description={
            "La piattaforma potrebbe non funzionare correttamente, è consigliato usare Chrome, Safari, Edge o Firefox"
          }
          ua={ua}
        />
      </>
    );
  }

  if (version < browserVersions[name]!.minimum) {
    return (
      <div className="flex grow items-center justify-center m-6 text-center">
        <BrowserWarning
          message={`stai usando una versione di ${name} non supportata!`}
          description={`Per continuare a usare la piattaforma è necessario aggiornare ${name} alla versione più recente.`}
          ua={ua}
        />
      </div>
    );
  }

  if (version < browserVersions[name]!.recommended) {
    return (
      <>
        {children}
        <BrowserModal
          message={`stai usando una versione di ${name} non supportata!`}
          description={`La piattaforma potrebbe non funzionare correttamente, è consigliato aggiornare ${name} alla versione più recente.`}
          ua={ua}
        />
      </>
    );
  }

  return children;
}
BrowserCheck.displayName = "BrowserCheck";

function BrowserModal({
  message,
  description,
  ua,
}: {
  message: string;
  description: string;
  ua: IResult;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (ref.current && !sessionStorage.getItem("browser-check-shown")) {
      ref.current.onclose = () => sessionStorage.setItem("browser-check-shown", "1");
      ref.current.showModal();
    }
  }, []);

  return (
    <Modal ref={ref} title="Browser non supportato">
      <BrowserWarning message={message} description={description} ua={ua} />
    </Modal>
  );
}
BrowserModal.displayName = "BrowserModal";

function BrowserWarning({
  message,
  description,
  ua,
}: {
  message: string;
  description: string;
  ua: IResult;
}) {
  return (
    <div className="prose">
      <p>
        <strong className="text-error">Attenzione:</strong> {message}
      </p>
      <p>{description}</p>
      <p className="text-base-content/50">
        Stai usando {ua.browser.name || "???"} {ua.browser.version || "???"}
        {ua.device.model && ` (${ua.device.model})`}.
      </p>
    </div>
  );
}
BrowserWarning.displayName = "BrowserWarning";

const browserVersions: Partial<Record<string, { minimum: number; recommended: number }>> = {
  [BrowserName.CHROME]: { minimum: 101, recommended: 120 },
  [BrowserName.EDGE]: { minimum: 101, recommended: 120 },
  [BrowserName.FIREFOX]: { minimum: 108, recommended: 126 },
  [BrowserName.SAFARI]: { minimum: 16.4, recommended: 18.0 },
  [BrowserName.OPERA]: { minimum: 106, recommended: 106 },
  [BrowserName.SAMSUNG]: { minimum: 27, recommended: 27 },
};
