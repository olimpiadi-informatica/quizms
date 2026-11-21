import { Suspense, useCallback } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Loading, useLocalize } from "@olinfo/quizms/components";
import type { Student, Venue } from "@olinfo/quizms/models";
import { Card, CardActions, CardBody } from "@olinfo/react-components";
import { Link } from "wouter";

import { studentConverter, venueConverter } from "~/web/common/converters";
import { useCount } from "~/web/hooks/count";

import Announcements from "./announcements";
import ContestSettings from "./contest-settings";
import { useAdmin } from "./context";
import Export, { scoreboardFormatter, scoreboradHeader } from "./export";

export default function Dashboard() {
  const { t } = useLingui();
  const { contest, variants } = useAdmin();
  const contestName = useLocalize()(contest.name);
  const contestScoreboardFormatter = useCallback(
    (student: Student) => scoreboardFormatter(contest, variants, student),
    [contest, variants],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody title={t`Contest settings`}>
          <ContestSettings />
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Announcements`}>
          <Announcements />
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Schools`}>
          <Suspense fallback={<Loading />}>
            <ContestInformation />
          </Suspense>
          <CardActions>
            <Link href="/schools" className="btn btn-primary">
              <Trans>School management</Trans>
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Export`}>
          <CardActions>
            <Export
              label={t`Export schools`}
              description={
                <Trans>
                  You are about to export the data of all the schools of the contest{" "}
                  <b>{contestName}</b>.
                </Trans>
              }
              collection="venues"
              converter={venueConverter}
              options={{ constraints: { contestId: contest.id, disabled: false } }}
              formatter={(data: Venue) => JSON.stringify(data)}
            />
            <Export
              label={t`Export students`}
              description={
                <Trans>
                  You are about to export the data of all the students of the contest{" "}
                  <b>{contestName}</b>.
                </Trans>
              }
              collection="students"
              converter={studentConverter}
              options={{
                constraints: { contestId: contest.id, disabled: false },
                group: true,
              }}
              formatter={(data: Student) => JSON.stringify(data)}
            />
            <Export
              label={t`Export scoreboard`}
              description={
                <Trans>
                  You are about to export the scoreboard of the contest <b>{contestName}</b>.
                </Trans>
              }
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

  const totalSchools = useCount<Venue>("venues", {
    constraints: {
      contestId: contest.id,
      disabled: false,
    },
  });

  const finalizedSchools = useCount<Venue>("venues", {
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
      <div>
        <Trans>Total schools: {totalSchools}</Trans>
      </div>
      <div>
        <Trans>Finalized schools: {finalizedSchools}</Trans>
      </div>
      <div>
        <Trans>Total students: {totalStudents}</Trans>
      </div>
    </div>
  );
}
