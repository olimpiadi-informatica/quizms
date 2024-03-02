import React, { useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { saveAs } from "file-saver";
import { Copy, Download } from "lucide-react";

import { Modal } from "~/components";
import Code from "~/mdx/components/code";

type Props = {
  blocks: object;
  js: string;
  svg: string;
};

type Format = "json" | "js" | "svg";

const formats: Record<Format, { label: string; lang: string; mime: string }> = {
  json: {
    label: "Blocchi",
    lang: "json",
    mime: "application/json;charset=utf-8",
  },
  js: {
    label: "JavaScript",
    lang: "javascript",
    mime: "text/javascript;charset=utf-8",
  },
  svg: {
    label: "Immagine",
    lang: "xml",
    mime: "image/svg+xml;charset=utf-8",
  },
};

export default function Debug({ blocks, js, svg }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [format, setFormat] = useState<Format>("json");

  const code = useMemo(() => {
    switch (format) {
      case "json":
        return JSON.stringify(blocks, null, 2);
      case "js":
        return js.replaceAll(/^\s*highlightBlock\('.+'\);\n/gm, "").trimEnd();
      case "svg":
        return svg;
    }
  }, [format, blocks, js, svg]);

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
            {Object.entries(formats).map(([f, { label }]) => (
              <button
                key={f}
                role="tab"
                type="button"
                className={classNames("tab h-full", format === f && "tab-active")}
                onClick={() => setFormat(f as Format)}>
                {label}
              </button>
            ))}
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
              onClick={() =>
                saveAs(new Blob([code], { type: formats[format].mime }), `blocks.${format}`)
              }>
              <Download /> Salva
            </button>
          </div>
        </div>
        <div role="tabpanel" className="mt-3 text-sm *:overflow-x-auto">
          {format !== "svg" && <Code code={code} language={formats[format].lang} />}
          {format === "svg" && (
            <img
              className="mx-auto"
              src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
              alt="Blocchi"
            />
          )}
        </div>
      </Modal>
    </>
  );
}
