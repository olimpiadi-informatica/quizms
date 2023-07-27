import React, { useCallback, useEffect, useRef, useState } from "react";

import { DisableTopBlocks } from "@blockly/disable-top-blocks";
import { default as BlocklyCore, BlocklyOptions, WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";
import locale from "blockly/msg/it";
import classNames from "classnames";
import { BlocklyWorkspace } from "react-blockly";
import {
  ArrowDown,
  ArrowRight,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
} from "react-feather";

import "./blocks";
import useExecutor from "./executor";
import { Input, Output, Rng } from "./io";
import toolboxConfiguration from "./toolbox.json";

BlocklyCore.setLocale(locale);

type BlocklyProps = {
  initialBlocks?: object;
  example?: string;
  generateInput: (rng: Rng) => Generator<any>;
  solution: (input: Input, output: Output) => void;
  debug?: {
    logBlocks?: boolean;
    logJs?: boolean;
  };
};

export default function Workspace({ initialBlocks, example, debug }: BlocklyProps) {
  const workspaceConfiguration: BlocklyOptions = {
    renderer: "zelos",
    sounds: false,
    zoom: {
      controls: true,
      startScale: 0.8,
    },
    maxInstances: {
      start: 1,
    },
  };

  const [input, setInput] = useState(example ?? "");
  const [workspace, setWorkspace] = useState<WorkspaceSvg>();
  const [executor, output, terminated] = useExecutor(workspace, input);
  const [pause, setPause] = useState(false);

  const onReset = useCallback(() => {
    executor?.reset();
    setPause(false);
  }, [executor]);

  const onPlayPause = useCallback(() => {
    setPause((old) => {
      if (old) {
        executor?.pause();
      } else {
        executor?.run();
      }
      return !old;
    });
  }, [executor, terminated, onReset]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      executor?.setInput(e.target.value);
    },
    [executor]
  );

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

  useEffect(() => {
    if (terminated && pause) {
      onPlayPause();
    }
  }, [terminated, pause, onPlayPause]);

  return (
    <div>
      <div className="flex gap-3">
        <div className="mb-5 grow overflow-hidden rounded-xl border-2 border-[#c6c6c6]">
          <BlocklyWorkspace
            onInject={(workspace) => {
              workspace.addChangeListener(BlocklyCore.Events.disableOrphans);
              new DisableTopBlocks().init();
            }}
            toolboxConfiguration={toolboxConfiguration}
            workspaceConfiguration={workspaceConfiguration}
            onWorkspaceChange={onWorkspaceChange}
            initialJson={initialBlocks}
            onJsonChange={onJsonChange}
            className="h-[32rem] border-0 text-[#1f2937]"
          />
        </div>
        <div className="flex flex-col gap-3">
          <div className="join-vertical join">
            <div className="tooltip" data-tip="Esegui/pausa">
              <div
                className={classNames(
                  "join-item btn h-full w-full p-0",
                  terminated && "btn-disabled"
                )}>
                <label className="swap swap-rotate h-full w-full">
                  <input
                    type="checkbox"
                    disabled={terminated}
                    checked={pause}
                    onChange={onPlayPause}
                  />
                  <Pause className="swap-on h-6 w-6" />
                  <Play className="swap-off h-6 w-6" />
                </label>
              </div>
            </div>
            <div className="tooltip" data-tip="Esegui un blocco">
              <button
                className="join-item btn"
                disabled={terminated}
                onClick={() => executor?.step()}>
                <SkipForward className="h-6 w-6" />
              </button>
            </div>
            <div className="tooltip" data-tip="Esegui fino alla fine">
              <button
                className="join-item btn"
                disabled={terminated}
                onClick={() => executor?.runAll()}>
                <FastForward className="h-6 w-6" />
              </button>
            </div>
            <div className="tooltip" data-tip="Esegui da capo">
              <button className="join-item btn" onClick={onReset}>
                <RotateCcw className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="tooltip" data-tip="Invia la soluzione">
            <button className="btn-success join-item btn">
              <Send className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
      <div className="mb-5 flex flex-col lg:flex-row">
        <textarea
          rows={4}
          className="textarea-bordered textarea w-full resize-none font-mono placeholder:font-sans"
          placeholder="Input"
          value={input}
          onChange={onInputChange}
        />
        <div className="divider lg:divider-horizontal">
          <ArrowRight size={72} className="hidden h-full lg:block" />
          <ArrowDown size={72} className="lg:hidden" />
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
  );
}
