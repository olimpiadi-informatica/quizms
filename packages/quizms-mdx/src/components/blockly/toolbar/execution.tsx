import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Pause, Play, RotateCcw, Send, SkipForward } from "lucide-react";

type Props = {
  evaluate: () => Promise<void>;
  evaluated: boolean;
  selectedEvaluated: boolean;
  step: () => Promise<void>;
  reset: () => void;
};

export function ExecutionButtons({ evaluate, evaluated, selectedEvaluated, step, reset }: Props) {
  const { t } = useLingui();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  useEffect(() => {
    const intervals = [5000, 2000, 1000, 500, 200, 100, 10];
    if (playing) {
      const interval = setInterval(step, intervals[speed]);
      return () => clearInterval(interval);
    }
  }, [step, speed, playing]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to reset the playing state when the execution changes (and so the step function) or when the execution completes
  useEffect(() => setPlaying(false), [step, selectedEvaluated]);

  return (
    <>
      <div className="join join-horizontal">
        <div className="join-item tooltip" data-tip={t`Run/pause`}>
          <button
            type="button"
            className="btn btn-info rounded-[inherit]"
            disabled={selectedEvaluated || !evaluated}
            onClick={() => setPlaying(!playing)}
            aria-label={t`Run/pause`}>
            {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
          </button>
        </div>
        <div className="join-item tooltip" data-tip={t`Run one block`}>
          <button
            type="button"
            className="btn btn-info rounded-[inherit]"
            disabled={selectedEvaluated || !evaluated}
            onClick={step}
            aria-label={t`Run one block`}>
            <SkipForward className="size-6" />
          </button>
        </div>
        <div className="join-item tooltip" data-tip={t`Run from the start`}>
          <button
            type="button"
            className="btn btn-info rounded-[inherit]"
            aria-label={t`Run from the start`}
            disabled={!evaluated}
            onClick={() => {
              reset();
              setPlaying(false);
            }}>
            <RotateCcw className="size-6" />
          </button>
        </div>
      </div>
      <div className="tooltip" data-tip={t`Check the solution`}>
        <button
          type="button"
          className="btn btn-success"
          aria-label={t`Check the solution`}
          disabled={evaluated}
          onClick={evaluate}>
          <Send className="size-6" />
        </button>
      </div>
      <div>
        <input
          className="range"
          type="range"
          min="0"
          max="6"
          value={speed}
          onChange={(e) => setSpeed(e.target.valueAsNumber)}
          aria-label={t`Execution speed`}
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>
            <Trans>Slow</Trans>
          </span>
          <span>
            <Trans>Fast</Trans>
          </span>
        </div>
      </div>
    </>
  );
}
