import React, { ComponentType, Ref, forwardRef, useEffect, useMemo, useState } from "react";

import { ToolboxInfo } from "blockly/core/utils/toolbox";
import classNames from "classnames";
import { range } from "lodash-es";
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  MessageSquareOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  XCircle,
} from "lucide-react";

import { Loading } from "~/components";
import { useContest } from "~/mdx/components/contest";
import { useProblem } from "~/mdx/components/problem";
import validate from "~/utils/validate";
import { useStudent } from "~/web/student";

import { customBlockSchema } from "./custom-block";
import Debug from "./debug";
import { defaultInitialBlocks, defaultToolbox } from "./default-blocks";
import useExecutor from "./executor";
import { BlocklyInterpreter } from "./interpreter";
import useIcp from "./ipc";

type VariableValues = {
  blocklyVariables: Record<string, any>;
  hiddenState: Record<string, any>;
  msg?: string;
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
  customBlocks?: any;
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
  const { registerProblem } = useContest();
  const { id, points } = useProblem();

  useEffect(() => {
    for (let i = 0; i < testcases.length; i++) {
      registerProblem(`${id}.${i + 1}`, {
        type: "text",
        pointsCorrect: points[0],
        pointsBlank: points[1],
        pointsWrong: points[2],
        solution: "✅",
      });
    }
  }, [registerProblem, id, testcases, points]);

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

  const { step, reset, running, highlightedBlock, globalScope, correct, msg } = useExecutor(
    code,
    testcases[testcaseIndex],
  );

  const blocklyVariables = useMemo(
    () => Object.fromEntries(Object.entries(variableMappings).map(([k, v]) => [v, globalScope[k]])),
    [variableMappings, globalScope],
  );

  const validatedCustomBlocks = useMemo(
    () =>
      validate(customBlockSchema.array(), customBlocks, {
        prefix: "Invalid custom block definition",
      }),
    [customBlocks],
  );

  const send = useIcp(iframe?.contentWindow, (data: any) => {
    switch (data.cmd) {
      case "init": {
        send({
          cmd: "init",
          toolbox: toolbox ?? defaultToolbox,
          initialBlocks: blocks,
          debug,
          customBlocks: validatedCustomBlocks,
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

  const [speed, setSpeed] = useState(3);
  useEffect(() => {
    const intervals = [5000, 2000, 1000, 500, 200, 100, 10];
    if (playing) {
      const interval = setInterval(step, intervals[speed]);
      return () => clearInterval(interval);
    }
  }, [step, speed, playing]);

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

  const [messageHidden, setMessageHidden] = useState(false);
  useEffect(() => setMessageHidden(false), [msg]);

  return (
    <div
      className={classNames(
        "not-prose relative inset-y-0 left-1/2 w-screen -translate-x-1/2 p-4 pt-8",
        "flex flex-col-reverse items-start justify-between gap-6 overflow-x-hidden *:mx-3 lg:flex-row lg:gap-0",
      )}>
      <div className="flex h-full max-h-[min(720px,90vh)] basis-[min(auto,50%)] flex-col gap-6 self-stretch overflow-x-hidden">
        <div className="join join-horizontal">
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
        <div className="relative flex flex-col overflow-hidden shadow-xl">
          <div className="overflow-auto rounded-xl border-2 border-[#c6c6c6] bg-white">
            {Visualizer && (
              <Visualizer
                variables={{ blocklyVariables, hiddenState: globalScope?.hiddenState, msg }}
              />
            )}
            {msg && !messageHidden && (
              <div className="absolute inset-x-0 bottom-0 z-50 p-4">
                <div
                  role="alert"
                  className={classNames("alert", correct ? "alert-success" : "alert-error")}>
                  {correct ? <CheckCircle /> : <AlertTriangle />}
                  <span>{msg}</span>
                  <button onClick={() => setMessageHidden(true)} aria-label="Nascondi messaggio">
                    <MessageSquareOff />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-h-[min(720px,90vh)] flex-[1_0_50%] flex-col-reverse gap-6 self-stretch lg:flex-col">
        <div className="flex gap-6">
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
          <div className="tooltip" data-tip="Correggi la soluzione">
            <button
              className="btn btn-success"
              aria-label="Correggi la soluzione"
              disabled={!editing || !ready}
              onClick={runAll}>
              <Send className="size-6" />
            </button>
          </div>
          <div>
            <input
              className="range"
              type="range"
              min="0"
              max="6"
              value={speed}
              onChange={(e) => setSpeed(+e.target.value)}
            />
            <div className="flex w-full justify-between px-2 text-xs">
              <span>Lento</span>
              <span>Veloce</span>
            </div>
          </div>
          {import.meta.env.DEV && <Debug blocks={blocks} js={code} />}
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
    <div className="relative flex grow flex-col overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
      <iframe
        ref={ref}
        src={import("./editor") as any}
        className="grow"
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
