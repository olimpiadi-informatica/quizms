import React, { useCallback, useEffect, useState } from "react";

import { default as BlocklyCore, BlocklyOptions } from "blockly/core.js";
import { Workspace } from "blockly/core/workspace";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";
import * as process from "process";
import { BlocklyWorkspace } from "react-blockly";

import toolboxConfiguration from "./blocklyToolbox.json";
import "./customBlocks";

BlocklyCore.setLocale(locale);

export function Blockly() {
  const [xml, setXml] = useState('<xml xmlns="https://developers.google.com/blockly/xml" />');

  const workspaceConfiguration: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
  };

  useEffect(() => {
    if (
      process.env.QUIZMS_LOG_BLOCKLY_XML === "true" ||
      process.env.NEXT_PUBLIC_QUIZMS_LOG_BLOCKLY_XML === "true"
    ) {
      console.log(xml);
    }
  }, [xml]);

  const onWorkspaceChange = useCallback((workspace: Workspace | undefined) => {
    if (workspace) {
      if (
        process.env.QUIZMS_LOG_BLOCKLY_JS === "true" ||
        process.env.NEXT_PUBLIC_QUIZMS_LOG_BLOCKLY_JS === "true"
      ) {
        const js = javascriptGenerator.workspaceToCode(workspace);
        console.log(js);
      }

      // const state = BlocklyCore.serialization.workspaces.save(workspace);
      // BlocklyCore.serialization.workspaces.load(state, workspace);
    }
  }, []);

  return (
    <div className="mb-4 overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
      <BlocklyWorkspace
        toolboxConfiguration={toolboxConfiguration}
        workspaceConfiguration={workspaceConfiguration}
        onWorkspaceChange={onWorkspaceChange}
        initialXml={xml}
        onXmlChange={setXml}
        className="h-[30rem] border-0 text-gray-700"
      />
    </div>
  );
}
