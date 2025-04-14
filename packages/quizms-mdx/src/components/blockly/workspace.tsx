"use client";

import {
  type ComponentType,
  type Ref,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ErrorBoundary,
  Loading,
  useErrorBoundary,
} from "@olinfo/quizms/components";
import { useStudent } from "@olinfo/quizms/student";
import type { ToolboxInfo } from "blockly/core/utils/toolbox";
import clsx from "clsx";
import {
  CircleCheck,
  CircleHelp,
  CircleX,
  MessageSquareOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  TriangleAlert,
} from "lucide-react";

import { useContest } from "~/components/client/contest";
import { useProblem } from "~/components/client/problem";

import Debug from "./debug";
import { defaultInitialBlocks, defaultToolbox } from "./default-blocks";
import useExecutor from "./executor";
import { BlocklyInterpreter } from "./interpreter";
import useIcp from "./ipc";
import style from "./workspace.module.css";

type VisualizerProps = {
  variables: Record<string, any>;
  state: Record<string, any>;
  testcase: number;
  message?: string;
};

export type BlocklyProps = {
  toolbox?: ToolboxInfo;
  initialBlocks?: object;
  testcases: object[];
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
    logVariables?: boolean;
  };
  customBlocks?: any;
  visualizer?: ComponentType<VisualizerProps>;
};

type TestcaseStatus = {
  correct: boolean;
  index: number;
  msg?: string;
};

export function BlocklyClient({
  toolbox,
  initialBlocks,
  testcases,
  debug,
  customBlocks,
  visualizer: Visualizer,
}: BlocklyProps) {
  const { student, setStudent, terminated, score: savedScore } = useStudent();
  const { registerProblem } = useContest();
  const { id, points } = useProblem();
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    for (let i = 0; i < testcases.length; i++) {
      registerProblem(`${id}.${i + 1}`, {
        type: "text",
        allowEmpty: true,
        maxPoints: points[0],
        options: [
          { value: "✅", points: points[0] },
          { value: null, points: points[1] },
          { value: "❌", points: points[2] },
        ],
      });
    }
  }, [registerProblem, id, testcases, points]);

  const savedBlocks = id && student.code?.[id];
  const blocks = savedBlocks
    ? JSON.parse(savedBlocks)
    : (initialBlocks ?? defaultInitialBlocks);

  const setBlocks = async (blocks: object) => {
    if (id)
      await setStudent({
        ...student,
        code: {
          ...student.code,
          [id]: JSON.stringify(blocks),
        },
      });
  };

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  const [editing, setEditing] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [variableMappings, setVariableMappings] = useState<
    Record<string, string>
  >({});
  const [svg, setSvg] = useState("");

  const [code, setCode] = useState("");
  const [testcaseIndex, setTestcaseIndex] = useState(0);
  const [testcaseStatuses, setTestcaseStatuses] = useState<TestcaseStatus[]>(
    () => {
      return testcases.map((_, index) => ({ correct: false, index }));
    },
  );
  const [bestScore, setBestScore] = useState(0);
  const maxScore = points[0] * testcases.length;
  const problemScore = Math.max(
    (savedScore?.isLoading === false && savedScore?.score[id!]) || 0,
    bestScore,
  );
  const badgeClass =
    problemScore == 0
      ? "badge-wrong"
      : problemScore == maxScore ? "badge-success"
        : "badge-warning";

  const { step, reset, running, highlightedBlock, globalScope, correct, msg } =
    useExecutor(code, testcases[testcaseIndex]);

  const variables = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(variableMappings).map(([k, v]) => [v, globalScope[k]]),
      ),
    [variableMappings, globalScope],
  );

  const send = useIcp(iframe?.contentWindow, (data: any) => {
    switch (data.cmd) {
      case "init": {
        send({
          cmd: "init",
          toolbox: toolbox ?? defaultToolbox,
          initialBlocks: blocks,
          customBlocks,
          readonly: terminated,
        });
        break;
      }
      case "ready": {
        setReady(true);
        break;
      }
      case "blocks": {
        void setBlocks(data.blocks);
        if (debug?.logBlocks)
          console.info(JSON.stringify(data.blocks, undefined, 2));
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
      case "svg": {
        setSvg(data.svg);
        break;
      }
      case "error": {
        showBoundary(new Error(data.message));
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

  const prevTerminated = useRef(terminated);
  useEffect(() => {
    if (prevTerminated.current !== terminated) {
      prevTerminated.current = terminated;
      setReady(false);
      iframe?.contentWindow?.location.reload();
    }
  }, [terminated, iframe?.contentWindow]);

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
    let subScore = 0;
    for (let tc = 0; tc < testcases.length; tc++) {
      subScore += statuses[tc].correct ? points[0] : points[2];
      answers[`${id}.${tc + 1}`] = statuses[tc].correct ? "✅" : "❌";
    }
    setBestScore((bestScore) => Math.max(bestScore, subScore));
    await setStudent({ ...student, answers });
  };

  const [alert, setAlert] = useState<string>();
  useEffect(() => setAlert(msg), [msg]);

  return (
    <div className={clsx(style.workspace, "not-prose")}>
      <div className={style.visualizerButtons}>
        <div className="pl-2 text-xl font-bold max-sm:hidden lg:max-xl:hidden">
          Livello
        </div>
        <div className="join">
          {testcaseStatuses.map(({ index, correct, msg }) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setTestcaseIndex(index);
                setPlaying(false);
              }}
              className={clsx(
                "btn join-item z-10 px-3",
                !editing && "tooltip",
                index === testcaseIndex && "btn-info",
              )}
              data-tip={msg}
            >
              {editing ? (
                <CircleHelp size={24} />
              ) : correct ? (
                <CircleCheck
                  size={24}
                  className="fill-success stroke-success-content"
                />
              ) : (
                <CircleX
                  size={24}
                  className="fill-error stroke-error-content"
                />
              )}
            </button>
          ))}
        </div>
        <div className="pl-2 text-xl font-bold max-sm:hidden lg:max-xl:hidden">
          Punteggio:
        </div>
        <div className={`badge badge-outline badge-primary ${badgeClass} p-4 text-xl whitespace-nowrap`}>
          {problemScore}/{maxScore}
        </div>
      </div>
      <div className={style.visualizer}>
        <ErrorBoundary
          onError={(err: any) => {
            if (process.env.NODE_ENV === "production") {
              err.message = "Visualizzazione del livello fallita";
            }
          }}
          onReset={reset}
        >
          {Visualizer && globalScope?.state && (
            <Visualizer
              variables={variables}
              state={globalScope.state}
              testcase={testcaseIndex}
              message={msg}
            />
          )}
        </ErrorBoundary>
        <div
          className={clsx(
            "sticky left-0 bottom-0 z-50 p-4",
            !alert && "invisible",
          )}
        >
          <div
            role="alert"
            className={clsx("alert", correct ? "alert-success" : "alert-error")}
          >
            {correct ? <CircleCheck /> : <TriangleAlert />}
            <span>{alert}</span>
            <button
              type="button"
              onClick={() => setAlert(undefined)}
              aria-label="Nascondi messaggio"
            >
              <MessageSquareOff />
            </button>
          </div>
        </div>
      </div>
      <div className={style.editorButtons}>
        <div className="join join-horizontal">
          <div className="join-item tooltip" data-tip="Esegui/pausa">
            <button
              type="button"
              className="btn btn-info rounded-[inherit]"
              disabled={!running || editing}
              onClick={() => setPlaying(!playing)}
              aria-label="Esugui un blocco"
            >
              {playing ? (
                <Pause className="size-6" />
              ) : (
                <Play className="size-6" />
              )}
            </button>
          </div>
          <div className="join-item tooltip" data-tip="Esegui un blocco">
            <button
              type="button"
              className="btn btn-info rounded-[inherit]"
              disabled={!running || editing}
              onClick={step}
              aria-label="Esugui un blocco"
            >
              <SkipForward className="size-6" />
            </button>
          </div>
          <div className="join-item tooltip" data-tip="Esegui da capo">
            <button
              type="button"
              className="btn btn-info rounded-[inherit]"
              aria-label="Esegui da capo"
              disabled={editing}
              onClick={() => {
                reset();
                setPlaying(false);
              }}
            >
              <RotateCcw className="size-6" />
            </button>
          </div>
        </div>
        <div className="tooltip" data-tip="Correggi la soluzione">
          <button
            type="button"
            className="btn btn-success"
            aria-label="Correggi la soluzione"
            disabled={!editing || !ready}
            onClick={runAll}
          >
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
            aria-label="Velocità di esecuzione"
          />
          <div className="flex w-full justify-between px-2 text-xs">
            <span>Lento</span>
            <span>Veloce</span>
          </div>
        </div>
        {process.env.NODE_ENV === "development" && (
          <Debug blocks={blocks} js={code} svg={svg} />
        )}
      </div>
      <Editor ref={setIframe} ready={ready} />
    </div>
  );
}

const Editor = forwardRef(function Editor(
  { ready }: { ready: boolean },
  ref: Ref<HTMLIFrameElement>,
) {
  return (
    <div className={style.editor}>
      <iframe
        ref={ref}
        src="/__blockly_iframe/"
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
    </div>
  );
});
