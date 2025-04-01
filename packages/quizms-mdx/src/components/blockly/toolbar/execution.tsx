import { useEffect, useState } from "react";

import { Pause, Play, RotateCcw, Send, SkipForward } from "lucide-react";

type Props = {
  evaluate: () => Promise<void>;
  evaluated: boolean;
  selectedEvaluated: boolean;
  step: () => Promise<void>;
  reset: () => void;
};

export function ExecutionButtons({ evaluate, evaluated, selectedEvaluated, step, reset }: Props) {
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
        <div className="join-item tooltip" data-tip="Esegui/pausa">
          <button
            type="button"
            className="btn btn-info rounded-[inherit]"
            disabled={selectedEvaluated || !evaluated}
            onClick={() => setPlaying(!playing)}
            aria-label="Esegui un blocco">
            {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
          </button>
        </div>
        <div className="join-item tooltip" data-tip="Esegui un blocco">
          <button
            type="button"
            className="btn btn-info rounded-[inherit]"
            disabled={selectedEvaluated || !evaluated}
            onClick={step}
            aria-label="Esegui un blocco">
            <SkipForward className="size-6" />
          </button>
        </div>
        <div className="join-item tooltip" data-tip="Esegui da capo">
          <button
            type="button"
            className="btn btn-info rounded-[inherit]"
            aria-label="Esegui da capo"
            disabled={!evaluated}
            onClick={() => {
              reset();
              setPlaying(false);
            }}>
            <RotateCcw className="size-6" />
          </button>
        </div>
      </div>
      <div className="tooltip" data-tip="Correggi la soluzione">
        <button
          type="button"
          className="btn btn-success"
          aria-label="Correggi la soluzione"
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
          aria-label="Velocità di esecuzione"
        />
        <div className="flex w-full justify-between px-2 text-xs">
          <span>Lento</span>
          <span>Veloce</span>
        </div>
      </div>
    </>
  );
}
