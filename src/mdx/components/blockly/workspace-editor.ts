import { DisableTopBlocks } from "@blockly/disable-top-blocks";
import Blockly, { BlocklyOptions, WorkspaceSvg } from "blockly";
import { ToolboxDefinition } from "blockly/core/utils/toolbox";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";

import toJS from "./generator";
import { ioBlocks } from "./io-blocks";
import "./workspace-editor.css";

let blocks: object | undefined;
let variables: object[] | undefined;
let code: string | undefined;
let workspace: WorkspaceSvg | undefined;

type Props = {
  toolbox: ToolboxDefinition;
  initialBlocks?: object;
};

function init({ toolbox, initialBlocks }: Props) {
  Blockly.setLocale(locale);

  const config: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
    maxBlocks: undefined,
    maxInstances: {},
    toolbox,
  };
  for (const block of ioBlocks) {
    if ("maxInstances" in block && block.maxInstances) {
      config.maxInstances![block.type] = block.maxInstances;
    }
  }

  workspace = Blockly.inject("app", config);
  workspace.addChangeListener(Blockly.Events.disableOrphans);
  workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.FINISHED_LOADING) {
      send("ready");
    }

    const newCode = toJS(workspace);
    if (newCode !== code) {
      code = newCode;
      send("code", { code });
      workspace?.highlightBlock(null);
    }

    const newBlocks = Blockly.serialization.workspaces.save(workspace!);
    if (newBlocks !== blocks) {
      blocks = newBlocks;
      send("blocks", { blocks });
    }

    const newVariables = newBlocks["variables"];
    if (variables != newVariables) {
      const variablesMapping: Record<string, string> = {};
      for (const variable of newVariables) {
        const name = variable.name;
        const newName = javascriptGenerator.getVariableName(name);
        variablesMapping[newName] = name;
      }
      variables = newVariables;
      send("variables", { variablesMapping });
    }
  });

  new DisableTopBlocks().init();

  Blockly.serialization.workspaces.load(initialBlocks ?? {}, workspace);
}

function send(cmd: string, props?: any) {
  window.parent.postMessage({ cmd, ...props }, "*");
}

window.addEventListener("message", (event) => {
  const { cmd, ...props } = event.data;
  if (cmd === "init") {
    init(props);
  } else if (cmd === "highlight") {
    workspace?.highlightBlock(props.highlightedBlock);
  }
});
send("init");
