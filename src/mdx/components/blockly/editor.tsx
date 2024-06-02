import { useEffect, useId, useState } from "react";

import { DisableTopBlocks } from "@blockly/disable-top-blocks";
import "blockly/blocks";
import {
  BlocklyOptions,
  Events,
  WorkspaceSvg,
  inject,
  serialization,
  setLocale,
} from "blockly/core";
import { ToolboxInfo } from "blockly/core/utils/toolbox";
import { javascriptGenerator } from "blockly/javascript";
import * as locale from "blockly/msg/it";

import { CustomBlock } from "./custom-block";
import { initGenerator, toJS } from "./generator";

setLocale(locale);

function send(cmd: string, props?: any) {
  window.parent.postMessage({ cmd, ...props }, "*");
}

export default function BlocklyEditor() {
  const id = useId();
  const [workspace, setWorkspace] = useState<WorkspaceSvg>();

  useEffect(() => {
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);

    function onMessage(event: MessageEvent) {
      const { cmd, ...props } = event.data;
      if (cmd === "init") {
        setWorkspace(init(id, props));
      } else if (cmd === "highlight") {
        workspace?.highlightBlock(props.highlightedBlock);
      }
    }
  }, [id, workspace]);

  useEffect(() => {
    send("init");
  }, []);

  return <div className="!fixed !inset-0 [all:initial]" id={id} />;
}

export type InitProps = {
  toolbox: ToolboxInfo;
  initialBlocks: object;
  customBlocks: CustomBlock[];
  readonly?: boolean;
};

function init(id: string, props: InitProps) {
  const config = createConfig(props);
  const workspace = inject(id, config);
  initGenerator(workspace, props.customBlocks);

  new DisableTopBlocks().init();
  workspace.addChangeListener(Events.disableOrphans);

  workspace.addChangeListener((event) => {
    if (event.type === Events.FINISHED_LOADING) {
      send("ready");
    }

    onWorkspaceChange(workspace, config);
  });

  serialization.workspaces.load(props.initialBlocks ?? {}, workspace);

  return workspace;
}

function onWorkspaceChange(workspace: WorkspaceSvg, config: BlocklyOptions) {
  const code = toJS(workspace);
  javascriptGenerator.nameDB_?.setVariableMap(workspace.getVariableMap());
  send("code", { code });
  workspace.highlightBlock(null);

  const blocks = serialization.workspaces.save(workspace);
  send("blocks", { blocks });

  const variablesMapping: Record<string, string> = {};
  for (const variable of blocks["variables"] ?? []) {
    const name = variable.name;
    const newName = javascriptGenerator.getVariableName(name);
    variablesMapping[newName] = name;
  }
  send("variables", { variablesMapping });

  if (import.meta.env.DEV) {
    send("svg", { svg: exportSvg(workspace, config.renderer!) });
  }
}

function createConfig({ toolbox, customBlocks, readonly }: InitProps): BlocklyOptions {
  if (customBlocks && toolbox.kind == "categoryToolbox") {
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
    media: import.meta.env.PROD ? `${import.meta.env.BASE_URL}blockly/` : undefined,
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
    ${se.serializeToString(workspace!.svgBlockCanvas_)}
  </g>
</svg>`;
}
