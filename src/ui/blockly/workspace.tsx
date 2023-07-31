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
    [executor],
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
    [executor, debug?.logJs],
  );

  const onJsonChange = useCallback(
    (json: object) => {
      if (debug?.logBlocks) {
        console.log(JSON.stringify(json, null, 2));
      }
    },
    [debug?.logBlocks],
  );

  useEffect(() => {
    if (terminated && pause) {
      onPlayPause();
    }
  }, [terminated, pause, onPlayPause]);

  return (
    <div className="relative inset-y-0 left-1/2 mb-5 w-screen -translate-x-1/2 px-4 sm:px-8">
      <div className="grid gap-3 md:grid-cols-[1fr_auto] lg:grid-rows-[auto_1fr] xl:grid-cols-[2fr_1fr]">
        <div className="flex gap-3 md:flex-col lg:flex-row">
          <div className="join md:join-vertical lg:join-horizontal">
            <div className="join-item tooltip" data-tip="Esegui/pausa">
              <div
                className={classNames(
                  "btn btn-info h-full w-full rounded-[inherit]",
                  terminated && "btn-disabled",
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
            <div className="join-item tooltip" data-tip="Esegui un blocco">
              <button
                className="btn btn-info rounded-[inherit]"
                disabled={terminated}
                onClick={() => executor?.step()}>
                <SkipForward className="h-6 w-6" />
              </button>
            </div>
            <div className="join-item tooltip" data-tip="Esegui fino alla fine">
              <button
                className="btn btn-info rounded-[inherit]"
                disabled={terminated}
                onClick={() => executor?.runAll()}>
                <FastForward className="h-6 w-6" />
              </button>
            </div>
            <div className="join-item tooltip" data-tip="Esegui da capo">
              <button className="btn btn-info rounded-[inherit]" onClick={onReset}>
                <RotateCcw className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="tooltip" data-tip="Invia la soluzione">
            <button className="btn btn-success">
              <Send className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border-2 border-[#c6c6c6] md:order-first lg:row-span-2">
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
            className="h-[32rem] max-h-[calc(100vh-6rem)] border-0 text-[#1f2937]"
          />
        </div>
        <div className="flex flex-col md:col-span-2 lg:col-span-1">
          <textarea
            rows={4}
            className="textarea textarea-bordered w-full grow resize-none font-mono placeholder:font-sans"
            placeholder="Input"
            maxLength={2000}
            value={input}
            onChange={onInputChange}
          />
          <div className="divider-horizontall divider">
            <ArrowDown size={72} />
          </div>
          <textarea
            rows={4}
            className="textarea textarea-bordered w-full grow resize-none font-mono placeholder:font-sans"
            placeholder="Output"
            value={output}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}
