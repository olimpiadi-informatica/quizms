import { useCallback, useEffect, useRef, useState } from "react";

import { useErrorBoundary } from "@olinfo/quizms/components";
import type { ToolboxInfo } from "blockly/core/utils/toolbox";

import { cloneDeepWith } from "lodash-es";
import type {
  CustomBlock,
  IframeToWorkspaceMessage,
  WorkspaceToIframeMessage,
} from "~/blockly-types";

export function useIframe(
  iframe: HTMLIFrameElement | null,
  readonly: boolean,
  init: {
    toolbox: ToolboxInfo;
    initialBlocks: object;
    customBlocks: CustomBlock<any>[];
  },
  callbacks: {
    onBlockChanges?: (blocks: object) => void;
    onCodeChanges?: (code: string) => void;
  },
  debug: {
    logBlocks?: boolean;
    logJs?: boolean;
    logVariables?: boolean;
  },
) {
  const { showBoundary } = useErrorBoundary();

  const [ready, setReady] = useState(false);
  const [blocks, setBlocks] = useState<object>({});
  const [svg, setSvg] = useState("");
  const [code, setCode] = useState("");
  const [variableMappings, setVariableMappings] = useState<object>({});

  const childWindow = iframe?.contentWindow;

  const send = useCallback(
    (data: WorkspaceToIframeMessage) => {
      const serializableData = cloneDeepWith(data, (value) => {
        if (typeof value === "function") {
          return null;
        }
      });
      childWindow?.postMessage(serializableData, "*");
    },
    [childWindow],
  );

  useEffect(() => {
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);

    function handler(event: MessageEvent<IframeToWorkspaceMessage>) {
      if (event.source !== childWindow) return;
      const data = event.data;
      if (data.cmd === "init") {
        send({
          cmd: "init",
          readonly,
          ...init,
        });
      }
      if (data.cmd === "ready") {
        setReady(true);
      }
      if (data.cmd === "blocks") {
        setBlocks(data.blocks);
        callbacks.onBlockChanges?.(data.blocks);
        if (debug?.logBlocks) console.info(JSON.stringify(data.blocks, undefined, 2));
      }
      if (data.cmd === "code") {
        setCode(data.code);
        callbacks.onCodeChanges?.(data.code);
        if (debug?.logJs) console.info(data.code);
      }
      if (data.cmd === "variables") {
        setVariableMappings(data.variableMappings);
        if (debug?.logVariables) console.info(data.variableMappings);
      }
      if (data.cmd === "svg") {
        setSvg(data.svg);
      }
      if (data.cmd === "error") {
        showBoundary(new Error(data.message));
      }
    }
  }, [childWindow, init, readonly, send, showBoundary, debug, callbacks]);

  const highlightBlock = useCallback(
    (id: string | undefined) => send({ cmd: "highlight", highlightedBlock: id }),
    [send],
  );

  const prevReadonly = useRef(readonly);
  useEffect(() => {
    if (readonly !== prevReadonly.current) {
      prevReadonly.current = readonly;
      setReady(false);
      childWindow?.location.reload();
    }
  }, [childWindow, readonly]);

  return {
    ready,
    blocks,
    svg,
    code,
    variableMappings,
    highlightBlock,
  };
}
