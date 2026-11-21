import type { Ref } from "react";

import { useLingui } from "@lingui/react/macro";
import { Loading } from "@olinfo/quizms/components";

export function Editor({ ready, ref }: { ready: boolean; ref: Ref<HTMLIFrameElement> }) {
  const { t } = useLingui();
  return (
    <>
      <iframe
        ref={ref}
        src="/__blockly_iframe.html"
        className="size-full"
        title={t`Blockly workspace`}
        loading="lazy"
      />
      {!ready && (
        <div className="absolute inset-0 z-50 bg-white">
          <div className="flex h-full text-slate-700">
            <Loading />
          </div>
        </div>
      )}
    </>
  );
}
