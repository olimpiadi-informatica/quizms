import { Suspense, useCallback } from "react";

import { Loading } from "@olinfo/quizms/components";
import type { Participation, Student } from "@olinfo/quizms/models";
import { Card, CardActions, CardBody } from "@olinfo/react-components";
import { Link } from "wouter";

import { participationConverter, studentConverter } from "~/web/common/converters";
import { useCount } from "~/web/hooks/count";

import Announcements from "./announcements";
import ContestSettings from "./contest-settings";
import { useAdmin } from "./context";
import Export, { scoreboardFormatter, scoreboradHeader } from "./export";

export default function Dashboard() {
  const { contest, variants } = useAdmin();
  const contestScoreboardFormatter = useCallback(
    (student: Student) => scoreboardFormatter(contest, variants, student),
    [contest, variants],
  );

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
        <CardBody title="Scuole">
          <Suspense fallback={<Loading />}>
            <ContestInformation />
          </Suspense>
          <CardActions>
            <Link href="/schools" className="btn btn-primary">
              Gestione scuole
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Esportazione">
          <CardActions>
            <Export
              label="scuole"
              description="i dati di tutte le scuole"
              collection="participations"
              converter={participationConverter}
              options={{ constraints: { contestId: contest.id, disabled: false } }}
              formatter={(data: Participation) => JSON.stringify(data)}
            />
            <Export
              label="studenti"
              description="i dati di tutti gli studenti"
              collection="students"
              converter={studentConverter}
              options={{
                constraints: { contestId: contest.id, disabled: false },
                group: true,
              }}
              formatter={(data: Student) => JSON.stringify(data)}
            />
            <Export
              label="classifica"
              description="la classifica"
              collection="students"
              suggestedName={`scoreboard-${contest.id}.csv`}
              converter={studentConverter}
              options={{
                constraints: { contestId: contest.id, disabled: false },
                group: true,
              }}
              formatter={contestScoreboardFormatter}
              header={scoreboradHeader(contest)}
            />
          </CardActions>
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
      disabled: false,
    },
  });

  const finalizedSchools = useCount<Participation>("participations", {
    constraints: {
      contestId: contest.id,
      finalized: true,
      disabled: false,
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
