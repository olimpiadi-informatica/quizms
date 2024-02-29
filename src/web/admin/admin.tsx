import React, { Suspense } from "react";

import { Buttons, Card, Loading } from "~/components";
import { Participation, Student } from "~/models";
import { participationConverter, studentConverter } from "~/web/firebase/converters";
import { useCount } from "~/web/firebase/hooks/count";

import Announcements from "./announcements";
import ContestSettings from "./contest-settings";
import Export from "./export";
import { useAdmin } from "./provider";

export function Admin() {
  const { contest } = useAdmin();

  return (
    <div className="flex flex-col gap-5 p-5">
      <Card title="Impostazioni gara">
        <ContestSettings />
      </Card>
      <Card title="Comunicazioni">
        <Announcements />
      </Card>
      <Card title="Statistiche">
        <div className="h-20">
          <Suspense fallback={<Loading />}>
            <ContestInformation />
          </Suspense>
        </div>
      </Card>
      <Card title="Esportazione">
        <Buttons>
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
        </Buttons>
      </Card>
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
