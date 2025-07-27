import { Suspense } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { Card, CardActions, CardBody } from "@olinfo/react-components";
import { Link } from "wouter";

import type { Participation, Student } from "~/models";
import { Loading } from "~/web/components";
import { participationConverter, studentConverter } from "~/web/firebase/common/converters";
import { useCount } from "~/web/firebase/hooks/count";

import Announcements from "./announcements";
import ContestSettings from "./contest-settings";
import { useAdmin } from "./context";
import Export from "./export";
import TokenList from "./token-list";

export default function Dashboard() {
  const { contest } = useAdmin();
  const { t } = useLingui();

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
            <Link href="/schools/" className="btn btn-primary">
              <Trans>Manage schools</Trans>
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      {contest.hasOnline && (
        <Card>
          <CardBody title={t`Latest tokens`}>
            <div className="h-64 max-h-screen">
              <TokenList />
            </div>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardBody title={t`Export`}>
          <CardActions>
            <Export
              label={t`schools`}
              description={t`all schools`}
              collection="participations"
              converter={participationConverter}
              options={{ constraints: { contestId: contest.id, disabled: false } }}
            />
            <Export
              label={t`students`}
              description={t`all students`}
              collection="students"
              converter={studentConverter}
              options={{
                constraints: { contestId: contest.id, disabled: false },
                group: true,
              }}
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
