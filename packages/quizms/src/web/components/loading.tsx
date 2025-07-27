import { Trans } from "@lingui/react/macro";

import { Progress } from "./progress";

export function Loading() {
  return (
    <div className="not-prose flex grow items-center justify-center">
      <Progress>
        <p className="pb-1">
          <Trans>Loading...</Trans>
        </p>
      </Progress>
    </div>
  );
}
