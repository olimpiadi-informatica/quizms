import type { ReactNode } from "react";

import useSWR from "swr/immutable";

import { BaseStatement } from "~/web/student/base-statement";

type Props = {
  id: string;
  fetcher: () => ReactNode | Promise<ReactNode>;
};

export function RemoteStatement({ id, fetcher }: Props) {
  return (
    <BaseStatement>
      <InnerStatement id={id} fetcher={fetcher} />
    </BaseStatement>
  );
}

function InnerStatement({ id, fetcher }: Props) {
  const { data } = useSWR(id, fetcher);
  return data;
}
