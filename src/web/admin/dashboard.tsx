import { Suspense } from "react";

import { Card, CardBody } from "@olinfo/react-components";

import { Buttons, Loading } from "~/components";
import { Participation, Student } from "~/models";
import { participationConverter, studentConverter } from "~/web/firebase/common/converters";
import { useCount } from "~/web/firebase/hooks/count";

import Announcements from "./announcements";
import ContestSettings from "./contest-settings";
import Export from "./export";
import { useAdmin } from "./provider";
import TokenList from "./token-list";

export default function Dashboard() {
  const { contest } = useAdmin();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody title="Impostazioni gara">
          <ContestSettings />
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Comunicazioni">
          <Announcements />
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Statistiche">
          <div className="h-20">
            <Suspense fallback={<Loading />}>
              <ContestInformation />
            </Suspense>
          </div>
        </CardBody>
      </Card>
      {contest.hasOnline && (
        <Card>
          <CardBody title="Ultimi token">
            <div className="h-64 max-h-screen">
              <TokenList />
            </div>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardBody title="Esportazione">
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
        </CardBody>
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
