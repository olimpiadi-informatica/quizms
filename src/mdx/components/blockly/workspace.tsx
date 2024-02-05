import React, { ComponentType, Ref, forwardRef, useEffect, useMemo, useState } from "react";

import { ToolboxInfo } from "blockly/core/utils/toolbox";
import classNames from "classnames";
import { range } from "lodash-es";
import { Check, HelpCircle, Pause, Play, RotateCcw, Send, SkipForward, X } from "lucide-react";

import { Loading } from "~/components";

import { CustomBlock } from "./custom-block";
import defaultToolbox from "./default-toolbox";
import useExecutor from "./executor";
import { BlocklyInterpreter } from "./interpreter";
import useIcp from "./workspace-ipc";

type VariableValues = {
  blocklyVariables: Record<string, any>;
  hiddenState: Record<string, any>;
};

type BlocklyProps = {
  toolbox?: ToolboxInfo;
  initialBlocks?: object;
  testcases: Array<Record<string, any>>;
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
    logVariables?: boolean;
  };
  customBlocks?: CustomBlock[];
  Visualizer?: ComponentType<{ variables: VariableValues }>;
};

type TestcaseStatus = {
  correct: boolean;
  index: number;
  msg?: string;
};

export default function Workspace({
  toolbox,
  initialBlocks,
  testcases,
  debug,
  customBlocks,
  Visualizer,
}: BlocklyProps) {
  if (!toolbox) {
    toolbox = defaultToolbox;
  }

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [, setBlocks] = useState({});
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({});

  const [code, setCode] = useState("");
  const [testcaseIndex, setTestcaseIndex] = useState(0);
  const [testcaseStatuses, setTestcaseStatuses] = useState<TestcaseStatus[]>(
    range(testcases.length).map((index) => {
      return { correct: false, index, msg: "" };
    }),
  );

  const [step, reset, running, highlightedBlock, globalScope] = useExecutor(
    code,
    testcases[testcaseIndex],
  );

  const blocklyVariables = useMemo(
    () => Object.fromEntries(Object.entries(variableMappings).map(([k, v]) => [v, globalScope[k]])),
    [variableMappings, globalScope],
  );

  const send = useIcp(iframe?.contentWindow, (data: any) => {
    switch (data.cmd) {
      case "init": {
        send({ cmd: "init", toolbox, debug, initialBlocks, customBlocks });
        break;
      }
      case "ready": {
        setReady(true);
        break;
      }
      case "blocks": {
        setBlocks(data.blocks);
        if (debug?.logBlocks) console.info(JSON.stringify(data.blocks, undefined, 2));
        break;
      }
      case "code": {
        setCode(data.code);
        setPlaying(false);
        setEditing(true);
        if (debug?.logJs) console.info(data.code);
        break;
      }
      case "variables": {
        setVariableMappings(data.variablesMapping);
        if (debug?.logVariables) console.info(data.variablesMapping);
        break;
      }
    }
  });

  useEffect(() => {
    send({ cmd: "highlight", highlightedBlock });
  }, [send, highlightedBlock]);

  useEffect(() => {
    if (playing) {
      const interval = setInterval(step, 200);
      return () => clearInterval(interval);
    }
  }, [step, playing]);

  return (
    <div className="relative inset-y-0 left-1/2 mb-5 w-[calc(100vw-2rem)] -translate-x-1/2 overflow-x-hidden px-4 py-8 sm:px-8">
      <div className="flex gap-6 md:flex-col-reverse lg:flex-row">
        <div className="flex w-full flex-col gap-6">
          <div className="flex gap-6">
            <div className="flex">
              {testcaseStatuses.map(({ index, correct, msg }) => {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setTestcaseIndex(index);
                      setPlaying(false);
                    }}
                    className={classNames(
                      "btn rounded-lg",
                      !editing && "tooltip",
                      editing ? "btn-neutral" : correct ? "btn-success" : "btn-error",
                      index !== testcaseIndex && "scale-[0.85]",
                    )}
                    data-tip={msg}>
                    <div className="flex items-center gap-3">
                      <p>Livello {index + 1}</p>
                      {editing ? (
                        <HelpCircle className="size-6" />
                      ) : correct ? (
                        <Check className="size-6" />
                      ) : (
                        <X className="size-6" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="join join-horizontal">
              <div className="join-item tooltip" data-tip="Esegui/pausa">
                <button
                  className="btn btn-info"
                  disabled={!running || editing}
                  onClick={() => setPlaying(!playing)}
                  aria-label="Esugui un blocco">
                  {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
                </button>
              </div>
              <div className="join-item tooltip" data-tip="Esegui un blocco">
                <button
                  className="btn btn-info rounded-[inherit]"
                  disabled={!running || editing}
                  onClick={step}
                  aria-label="Esugui un blocco">
                  <SkipForward className="size-6" />
                </button>
              </div>
              <div className="join-item tooltip" data-tip="Esegui da capo">
                <button
                  className="btn btn-info rounded-[inherit]"
                  aria-label="Esegui da capo"
                  disabled={editing}
                  onClick={() => {
                    reset();
                    setPlaying(false);
                  }}>
                  <RotateCcw className="size-6" />
                </button>
              </div>
            </div>
            <div className="tooltip" data-tip="Invia la soluzione">
              <button
                className="btn btn-success"
                aria-label="Invia la soluzione"
                disabled={!editing}
                onClick={() => {
                  const newStatuses = [...testcaseStatuses];
                  for (const i of range(testcases.length)) {
                    const interpreter = new BlocklyInterpreter(code, testcases[i]);
                    while (interpreter.running) {
                      interpreter.step();
                    }
                    newStatuses[i] = {
                      correct: interpreter.correct,
                      index: i,
                      msg: interpreter.msg,
                    };
                  }
                  setTestcaseStatuses(newStatuses);
                  setEditing(false);
                }}>
                <Send className="size-6" />
              </button>
            </div>
          </div>
          <div className="w-full overflow-auto rounded-lg border-solid md:h-[500px] lg:h-full">
            {Visualizer && (
              <Visualizer variables={{ blocklyVariables, hiddenState: globalScope?.hiddenState }} />
            )}
          </div>
        </div>
        <Editor ref={setIframe} ready={ready} />
      </div>
    </div>
  );
}

const Editor = forwardRef(function Editor(
  { ready }: { ready: boolean },
  ref: Ref<HTMLIFrameElement>,
) {
  return (
    <div className="h-[640px] w-full overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
      <iframe
        ref={ref}
        src={import("./workspace-editor") as any}
        className="size-full"
        title="Area di lavoro di Blockly"
      />
      {!ready && (
        <div className="absolute inset-0 z-50 bg-white text-slate-700">
          <Loading />
        </div>
      )}
    </div>
  );
});
