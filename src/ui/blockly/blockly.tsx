import React, { useCallback, useState } from "react";

import { default as BlocklyCore, BlocklyOptions } from "blockly/core.js";
import { Workspace } from "blockly/core/workspace";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";
import { BlocklyWorkspace } from "react-blockly";

import toolboxConfiguration from "./blocklyToolbox.json";
import "./customBlocks";

BlocklyCore.setLocale(locale);

type BlocklyProps = {
  initialBlocks?: object;
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
  };
};

export function Blockly({ initialBlocks, debug }: BlocklyProps) {
  const json = initialBlocks ?? {};

  const [workspace, setWorkspace] = useState<Workspace>();

  const workspaceConfiguration: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
  };

  const onJsonChange = useCallback(
    (json: object) => {
      if (debug?.logBlocks) {
        console.log(JSON.stringify(json, null, 2));
      }
    },
    [debug?.logBlocks]
  );

  const onWorkspaceChange = useCallback(
    (workspace: Workspace | undefined) => {
      setWorkspace(workspace);
      if (workspace) {
        if (debug?.logJs) {
          const js = javascriptGenerator.workspaceToCode(workspace);
          console.log(js);
        }
      }
    },
    [debug?.logJs]
  );

  return (
    <div className="mb-4 overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
      <BlocklyWorkspace
        toolboxConfiguration={toolboxConfiguration}
        workspaceConfiguration={workspaceConfiguration}
        onWorkspaceChange={onWorkspaceChange}
        initialJson={json}
        onJsonChange={onJsonChange}
        className="h-[30rem] border-0 text-gray-700"
      />
    </div>
  );
}
