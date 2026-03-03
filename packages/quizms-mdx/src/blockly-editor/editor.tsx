import { useEffect, useId, useRef, useState } from "react";

import { DisableTopBlocks } from "@blockly/disable-top-blocks";
import "blockly/blocks";

import {
  type BlocklyOptions,
  dialog,
  Events,
  inject,
  serialization,
  setLocale,
  type utils,
  type WorkspaceSvg,
} from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import * as locale from "blockly/msg/it";

import type {
  CustomBlock,
  CustomBlockProcessed,
  IframeToWorkspaceMessage,
  WorkspaceToIframeMessage,
} from "~/blockly-types";

import { initGenerator, toJS } from "./generator";

setLocale(locale as unknown as Record<string, string>);

function send(msg: IframeToWorkspaceMessage) {
  window.parent.postMessage(msg, "*");
}

export function BlocklyEditor() {
  const id = useId();
  const workspace = useRef<WorkspaceSvg>(null);

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    message: string;
    defaultValue: string;
    callback?: (result: string | null) => void;
  }>({ isOpen: false, message: "", defaultValue: "" });

  useEffect(() => {
    dialog.setPrompt((message, defaultValue, callback) => {
      setPromptState({ isOpen: true, message, defaultValue, callback });
    });
    return () => dialog.setPrompt(undefined);
  }, []);

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);

    function onMessage({ data }: MessageEvent<WorkspaceToIframeMessage>) {
      if (data.cmd === "init") {
        workspace.current?.dispose();
        workspace.current = init(id, data);
      } else if (data.cmd === "highlight") {
        workspace.current?.highlightBlock(data.highlightedBlock ?? null);
      }
    }
  }, [id]);

  useEffect(() => send({ cmd: "init" }), []);
  useEffect(() => document.documentElement.setAttribute("data-theme", "light"), []);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (promptState.isOpen) {
      inputRef.current?.focus();
    }
  }, [promptState.isOpen]);

  return (
    <>
      <div className="!fixed !inset-0 [all:initial]" id={id} />
      {promptState.isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999999]"
          style={{ zIndex: 999999 }}>
          <div
            className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-[90vw]"
            style={{ fontFamily: "sans-serif" }}>
            <p className="text-gray-800 mb-4">{promptState.message}</p>
            <input
              ref={inputRef}
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue={promptState.defaultValue}
              onChange={(e) => setPromptState((s) => ({ ...s, defaultValue: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  promptState.callback?.(promptState.defaultValue);
                  setPromptState((s) => ({ ...s, isOpen: false }));
                } else if (e.key === "Escape") {
                  promptState.callback?.(null);
                  setPromptState((s) => ({ ...s, isOpen: false }));
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                onClick={() => {
                  promptState.callback?.(null);
                  setPromptState((s) => ({ ...s, isOpen: false }));
                }}>
                Annulla
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
                onClick={() => {
                  promptState.callback?.(promptState.defaultValue);
                  setPromptState((s) => ({ ...s, isOpen: false }));
                }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export type InitProps = {
  readonly: boolean;
  toolbox: utils.toolbox.ToolboxInfo;
  initialBlocks: object;
  customBlocks: CustomBlock<any>[];
};

function init(id: string, props: InitProps) {
  const config = createConfig(props);
  const workspace = inject(id, config);
  initGenerator(workspace, props.customBlocks as CustomBlockProcessed[]);

  new DisableTopBlocks().init();
  workspace.addChangeListener(Events.disableOrphans);

  workspace.addChangeListener((event) => {
    if (event.type === Events.FINISHED_LOADING) {
      send({ cmd: "ready" });
    }

    try {
      onWorkspaceChange(workspace, config);
    } catch (err) {
      console.error(err);
      send({ cmd: "error", message: (err as Error).message });
    }
  });

  serialization.workspaces.load(props.initialBlocks, workspace);

  return workspace;
}

function onWorkspaceChange(workspace: WorkspaceSvg, config: BlocklyOptions) {
  const code = toJS(workspace);
  javascriptGenerator.nameDB_?.setVariableMap(workspace.getVariableMap());
  send({ cmd: "code", code });
  workspace.highlightBlock(null);

  const blocks = serialization.workspaces.save(workspace);
  send({ cmd: "blocks", blocks });

  const variableMappings: Record<string, string> = {};
  for (const variable of blocks.variables ?? []) {
    const name = variable.name;
    const newName = javascriptGenerator.getVariableName(name);
    variableMappings[newName] = name;
  }
  send({ cmd: "variables", variableMappings });

  if (process.env.NODE_ENV === "development") {
    send({ cmd: "svg", svg: exportSvg(workspace, config.renderer!) });
  }
}

function createConfig({ toolbox, customBlocks, readonly }: InitProps): BlocklyOptions {
  if (customBlocks && toolbox.kind === "categoryToolbox") {
    toolbox.contents.unshift({
      kind: "category",
      name: "Esecuzione",
      colour: "40",
      contents: customBlocks.map((block) => ({
        kind: "block",
        type: block.type,
      })),
    });
  }

  const config: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    media: process.env.NODE_ENV === "production" ? "/blockly/" : undefined,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
    maxBlocks: undefined,
    maxInstances: {},
    toolbox,
    readOnly: readonly,
  };

  if (customBlocks) {
    for (const block of customBlocks) {
      if ("maxInstances" in block && block.maxInstances) {
        config.maxInstances![block.type] = block.maxInstances;
      }
    }
  }

  return config;
}

function exportSvg(workspace: WorkspaceSvg, renderer: string) {
  const box = workspace.svgBlockCanvas_.getBoundingClientRect();
  const se = new XMLSerializer();

  return `\
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${2 * box.width}"
  height="${2 * box.height}"
  viewBox="${box.x} ${box.y} ${box.width} ${box.height}"
  class="blocklySvg ${renderer}-renderer classic-theme">
  ${document.querySelector(`#blockly-renderer-style-${renderer}-classic`)!.outerHTML}
  ${document.querySelector("#blockly-common-style")!.outerHTML}
  <g class="blocklyWorkspace">  
    ${se.serializeToString(workspace.svgBlockCanvas_)}
  </g>
</svg>`;
}
