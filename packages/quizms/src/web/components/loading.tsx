import { Progress } from "./progress";

export function Loading() {
  return (
    <div id="loading" className="not-prose flex grow items-center justify-center">
      <Progress>
        <p className="pb-1">Caricamento in corso...</p>
      </Progress>
    </div>
  );
}
