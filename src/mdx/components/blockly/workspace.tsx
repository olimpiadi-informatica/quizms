import React, { ComponentType, useEffect, useState } from "react";

import { ToolboxDefinition } from "blockly/core/utils/toolbox";
import classNames from "classnames";
import { range } from "lodash-es";
import { Check, Pause, Play, RotateCcw, Send, SkipForward, X } from "lucide-react";

import { Loading } from "~/components";

import { CustomBlock } from "./custom-block";
import useExecutor from "./executor";
import { BlocklyInterpreter } from "./interpreter";
import useIcp from "./workspace-ipc";

type VariableValues = {
  blocklyVariables: Record<string, any>;
  hiddenState: Record<string, any>;
};

type BlocklyProps = {
  toolbox: ToolboxDefinition;
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
  msg: string;
  index: number;
};

export default function Workspace({
  toolbox,
  initialBlocks,
  testcases,
  debug,
  customBlocks,
  Visualizer,
}: BlocklyProps) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [, setBlocks] = useState({});
  const [variableMappings, setVariableMappings] = useState([]);

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

  const [blocklyVariables, setBlocklyVariables] = useState<Record<string, any>>({});

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

  useEffect(() => {
    const blocklyVariables: Record<string, any> = {};
    for (const [k, v] of Object.entries(variableMappings)) {
      blocklyVariables[v] = globalScope[k];
    }
    setBlocklyVariables(blocklyVariables);
  }, [globalScope, variableMappings]);

  useEffect(() => {
    if (editing) {
      setPlaying(false);
    }
  }, [editing]);

  return (
    <div className="relative inset-y-0 left-1/2 mb-5 w-screen -translate-x-1/2 overflow-x-hidden px-4 sm:px-8">
      <div className="flex gap-6 md:flex-col lg:flex-row">
        <div className="flex w-full flex-col gap-6">
          <div className="flex gap-6">
            <div className="join md:join-vertical lg:join-horizontal">
              {testcaseStatuses.map(({ index, correct, msg }) => {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setTestcaseIndex(index);
                    }}
                    className={classNames(
                      "btn join-item tooltip rounded-[inherit]",
                      correct ? "btn-success" : "btn-error",
                    )}
                    data-tip={msg}>
                    {correct ? <Check className="size-6" /> : <X className="size-6" />}
                  </button>
                );
              })}
            </div>
            <div className="join md:join-vertical lg:join-horizontal">
              <div className="join-item tooltip" data-tip="Esegui/pausa">
                <div
                  className={classNames(
                    "btn btn-info rounded-[inherit]",
                    !running && "btn-disabled",
                  )}>
                  <label className="swap swap-rotate size-6">
                    <input
                      type="checkbox"
                      disabled={!running}
                      checked={playing}
                      onChange={(event) => {
                        setPlaying(event.target.checked);
                        console.log("CLICK");
                      }}
                    />
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
              <div className="join-item tooltip" data-tip="Esegui da capo">
                <button
                  className="btn btn-info rounded-[inherit]"
                  aria-label="Esegui da capo"
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
          <div className="h-full overflow-auto rounded-lg border-solid">
            {Visualizer && (
              <Visualizer variables={{ blocklyVariables, hiddenState: globalScope?.hiddenState }} />
            )}
          </div>
        </div>
        <div className="h-[640px] w-full rounded-lg">
          <iframe
            ref={setIframe}
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
      </div>
    </div>
  );
}
