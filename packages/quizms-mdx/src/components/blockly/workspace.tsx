"use client";

import {
  type ComponentType,
  forwardRef,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ErrorBoundary } from "@olinfo/quizms/components";
import { useStudent } from "@olinfo/quizms/student";
import type { ToolboxInfo } from "blockly/core/utils/toolbox";
import clsx from "clsx";
import { CircleCheck, MessageSquareOff, TriangleAlert } from "lucide-react";

import type { CustomBlock, TestcaseResult, VisualizerProps } from "~/blockly-types";
import { useContest } from "~/components/client/contest";
import { useProblem } from "~/components/client/problem";
import { defaultInitialBlocks, defaultToolbox } from "./defaults";
import { Editor } from "./editor";
import { useExecutor } from "./hooks/executor";
import { BlocklyInterpreter } from "./hooks/interpreter";
import { useIframe } from "./hooks/ipc";
import { Debug } from "./toolbar/debug";
import { ExecutionButtons } from "./toolbar/execution";
import { TestcaseSelector } from "./toolbar/testcases";
import style from "./workspace.module.css";

export type BlocklyProps<T> = {
  toolbox?: ToolboxInfo;
  initialBlocks?: object;
  testcases?: T[];
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
    logVariables?: boolean;
  };
  customBlocks: CustomBlock<T>[];
  visualizer?: ComponentType<VisualizerProps<T>>;
};

export function BlocklyClient<State>({
  toolbox = defaultToolbox,
  initialBlocks = defaultInitialBlocks,
  debug = {},
  testcases,
  customBlocks,
  visualizer: Visualizer,
}: BlocklyProps<State>) {
  if (!testcases) throw new Error("No testcases specified");
  if (!customBlocks) throw new Error("No custom blocks specified");
  if (!Visualizer) throw new Error("No visualizer specified");

  const { student, setStudent, terminated } = useStudent();
  const { registerProblem } = useContest();
  const { id, points } = useProblem();

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

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [selectedTestcase, setSelectedTestcase] = useState(0);
  const [alert, setAlert] = useState<string>();
  const [testcaseResults, setTestcaseResults] = useState<(TestcaseResult | undefined)[]>(
    testcases.map(() => undefined),
  );

  const onBlockChanges = useCallback(
    (blocks: object) =>
      setStudent({
        ...student,
        extraData: {
          ...student.extraData,
          [`blockly-${id}`]: JSON.stringify(blocks),
        },
      }),
    [student, setStudent, id],
  );
  const onCodeChanges = useCallback(() => {
    setTestcaseResults(testcases.map(() => undefined));
  }, [testcases]);
  const savedBlocks = student.extraData?.[`blockly-${id}`];
  const { ready, blocks, svg, code, variableMappings, highlightBlock } = useIframe(
    iframe,
    terminated,
    {
      toolbox: toolbox ?? defaultToolbox,
      initialBlocks: savedBlocks ? JSON.parse(savedBlocks) : initialBlocks,
      customBlocks,
    },
    { onBlockChanges, onCodeChanges },
    debug,
  );

  const {
    state,
    result: selectedResult,
    variables,
    step,
    reset: resetSelected,
  } = useExecutor<State>(
    code,
    customBlocks,
    testcases[selectedTestcase],
    variableMappings,
    highlightBlock,
  );

  const evaluate = useCallback(async () => {
    const results = await Promise.all(
      testcases.map(async (testcase) => {
        const interpreter = new BlocklyInterpreter<State>(code, customBlocks, testcase);
        for (let i = 0; await interpreter.step(); i++) {
          if (i % 64 === 0) {
            // wait 5 milliseconds to avoid blocking the main thread for too long
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        }
        return interpreter.result!;
      }),
    );

    setTestcaseResults(results);

    const answers = { ...student.answers };
    for (let tc = 0; tc < testcases.length; tc++) {
      answers[`${id}.${tc + 1}`] = results[tc].success ? "✅" : "❌";
    }

    await setStudent({ ...student, answers });
  }, [student, setStudent, code, customBlocks, testcases, id]);

  return (
    <div className={clsx(style.workspace, "not-prose")}>
      <div className={style.visualizerButtons}>
        <TestcaseSelector
          results={testcaseResults}
          selectedTestcase={selectedTestcase}
          setSelectedTestcase={setSelectedTestcase}
        />
      </div>
      <div className={style.visualizer}>
        <ErrorBoundary
          onError={(err) => {
            if (process.env.NODE_ENV === "production") {
              err.message = "Visualizzazione del livello fallita";
            }
          }}
          onReset={resetSelected}>
          {Visualizer && state && (
            <Visualizer
              variables={variables}
              state={state}
              testcase={selectedTestcase}
              message={selectedResult?.message}
            />
          )}
        </ErrorBoundary>
        <div className={clsx("sticky left-0 bottom-0 z-50 p-4", !alert && "invisible")}>
          <div
            role="alert"
            className={clsx("alert", selectedResult?.success ? "alert-success" : "alert-error")}>
            {selectedResult?.success ? <CircleCheck /> : <TriangleAlert />}
            <span>{alert}</span>
            <button
              type="button"
              onClick={() => setAlert(undefined)}
              aria-label="Nascondi messaggio">
              <MessageSquareOff />
            </button>
          </div>
        </div>
      </div>
      <div className={style.editorButtons}>
        <ExecutionButtons
          evaluate={evaluate}
          evaluated={!!testcaseResults[0]}
          selectedEvaluated={!!selectedResult}
          step={step}
          reset={resetSelected}
        />
        {process.env.NODE_ENV === "development" && <Debug blocks={blocks} js={code} svg={svg} />}
      </div>
      <div className={style.editor}>
        <Editor ref={setIframe} ready={ready} />
      </div>
    </div>
  );
}
