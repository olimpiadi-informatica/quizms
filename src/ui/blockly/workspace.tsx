import React, { useCallback, useState } from "react";

import { default as BlocklyCore, BlocklyOptions, WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";
import { BlocklyWorkspace } from "react-blockly";
import { ArrowRight, FastForward, Pause, Play, RotateCcw, SkipForward } from "react-feather";

import "./blocks";
import useExecutor from "./executor";
import toolboxConfiguration from "./toolbox.json";

BlocklyCore.setLocale(locale);

type BlocklyProps = {
  initialBlocks?: object;
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
  };
};

export default function Workspace({ initialBlocks, debug }: BlocklyProps) {
  const json = initialBlocks ?? {};

  const workspaceConfiguration: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
  };

  const [workspace, setWorkspace] = useState<WorkspaceSvg>();
  const [executor, output] = useExecutor(workspace);

  const [pause, setPause] = useState(false);
  const onPlayPause = useCallback(() => {
    setPause((old) => {
      if (old) {
        executor?.pause();
      } else {
        executor?.run();
      }
      return !old;
    });
  }, [executor]);

  const onReset = useCallback(() => {
    executor?.reset();
    setPause(false);
  }, [executor]);

  const onWorkspaceChange = useCallback(
    (workspace: WorkspaceSvg | undefined) => {
      setWorkspace(workspace);
      if (workspace) {
        const js = javascriptGenerator.workspaceToCode(workspace);
        executor?.setCode(js);

        if (debug?.logJs) {
          console.log(js);
        }
      }
    },
    [executor, debug?.logJs]
  );

  const onJsonChange = useCallback(
    (json: object) => {
      if (debug?.logBlocks) {
        console.log(JSON.stringify(json, null, 2));
      }
    },
    [debug?.logBlocks]
  );

  return (
    <div className="flex gap-2">
      <div className="grow">
        <div className="mb-5 overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
          <BlocklyWorkspace
            toolboxConfiguration={toolboxConfiguration}
            workspaceConfiguration={workspaceConfiguration}
            onWorkspaceChange={onWorkspaceChange}
            initialJson={json}
            onJsonChange={onJsonChange}
            className="h-[30rem] border-0 text-[#1f2937]"
          />
        </div>
        <div className="mb-5 flex">
          <textarea
            rows={4}
            className="textarea-bordered textarea w-full resize-none font-mono placeholder:font-sans"
            placeholder="Input"
            onChange={(e) => executor?.setInput(e.target.value)}
          />
          <div className="divider divider-horizontal">
            <ArrowRight className="h-20 w-20" />
          </div>
          <textarea
            rows={4}
            className="textarea-bordered textarea w-full resize-none font-mono placeholder:font-sans"
            placeholder="Output"
            value={output}
            readOnly
          />
        </div>
      </div>
      <div className="join-vertical join">
        <div className="tooltip" data-tip="Esegui/pausa">
          <div className="join-item btn h-full w-full p-0">
            <label className="swap swap-rotate h-full w-full">
              <input type="checkbox" checked={pause} onChange={onPlayPause} />
              <Pause className="swap-on h-6 w-6" />
              <Play className="swap-off h-6 w-6" />
            </label>
          </div>
        </div>
        <div className="tooltip" data-tip="Esegui un blocco">
          <button className="join-item btn" onClick={() => executor?.step()}>
            <SkipForward className="h-6 w-6" />
          </button>
        </div>
        <div className="tooltip" data-tip="Esegui fino alla fine">
          <button className="join-item btn" onClick={() => executor?.runAll()}>
            <FastForward className="h-6 w-6" />
          </button>
        </div>
        <div className="tooltip" data-tip="Esegui da capo">
          <button className="join-item btn" onClick={onReset}>
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
