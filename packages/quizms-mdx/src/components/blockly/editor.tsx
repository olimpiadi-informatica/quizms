import { forwardRef, type Ref } from "react";

import { Loading } from "@olinfo/quizms/components";

export const Editor = forwardRef(function Editor(
  { ready }: { ready: boolean },
  ref: Ref<HTMLIFrameElement>,
) {
  return (
    <>
      <iframe
        ref={ref}
        src="/__blockly_iframe.html"
        className="size-full"
        title="Area di lavoro di Blockly"
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
});
