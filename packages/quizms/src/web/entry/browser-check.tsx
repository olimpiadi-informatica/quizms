import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Modal } from "@olinfo/react-components";
import type { IResult } from "ua-parser-js";
import { BrowserName, BrowserType, EngineName } from "ua-parser-js/enums";

import { hash, useUserAgent } from "~/utils";

export function BrowserCheck({ children }: { children: ReactNode }) {
  const ua = useUserAgent();
  const { t } = useLingui();

  if (ua.browser.type === BrowserType.INAPP) {
    return (
      <>
        {children}
        <BrowserModal
          message={t`you are using a limited version of the browser.`}
          description={t`For a better experience, we recommend switching to the app you usually use to browse the internet`}
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
          message={t`you are using an unsupported browser!`}
          description={t`The platform may not work properly, we recommend using Chrome, Safari or Firefox`}
          ua={ua}
        />
      </>
    );
  }

  if (version < browserVersions[name].minimum) {
    return (
      <div className="flex grow items-center justify-center m-6 text-center">
        <BrowserWarning
          message={t`you are using an unsupported version of ${browserName}!`}
          description={t`To keep using the platform, you need to update ${browserName} to the latest version.`}
          ua={ua}
        />
      </div>
    );
  }

  if (version < browserVersions[name].recommended) {
    return (
      <>
        {children}
        <BrowserModal
          message={t`you are using an unsupported version of ${browserName}!`}
          description={t`The platform may not work properly, we recommend updating ${browserName} to the latest version.`}
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
  const { t } = useLingui();
  const ref = useRef<HTMLDialogElement>(null);
  const uaHash = useMemo(() => hash(JSON.stringify(ua)), [ua]);

  useEffect(() => {
    if (ref.current && !sessionStorage.getItem(`browser-check-shown-${uaHash}`)) {
      ref.current.onclose = () => sessionStorage.setItem(`browser-check-shown-${uaHash}`, "1");
      ref.current.showModal();
    }
  }, [uaHash]);

  return (
    <Modal ref={ref} title={t`Unsupported browser`}>
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
  const browser = ua.browser.name || "???";
  const version = ua.browser.version || "???";
  const device = ua.device.model ? ` (${ua.device.model})` : "";

  return (
    <div className="prose">
      <p>
        <Trans>
          <strong className="text-error">Warning:</strong> {message}
        </Trans>
      </p>
      <p>{description}</p>
      <p className="text-base-content/50">
        <Trans>
          You are using {browser} {version}
          {device}.
        </Trans>
      </p>
    </div>
  );
}
BrowserWarning.displayName = "BrowserWarning";

const browserVersions: Record<string, { minimum: number; recommended: number }> = {
  [BrowserName.CHROMIUM]: { minimum: 109, recommended: 120 },
  [BrowserName.FIREFOX]: { minimum: 121, recommended: 126 },
  [BrowserName.SAFARI]: { minimum: 17.0, recommended: 18.0 },
};
