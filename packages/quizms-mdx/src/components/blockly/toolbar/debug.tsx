import { useEffect, useMemo, useRef, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Code, Modal } from "@olinfo/react-components";
import clsx from "clsx";
import { Copy, Download } from "lucide-react";

type Props = {
  blocks: object;
  js: string;
  svg: string;
};

const formats = {
  json: {
    mime: "application/json;charset=utf-8",
  },
  js: {
    mime: "text/javascript;charset=utf-8",
  },
  svg: {},
};

export function Debug({ blocks, js, svg }: Props) {
  const { t } = useLingui();
  const ref = useRef<HTMLDialogElement>(null);

  const labels: Record<keyof typeof formats, string> = {
    json: t`Blocks`,
    js: "JavaScript",
    svg: t`Image`,
  };

  const [format, setFormat] = useState<keyof typeof formats>("json");

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
      <Button className="btn-error" onClick={() => ref.current?.showModal()}>
        Debug
      </Button>
      <Modal ref={ref} title={t`Debug options`} className="max-w-3xl">
        <div className="not-prose flex items-stretch justify-between gap-4 h-12">
          <div role="tablist" className="tabs-boxed tabs">
            {Object.entries(labels).map(([f, label]) => (
              <button
                key={f}
                role="tab"
                type="button"
                className={clsx("tab h-full", format === f && "tab-active")}
                onClick={() => setFormat(f as keyof typeof formats)}>
                {label}
              </button>
            ))}
          </div>
          {format !== "svg" && (
            <div className="flex gap-2">
              <div className={clsx("tooltip-open", copyTooltip && "tooltip")} data-tip={t`Copied!`}>
                <Button className="btn-error" icon={Copy} onClick={copy}>
                  <Trans>Copy</Trans>
                </Button>
              </div>
              <Button
                className="btn-error"
                icon={Download}
                onClick={async () => {
                  const { saveAs } = await import("file-saver");
                  saveAs(new Blob([code], { type: formats[format].mime }), `blocks.${format}`);
                }}>
                <Trans>Save</Trans>
              </Button>
            </div>
          )}
        </div>
        <div role="tabpanel" className="mt-3 text-sm *:overflow-x-auto">
          {format !== "svg" && (
            <Code
              code={code}
              lang={format}
              className="overflow-hidden rounded-box border border-base-content/40 text-sm *:overflow-x-auto *:p-4"
            />
          )}
          {format === "svg" && (
            <BlocksCanvas uri={`data:image/svg+xml,${encodeURIComponent(svg)}`} />
          )}
        </div>
      </Modal>
    </>
  );
}

function BlocksCanvas({ uri }: { uri: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = uri;
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);

    function onLoad() {
      canvas!.width = img.width;
      canvas!.height = img.height;
      ctx!.drawImage(img, 0, 0);
    }
  }, [uri]);

  return <canvas ref={ref} className="mx-auto min-w-0 max-w-full" />;
}
