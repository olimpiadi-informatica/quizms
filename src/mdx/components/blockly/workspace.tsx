import React, { ComponentType, Ref, forwardRef, useEffect, useMemo, useState } from "react";

import { ToolboxInfo } from "blockly/core/utils/toolbox";
import classNames from "classnames";
import { range } from "lodash-es";
import {
  CheckCircle2,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  XCircle,
} from "lucide-react";

import { Loading } from "~/components";
import { useProblem } from "~/mdx/components/problem";
import { useStudent } from "~/web/student";

import { CustomBlock } from "./custom-block";
import { defaultInitialBlocks, defaultToolbox } from "./default-blocks";
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
  const { student, setStudent } = useStudent();
  const { id } = useProblem();

  const blocks = student.extraData?.[`blockly-${id}`] ?? initialBlocks ?? defaultInitialBlocks;
  const setBlocks = async (blocks: object) => {
    await setStudent({
      ...student,
      extraData: { ...student.extraData, [`blockly-${id}`]: blocks },
    });
  };

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  const [editing, setEditing] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [variableMappings, setVariableMappings] = useState<Record<string, string>>({});

  const [code, setCode] = useState("");
  const [testcaseIndex, setTestcaseIndex] = useState(0);
  const [testcaseStatuses, setTestcaseStatuses] = useState<TestcaseStatus[]>(() => {
    return range(testcases.length).map((index) => ({ correct: false, index }));
  });

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
        send({
          cmd: "init",
          toolbox: toolbox ?? defaultToolbox,
          initialBlocks: blocks,
          debug,
          customBlocks,
        });
        break;
      }
      case "ready": {
        setReady(true);
        break;
      }
      case "blocks": {
        void setBlocks(data.blocks);
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
    if (!running) setPlaying(false);
  }, [running]);

  useEffect(() => {
    if (playing) {
      const interval = setInterval(step, 200);
      return () => clearInterval(interval);
    }
  }, [step, playing]);

  const runAll = async () => {
    const statuses = await Promise.all(
      testcases.map(async (testcase, index) => {
        const interpreter = new BlocklyInterpreter(code, testcase);
        for (let i = 0; interpreter.running; i++) {
          interpreter.step();

          if (i % 64 === 0) {
            // wait 5 milliseconds to avoid blocking the main thread for too long
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        }
        return { ...interpreter, index };
      }),
    );

    setTestcaseStatuses(statuses);
    setEditing(false);

    const answers = { ...student.answers };
    for (let tc = 0; tc < testcases.length; tc++) {
      answers[`${id}.${tc + 1}`] = statuses[tc].correct ? "✅" : "❌";
    }

    await setStudent({ ...student, answers });
  };

  return (
    <div className="relative inset-y-0 left-1/2 mb-5 w-screen -translate-x-1/2 overflow-x-hidden px-4 py-8 sm:px-8">
      <div className="grid grid-cols-[auto_1fr] gap-6 [grid-template-areas:'editor_editor'_'level-btns_exec-btns'_'visualizer_visualizer'] lg:[grid-template-areas:'level-btns_exec-btns'_'visualizer_editor']">
        <div className="join join-horizontal [grid-area:level-btns]">
          {testcaseStatuses.map(({ index, correct, msg }) => (
            <button
              key={index}
              onClick={() => {
                setTestcaseIndex(index);
                setPlaying(false);
              }}
              className={classNames(
                "btn join-item z-10 rounded-lg",
                !editing && "tooltip",
                index === testcaseIndex && "btn-info",
              )}
              data-tip={msg}>
              <div className="flex items-center gap-3">
                <p>Livello {index + 1}</p>
                {editing ? (
                  <HelpCircle size={32} />
                ) : correct ? (
                  <CheckCircle2 size={32} className="fill-success stroke-success-content" />
                ) : (
                  <XCircle size={32} className="fill-error stroke-error-content" />
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-6 [grid-area:exec-btns]">
          <div className="join join-horizontal">
            <div className="join-item tooltip" data-tip="Esegui/pausa">
              <button
                className="btn btn-info rounded-[inherit]"
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
          <div className="tooltip" data-tip="Esegui la soluzione">
            <button
              className="btn btn-success"
              aria-label="Invia la soluzione"
              disabled={!editing}
              onClick={runAll}>
              <Send className="size-6" />
            </button>
          </div>
        </div>
        <div className="[grid-area:visualizer]">
          <div className="overflow-auto rounded-xl border-2 border-[#c6c6c6] bg-white">
            {Visualizer && (
              <Visualizer variables={{ blocklyVariables, hiddenState: globalScope?.hiddenState }} />
            )}
          </div>
        </div>
        <div className="h-[640px] grow [grid-area:editor]">
          <Editor ref={setIframe} ready={ready} />
        </div>
      </div>
    </div>
  );
}

const Editor = forwardRef(function Editor(
  { ready }: { ready: boolean },
  ref: Ref<HTMLIFrameElement>,
) {
  return (
    <div className="relative h-full overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
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
