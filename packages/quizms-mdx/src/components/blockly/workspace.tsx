"use client";

import { type ComponentType, useCallback, useEffect, useRef, useState } from "react";

import { ErrorBoundary } from "@olinfo/quizms/components";
import type { Answer } from "@olinfo/quizms/models";
import { useStudent } from "@olinfo/quizms/student";
import type { utils } from "blockly/core";
import clsx from "clsx";
import { CircleCheck, MessageSquareOff, TriangleAlert } from "lucide-react";

import type { CustomBlock, TestcaseResult, VisualizerProps } from "~/blockly-types";
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
  toolbox?: utils.toolbox.ToolboxInfo;
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

export function Blockly<State>({
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

  const { student, setAnswer, terminated } = useStudent();
  const { id } = useProblem();

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const [selectedTestcase, setSelectedTestcase] = useState(0);
  const [alert, setAlert] = useState<string>();
  const [testcaseResults, setTestcaseResults] = useState<TestcaseResult[]>(
    testcases.map(() => ({ success: false, message: "" })),
  );
  const [evaluated, setEvaluated] = useState(false);

  const onCodeChanges = useCallback(() => {
    setEvaluated(false);
  }, []);

  const savedBlocks = (student.answers?.[`${id}`] as Answer<"blockly"> | undefined)?.value?.metadata
    .blocks;

  const blocksChangedRef = useRef(false);

  const { ready, blocks, svg, code, variableMappings, highlightBlock } = useIframe(
    iframe,
    terminated,
    {
      toolbox: toolbox ?? defaultToolbox,
      initialBlocks: savedBlocks ? JSON.parse(savedBlocks) : initialBlocks,
      customBlocks,
    },
    {
      onCodeChanges,
      onBlockChanges: () => {
        blocksChangedRef.current = true;
      },
    },
    debug,
  );

  const saveAnswer = useCallback(async () => {
    const answer: Answer<"blockly"> = {
      type: "blockly",
      value: {
        results: testcaseResults.map((res) => res?.success || false),
        metadata: {
          blocks: JSON.stringify(blocks),
          code,
        },
      },
    };
    await setAnswer(`${id}`, answer);
    blocksChangedRef.current = false;
  }, [blocks, code, id, setAnswer, testcaseResults]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (blocksChangedRef.current) {
        if (!terminated) await saveAnswer();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [saveAnswer, terminated]);

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

  useEffect(() => setAlert(selectedResult?.message), [selectedResult]);

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
    setEvaluated(true);
    if (!terminated) await saveAnswer();
  }, [code, customBlocks, testcases, saveAnswer, terminated]);

  return (
    <div className={clsx(style.workspace, "not-prose")}>
      <div className={style.visualizerButtons}>
        <TestcaseSelector
          results={testcaseResults.map((t) => (evaluated ? t : undefined))}
          selectedTestcase={selectedTestcase}
          setSelectedTestcase={setSelectedTestcase}
        />
      </div>
      <div className={style.visualizer}>
        <ErrorBoundary
          onError={(err: Error) => {
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
          evaluated={evaluated}
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
