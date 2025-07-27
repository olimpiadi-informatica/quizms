import { useRef } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Card,
  CardActions,
  CardBody,
  DateTime,
  Form,
  FormButton,
  Modal,
  SubmitButton,
  WithinTimeRange,
} from "@olinfo/react-components";
import { downloadZip } from "client-zip";
import { addMinutes, addSeconds, isSameDay, roundToNearestMinutes, subMinutes } from "date-fns";
import { saveAs } from "file-saver";
import { range } from "lodash-es";
import Markdown from "react-markdown";
import { Link } from "wouter";

import { randomToken } from "~/utils/random";
import { Timer } from "~/web/components";

import { useTeacher } from "./context";
import { Announcements } from "./dashboard-announcements";
import { StudentRestoreList } from "./dashboard-student-restore";

function StartContestButton() {
  const { contest, participation, setParticipation } = useTeacher();
  const { t, i18n } = useLingui();

  const modalRef = useRef<HTMLDialogElement>(null);

  const close = () => modalRef.current?.close();

  const start = async () => {
    const token = await randomToken(i18n.locale);
    const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
    const endingTime = addMinutes(startingTime, contest.hasOnline ? contest.duration : 0);
    await setParticipation({ ...participation, token, startingTime, endingTime });
    close();
  };

  return (
    <>
      <Button className="btn-success" onClick={() => modalRef.current?.showModal()}>
        <Trans>Start online contest</Trans>
      </Button>
      <Modal ref={modalRef} title={t`Confirm`}>
        <p>
          <Trans>Are you sure you want to start the contest?</Trans>
        </p>
        <Form onSubmit={start} className="!max-w-full">
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={close}>
              <Trans>Cancel</Trans>
            </FormButton>
            <SubmitButton className="btn-warning">
              <Trans>Confirm</Trans>
            </SubmitButton>
          </div>
        </Form>
      </Modal>
    </>
  );
}

function StopContestButton() {
  const { participation, setParticipation } = useTeacher();
  const { t } = useLingui();
  const modalRef = useRef<HTMLDialogElement>(null);

  const close = () => modalRef.current?.close();

  const undoContestStart = async () => {
    await setParticipation({
      ...participation,
      token: undefined,
      startingTime: undefined,
      endingTime: undefined,
    });
    close();
  };

  return (
    <>
      <Button className="btn-error" onClick={() => modalRef.current?.showModal()}>
        <Trans>Cancel contest start</Trans>
      </Button>
      <Modal ref={modalRef} title={t`Confirm`}>
        <p>
          <Trans>Are you sure you want to cancel the start of the contest?</Trans>
        </p>
        <Form onSubmit={undoContestStart} className="!max-w-full">
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={close}>
              <Trans>Back</Trans>
            </FormButton>
            <SubmitButton className="btn-warning">
              <Trans>Confirm</Trans>
            </SubmitButton>
          </div>
        </Form>
      </Modal>
    </>
  );
}

function ContestData({ startingTime, endingTime }: { startingTime: Date; endingTime: Date }) {
  const { participation } = useTeacher();

  const undoEnd = subMinutes(startingTime!, 1);

  return (
    <div className="flex flex-col gap-2">
      <WithinTimeRange end={startingTime}>
        <p className="my-2 text-lg">
          <b>
            <Trans>Code:</Trans>
          </b>{" "}
          <span className="font-mono">{participation.token}</span>
        </p>
        <p>
          <Trans>
            The contest will start at <DateTime date={startingTime} dateStyle="hidden" />.
          </Trans>
        </p>
        <p>
          <Trans>
            Time remaining until start: <Timer endTime={startingTime} />
          </Trans>
        </p>
        <WithinTimeRange end={undoEnd}>
          <p>
            <Trans>
              If you started the contest by mistake, you can still cancel the contest up to one
              minute before it starts.
            </Trans>
          </p>
        </WithinTimeRange>
      </WithinTimeRange>
      <WithinTimeRange start={startingTime} end={endingTime}>
        <p>
          <b>
            <Trans>Code:</Trans>
          </b>{" "}
          <span className="font-mono">{participation.token}</span>
        </p>
        <p>
          <Trans>
            The contest will end at <DateTime date={endingTime} dateStyle="hidden" />.
          </Trans>
        </p>
        <p>
          <Trans>
            Time remaining: <Timer endTime={endingTime} />
          </Trans>
        </p>
        <p className="text-center text-2xl">
          <Trans>
            Contest started at <DateTime date={startingTime} dateStyle="hidden" />.
          </Trans>
        </p>
      </WithinTimeRange>
      <WithinTimeRange start={endingTime}>
        <p>
          <Trans>
            Contest started at <DateTime date={startingTime} dateStyle="hidden" />.
          </Trans>
        </p>
        <p>
          <Trans>The contest has ended.</Trans>
        </p>
      </WithinTimeRange>
    </div>
  );
}

export default function TeacherDashboard() {
  const { contest, participation } = useTeacher();
  const { t } = useLingui();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody title={t`Announcements`}>
          <Announcements />
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Contest Information`}>
          <div className="prose prose-a:link-info max-w-none">
            <Markdown>{contest.instructions}</Markdown>
          </div>
          {contest.hasOnline && (
            <div className="font-bold">
              {isSameDay(contest.contestWindowStart, contest.contestWindowEnd) ? (
                <Trans>
                  The contest can be taken from{" "}
                  <DateTime date={contest.contestWindowStart} dateStyle="long" /> until{" "}
                  <DateTime date={contest.contestWindowEnd} dateStyle="hidden" />.
                </Trans>
              ) : (
                <Trans>
                  The contest can be taken from{" "}
                  <DateTime date={contest.contestWindowStart} dateStyle="long" /> until{" "}
                  <DateTime date={contest.contestWindowEnd} dateStyle="long" />.
                </Trans>
              )}
            </div>
          )}
          {contest.hasPdf && (
            <CardActions>
              <DownloadPdfButton />
              <DownloadZipButton />
            </CardActions>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Contest Management`}>
          {/* contest data */}
          {contest.hasOnline &&
            (participation.startingTime && participation.endingTime ? (
              <ContestData
                startingTime={participation.startingTime}
                endingTime={participation.endingTime}
              />
            ) : (
              <p>
                <Trans>The contest has not started yet!</Trans>
              </p>
            ))}
          <CardActions>
            {contest.hasOnline && (
              <WithinTimeRange start={contest.contestWindowStart} end={contest.contestWindowEnd}>
                {participation.startingTime ? (
                  contest.allowRestart && (
                    <WithinTimeRange
                      start={addMinutes(participation.startingTime, contest.duration)}>
                      <StartContestButton />
                    </WithinTimeRange>
                  )
                ) : (
                  <StartContestButton />
                )}
              </WithinTimeRange>
            )}
            {contest.hasOnline && participation.startingTime && (
              <WithinTimeRange end={subMinutes(participation.startingTime, 1)}>
                <StopContestButton />
              </WithinTimeRange>
            )}
            <Link className="btn btn-primary" href="/students/">
              <Trans>Manage students and answers</Trans>
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      {contest.hasOnline && (
        <Card>
          <CardBody title={t`Access Requests`}>
            <div className="h-96 max-h-screen">
              <StudentRestoreList />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function DownloadPdfButton() {
  const { participation, getPdfStatements } = useTeacher();
  const { t } = useLingui();

  const onClick = async () => {
    const statements = await getPdfStatements();

    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const pdf = await PDFDocument.create();
    for (const statement of Object.values(statements)) {
      const otherPdf = await PDFDocument.load(statement);
      const toCopy = range(otherPdf.getPages().length);
      const pages = await pdf.copyPages(otherPdf, toCopy);
      for (const page of pages) {
        pdf.addPage(page);
      }
      if (pages.length % 2) {
        const page = pdf.addPage();
        page.drawText(t`This page is intentionally left blank`, {
          x: 10,
          y: 10,
          size: 17,
        });
      }
    }

    const blob = new Blob([await pdf.save()], { type: "application/pdf" });
    saveAs(blob, `${participation.id}.pdf`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      <Trans>Download PDF with all variants</Trans>
    </Button>
  );
}

function DownloadZipButton() {
  const { participation, getPdfStatements } = useTeacher();

  const onClick = async () => {
    const statements = await getPdfStatements();

    const files = Object.entries(statements).map(
      ([name, data]) => new File([data], `${name}.pdf`, { type: "application/pdf" }),
    );
    const zip = await downloadZip(files).blob();

    saveAs(zip, `${participation.id}.zip`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      <Trans>Download ZIP with all variants</Trans>
    </Button>
  );
}
