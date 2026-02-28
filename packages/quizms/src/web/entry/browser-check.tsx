import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { Modal } from "@olinfo/react-components";
import type { IResult } from "ua-parser-js";
import { BrowserName, BrowserType, EngineName } from "ua-parser-js/enums";

import { hash, useUserAgent } from "~/utils";

export function BrowserCheck({ children }: { children: ReactNode }) {
  const ua = useUserAgent();

  if (ua.browser.type === BrowserType.INAPP) {
    return (
      <>
        {children}
        <BrowserModal
          message="stai usando una versione limitata del browser."
          description={
            "Per un'esperienza migliore ti consigliamo di passare all'app che usi di solito per navigare su internet"
          }
          ua={ua}
        />
      </>
    );
  }

  const browserName = ua.browser.name?.replace("Mobile ", "");
  const engineMajorVersion = ua.engine.version?.split(".")[0];

  const { name, version } =
    ua.engine.name === EngineName.BLINK && engineMajorVersion
      ? { name: BrowserName.CHROMIUM, version: Number(engineMajorVersion) }
      : { name: browserName, version: Number(ua.browser.major) };

  if (!name || !(name in browserVersions)) {
    return (
      <>
        {children}
        <BrowserModal
          message="stai usando un browser non supportato!"
          description={
            "La piattaforma potrebbe non funzionare correttamente, è consigliato usare Chrome, Safari o Firefox"
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
          message={`stai usando una versione di ${browserName} non supportata!`}
          description={`Per continuare a usare la piattaforma è necessario aggiornare ${browserName} alla versione più recente.`}
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
          message={`stai usando una versione di ${browserName} non supportata!`}
          description={`La piattaforma potrebbe non funzionare correttamente, è consigliato aggiornare ${browserName} alla versione più recente.`}
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
  const uaHash = useMemo(() => hash(JSON.stringify(ua)), [ua]);

  useEffect(() => {
    if (ref.current && !sessionStorage.getItem(`browser-check-shown-${uaHash}`)) {
      ref.current.onclose = () => sessionStorage.setItem(`browser-check-shown-${uaHash}`, "1");
      ref.current.showModal();
    }
  }, [uaHash]);

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
  [BrowserName.CHROMIUM]: { minimum: 101, recommended: 120 },
  [BrowserName.FIREFOX]: { minimum: 108, recommended: 126 },
  [BrowserName.SAFARI]: { minimum: 16.4, recommended: 18.0 },
};
