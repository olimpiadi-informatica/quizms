import React, { useCallback, useState } from "react";

import { default as BlocklyCore, BlocklyOptions } from "blockly/core.js";
import { Workspace } from "blockly/core/workspace";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";
import { BlocklyWorkspace } from "react-blockly";
import { ArrowRight, FastForward, Pause, Play, RotateCcw, SkipForward } from "react-feather";

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
    <div className="flex gap-3">
      <div className="grow">
        <div className="mb-5 overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
          <BlocklyWorkspace
            toolboxConfiguration={toolboxConfiguration}
            workspaceConfiguration={workspaceConfiguration}
            onWorkspaceChange={onWorkspaceChange}
            initialJson={json}
            onJsonChange={onJsonChange}
            className="h-[30rem] border-0 text-gray-700"
          />
        </div>
        <div className="mb-5 flex">
          <textarea
            rows={4}
            className="textarea-bordered textarea w-full resize-none font-mono placeholder:font-sans"
            placeholder="Input"
          />
          <div className="divider divider-horizontal">
            <ArrowRight className="h-20 w-20" />
          </div>
          <textarea
            rows={4}
            className="textarea-bordered textarea w-full resize-none font-mono placeholder:font-sans"
            placeholder="Output"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="tooltip" data-tip="Esegui/ferma">
          <div className="btn h-full w-full p-0">
            <label className="swap swap-rotate h-full w-full">
              <input type="checkbox" />
              <Pause className="swap-on h-6 w-6" />
              <Play className="swap-off h-6 w-6" />
            </label>
          </div>
        </div>
        <div className="tooltip" data-tip="Esegui un blocco">
          <button className="btn">
            <SkipForward className="h-6 w-6" />
          </button>
        </div>
        <div className="tooltip" data-tip="Esegui fino alla fine">
          <button className="btn">
            <FastForward className="h-6 w-6" />
          </button>
        </div>
        <div className="tooltip" data-tip="Esegui da capo">
          <button className="btn">
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
