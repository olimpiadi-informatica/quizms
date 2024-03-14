import React, { Suspense } from "react";

import { formatDate, formatTime } from "~/utils/date";
import { participationMappingConverter } from "~/web/firebase/converters";
import { useCollection } from "~/web/firebase/hooks";

import { useAdmin } from "./provider";

export default function TokenList() {
  return (
    <div className="flex h-full flex-col items-start gap-3 overflow-auto rounded-lg border border-base-content/15">
      <table className="table table-pin-rows">
        <thead>
          <tr>
            <th>Scuola</th>
            <th>Token</th>
            <th>Inizio gara</th>
          </tr>
        </thead>
        <tbody>
          <Suspense
            fallback={
              <tr>
                <td>Nessuna token generato.</td>
              </tr>
            }>
            <TokenListInner />
          </Suspense>
        </tbody>
      </table>
    </div>
  );
}

function TokenListInner() {
  const { contest } = useAdmin();

  const [tokens] = useCollection("participationMapping", participationMappingConverter, {
    constraints: { contestId: contest.id },
    orderBy: ["startingTime", "desc"],
    limit: 50,
  });

  return tokens.map((token) => (
    <tr key={token.id}>
      <td>{token.participationId}</td>
      <td>{token.id}</td>
      <td>
        {formatDate(token.startingTime, { style: "short" })} {formatTime(token.startingTime)}
      </td>
    </tr>
  ));
}
