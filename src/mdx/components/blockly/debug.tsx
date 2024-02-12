import React, { useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { saveAs } from "file-saver";
import { Copy, Download } from "lucide-react";

import { Modal } from "~/components";
import Code from "~/mdx/components/code";

type Props = {
  blocks: object;
  js: string;
};

export default function Debug({ blocks, js }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [lang, setLang] = useState<"json" | "js">("json");

  const code = useMemo(() => {
    if (lang === "json") {
      return JSON.stringify(blocks, null, 2);
    } else {
      return js.replaceAll(/^\s*highlightBlock\('.+'\);\n/gm, "").trimEnd();
    }
  }, [blocks, js, lang]);

  const [copyTooltip, setCopyTooltip] = useState<number>();
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopyTooltip((prev) => {
      clearTimeout(prev);
      return setTimeout(() => setCopyTooltip(undefined), 1000) as unknown as number;
    });
  };

  return (
    <>
      <button className="btn btn-error" onClick={() => ref.current?.showModal()}>
        Debug
      </button>
      <Modal ref={ref} title="Opzioni di debug" className="max-w-3xl">
        <div className="not-prose flex items-stretch justify-between gap-3">
          <div role="tablist" className="tabs-boxed tabs">
            <button
              role="tab"
              type="button"
              className={classNames("tab h-full", lang === "json" && "tab-active")}
              onClick={() => setLang("json")}>
              Blocchi
            </button>
            <button
              role="tab"
              type="button"
              className={classNames("tab h-full", lang === "js" && "tab-active")}
              onClick={() => setLang("js")}>
              JavaScript
            </button>
          </div>
          <div className="flex gap-3">
            <div
              className={classNames("tooltip-open", copyTooltip && "tooltip")}
              data-tip="Copiato!">
              <button
                type="button"
                className="!btn !btn-error"
                onClick={() => copy()}
                data-tip="Copiato!">
                <Copy /> Copia
              </button>
            </div>
            <button
              type="button"
              className="!btn !btn-error"
              onClick={() => saveAs(code, `blocks.${lang}`)}>
              <Download /> Salva
            </button>
          </div>
        </div>
        <div role="tabpanel" className="mt-3 text-sm">
          <Code code={code} language={lang} />
        </div>
      </Modal>
    </>
  );
}
