import { useEffect, useId, useRef, useState } from "react";

import { DisableTopBlocks } from "@blockly/disable-top-blocks";
import { UiLanguageProvider } from "@olinfo/quizms/components";
import { loadUiLocale } from "@olinfo/quizms/i18n";
import "blockly/blocks";

import {
  type BlocklyOptions,
  Events,
  inject,
  serialization,
  type utils,
  type WorkspaceSvg,
} from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";

import type {
  CustomBlock,
  CustomBlockProcessed,
  IframeToWorkspaceMessage,
  WorkspaceToIframeMessage,
} from "~/blockly-types";

import { initGenerator, toJS } from "./generator";
import { setBlocklyLanguage } from "./messages";
import { BlocklyModal } from "./modal";

function send(msg: IframeToWorkspaceMessage) {
  window.parent.postMessage(msg, "*");
}

export function BlocklyEditor() {
  const id = useId();
  const workspace = useRef<WorkspaceSvg>(null);
  const lastInit = useRef(0);
  // The iframe's own UI (e.g. the prompt dialog) is in the statement language too.
  const [language, setLanguage] = useState<string>();

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);

    function onMessage({ data }: MessageEvent<WorkspaceToIframeMessage>) {
      if (data.cmd === "init") {
        // Loading the messages is asynchronous: only the latest `init` creates the workspace.
        const current = ++lastInit.current;
        // The iframe's own UI messages too, so that switching doesn't suspend.
        Promise.all([setBlocklyLanguage(data.language), loadUiLocale(data.language)])
          .then(() => {
            if (current !== lastInit.current) return;
            workspace.current?.dispose();
            workspace.current = init(id, data);
            setLanguage(data.language);
          })
          .catch((err) => {
            console.error(err);
            send({ cmd: "error", message: (err as Error).message });
          });
      } else if (data.cmd === "highlight") {
        workspace.current?.highlightBlock(data.highlightedBlock ?? null);
      }
    }
  }, [id]);

  useEffect(() => send({ cmd: "init" }), []);
  useEffect(() => document.documentElement.setAttribute("data-theme", "light"), []);

  return (
    <>
      <div className="!fixed !inset-0 [all:initial]" id={id} />
      <UiLanguageProvider language={language}>
        <BlocklyModal />
      </UiLanguageProvider>
    </>
  );
}

export type InitProps = {
  readonly: boolean;
  toolbox: utils.toolbox.ToolboxInfo;
  initialBlocks: object;
  customBlocks: CustomBlock<any>[];
  language?: string;
};

/** Creates the workspace; the messages must be set already (see `setBlocklyLanguage`). */
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
      name: "%{BKY_QUIZMS_CATEGORY_CUSTOM}",
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
    media: process.env.NODE_ENV === "production" ? `${process.env.BASE_PATH}blockly/` : undefined,
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
