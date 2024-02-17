import { DisableTopBlocks } from "@blockly/disable-top-blocks";
import Blockly, { BlocklyOptions, WorkspaceSvg } from "blockly";
import { ToolboxInfo } from "blockly/core/utils/toolbox";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";

import { CustomBlock } from "./custom-block";
import "./editor.css";
import { initGenerator, toJS } from "./generator";

let blocks: object | undefined;
let variables: object[] | undefined;
let code: string | undefined;
let workspace: WorkspaceSvg | undefined;

type Props = {
  toolbox: ToolboxInfo;
  initialBlocks?: object;
  customBlocks?: CustomBlock[];
  readonly?: boolean;
};

function init({ toolbox, initialBlocks, customBlocks, readonly }: Props) {
  Blockly.setLocale(locale);
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

  workspace = Blockly.inject("app", config);
  initGenerator(workspace, customBlocks);
  workspace.addChangeListener(Blockly.Events.disableOrphans);
  workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.FINISHED_LOADING) {
      send("ready");
    }

    const newCode = toJS(workspace);
    javascriptGenerator.nameDB_.setVariableMap(workspace!.getVariableMap());
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

    const newVariables = newBlocks["variables"] ?? [];
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
