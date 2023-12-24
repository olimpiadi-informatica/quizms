import React, { useEffect, useState } from "react";

import { ToolboxDefinition } from "blockly/core/utils/toolbox";
import classNames from "classnames";
import { ArrowDown, FastForward, Pause, Play, RotateCcw, Send, SkipForward } from "lucide-react";

import Loading from "~/core/components/loading";
import { Rng } from "~/utils/random";

import useExecutor from "./executor";
import { Input, Output } from "./io";
import useIcp from "./workspaceIpc";

type BlocklyProps = {
  toolbox: ToolboxDefinition;
  initialBlocks?: object;
  example?: string;
  generator: (rng: Rng) => Generator<any>;
  solution: (input: Input, output: Output) => void;
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
  };
};

export default function Workspace({ toolbox, initialBlocks, example, debug }: BlocklyProps) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  const [blocks, setBlocks] = useState({});
  const [code, setCode] = useState("");
  const [input, setInput] = useState(example ?? "");

  const [step, output, running, highlightedBlock] = useExecutor(code, input);

  const send = useIcp(iframe?.contentWindow, (data: any) => {
    if (data.cmd === "init") {
      send({ cmd: "init", toolbox, debug, initialBlocks });
      send({ cmd: "input", input: example });
    } else if (data.cmd === "ready") {
      setReady(true);
    } else if (data.cmd === "blocks") {
      setBlocks(data.blocks);
      if (debug?.logBlocks) console.log(JSON.stringify(data.blocks, null, 2));
    } else if (data.cmd === "code") {
      setCode(data.code);
      if (debug?.logJs) console.log(data.code);
    }
  });

  useEffect(() => {
    send({ cmd: "highlight", highlightedBlock });
  }, [send, highlightedBlock]);

  const reset = () => {};

  return (
    <div className="relative inset-y-0 left-1/2 mb-5 w-screen -translate-x-1/2 overflow-x-hidden px-4 sm:px-8">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] lg:grid-rows-[auto_1fr] xl:grid-cols-[2fr_1fr]">
        <div className="flex gap-3 md:flex-col lg:flex-row">
          <div className="join md:join-vertical lg:join-horizontal">
            <div className="join-item tooltip" data-tip="Esegui/pausa">
              <div
                className={classNames(
                  "btn btn-info size-full rounded-[inherit]",
                  !running && "btn-disabled",
                )}>
                <label className="swap swap-rotate size-full">
                  <input type="checkbox" disabled={!running} checked={false} onChange={() => {}} />
                  <Pause className="swap-on size-6" />
                  <Play className="swap-off size-6" />
                </label>
              </div>
            </div>
            <div className="join-item tooltip" data-tip="Esegui un blocco">
              <button
                className="btn btn-info rounded-[inherit]"
                disabled={!running}
                onClick={step}
                aria-label="Esugui un blocco">
                <SkipForward className="size-6" />
              </button>
            </div>
            <div className="join-item tooltip" data-tip="Esegui fino alla fine">
              <button
                className="btn btn-info rounded-[inherit]"
                disabled={!running}
                onClick={() => {}}
                aria-label="Esegui fino alla fine">
                <FastForward className="size-6" />
              </button>
            </div>
            <div className="join-item tooltip" data-tip="Esegui da capo">
              <button
                className="btn btn-info rounded-[inherit]"
                onClick={reset}
                aria-label="Esegui da capo">
                <RotateCcw className="size-6" />
              </button>
            </div>
          </div>
          <div className="tooltip" data-tip="Invia la soluzione">
            <button className="btn btn-success" aria-label="Invia la soluzione">
              <Send className="size-6" />
            </button>
          </div>
        </div>
        <div className="relative h-[calc(100vh-8rem)] max-h-[640px] w-full overflow-hidden rounded-xl border-2 border-[#c6c6c6] md:order-first lg:row-span-2">
          <iframe
            ref={setIframe}
            src={import("./workspaceEditor") as any}
            className="size-full"
            title="Area di lavoro di Blockly"
          />
          {!ready && (
            <div className="absolute inset-0 z-50 bg-white text-slate-700">
              <Loading />
            </div>
          )}
        </div>
        <div className="flex flex-col md:col-span-2 lg:col-span-1">
          <textarea
            rows={4}
            className="textarea textarea-bordered w-full grow resize-none font-mono placeholder:font-sans"
            placeholder="Input"
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="divider-horizontall divider">
            <ArrowDown size={72} />
          </div>
          <textarea
            rows={4}
            className="textarea textarea-bordered w-full grow resize-none font-mono placeholder:font-sans"
            placeholder="Output"
            value={output}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
