import React, { Suspense } from "react";

import { Loading } from "~/components";
import { Participation, Student } from "~/models";
import { participationConverter, studentConverter } from "~/web/firebase/converters";
import { useCount } from "~/web/firebase/hooks/count";

import ContestSettings from "./contest-settings";
import Export from "./export";
import { useAdmin } from "./provider";

export function Admin() {
  const { contest } = useAdmin();

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="highlight-border card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Impostazioni gara</h2>
          <ContestSettings />
        </div>
      </div>
      <div className="highlight-border card bg-base-200">
        <div className="card-body h-44">
          <h2 className="card-title">Statistiche</h2>
          <Suspense fallback={<Loading />}>
            <ContestInformation />
          </Suspense>
        </div>
      </div>
      <div className="highlight-border card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Esportazione</h2>
          <div className="flex justify-center gap-5">
            <Export
              label="scuole"
              description="tutte le scuole"
              collection="participations"
              converter={participationConverter}
              options={{ constraints: { contestId: contest.id } }}
            />
            <Export
              label="studenti"
              description="tutti gli studenti"
              collection="students"
              converter={studentConverter}
              options={{
                constraints: { contestId: contest.id, disabled: false },
                group: true,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContestInformation() {
  const { contest } = useAdmin();

  const totalSchools = useCount<Participation>("participations", {
    constraints: {
      contestId: contest.id,
    },
  });

  const finalizedSchools = useCount<Participation>("participations", {
    constraints: {
      contestId: contest.id,
      finalized: true,
    },
  });

  const totalStudents = useCount<Student>("students", {
    constraints: {
      contestId: contest.id,
      disabled: false,
    },
    group: true,
  });

  return (
    <div>
      <div>Scuole totali: {totalSchools}</div>
      <div>Scuole finalizzate: {finalizedSchools}</div>
      <div>Studenti totali: {totalStudents}</div>
    </div>
  );
}