import { useRef, useState } from "react";

import { msg } from "@lingui/core/macro";
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
import { isSameDay, subMinutes } from "date-fns";
import { saveAs } from "file-saver";
import { range } from "lodash-es";
import Markdown from "react-markdown";
import { Link } from "wouter";

import { loadUiLocale } from "~/i18n";
import type { TimeRange } from "~/models";
import { Timer, useLocalize } from "~/web/components";

import { useTeacher } from "./context";
import { Announcements } from "./dashboard-announcements";
import { StudentRestoreList } from "./dashboard-student-restore";
import { SubmissionRequestList } from "./dashboard-submission-requests";

function StartContestButton() {
  const { t } = useLingui();
  const { startContestWindow } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);

  const close = () => modalRef.current?.close();

  const start = async () => {
    await startContestWindow();
    close();
  };

  return (
    <>
      <Button className="btn-success" onClick={() => modalRef.current?.showModal()}>
        <Trans>Start online test</Trans>
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
  const { t } = useLingui();
  const { stopContestWindow } = useTeacher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const close = () => modalRef.current?.close();

  const undoContestStart = async () => {
    await stopContestWindow();
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

function ContestData({ participationWindow }: { participationWindow: TimeRange }) {
  const { i18n } = useLingui();
  const { venue } = useTeacher();
  const { start: startingTime, end: endingTime } = participationWindow;
  const token = venue.token;
  const locale = i18n.locale;

  const undoEnd = subMinutes(startingTime!, 1);

  return (
    <div className="flex flex-col gap-2">
      <WithinTimeRange end={startingTime}>
        <p className="my-2 text-lg">
          <Trans>
            <b>Code:</b> <span className="font-mono">{token}</span>
          </Trans>
        </p>
        <p>
          <Trans>
            The contest will start at{" "}
            <DateTime date={startingTime} dateStyle="hidden" locale={locale} />.
          </Trans>
        </p>
        <p>
          <Trans>
            Time left until the start: <Timer endTime={startingTime} />
          </Trans>
        </p>
        <WithinTimeRange end={undoEnd}>
          <p>
            <Trans>
              If you started by mistake, you can still cancel the contest up to one minute before it
              starts.
            </Trans>
          </p>
        </WithinTimeRange>
      </WithinTimeRange>
      <WithinTimeRange start={startingTime} end={endingTime}>
        <p>
          <Trans>
            <b>Code:</b> <span className="font-mono">{token}</span>
          </Trans>
        </p>
        <p>
          <Trans>
            The contest will end at{" "}
            <DateTime date={endingTime} dateStyle="hidden" locale={locale} />.
          </Trans>
        </p>
        <p>
          <Trans>
            Time left: <Timer endTime={endingTime} />
          </Trans>
        </p>
        <p className="text-center text-2xl">
          <Trans>
            Contest started at <DateTime date={startingTime} dateStyle="hidden" locale={locale} />.
          </Trans>
        </p>
      </WithinTimeRange>
      <WithinTimeRange start={endingTime}>
        <p>
          <Trans>
            Contest started at <DateTime date={startingTime} dateStyle="hidden" locale={locale} />.
          </Trans>
        </p>
        <p>
          <Trans>The contest is over.</Trans>
        </p>
      </WithinTimeRange>
    </div>
  );
}

export default function TeacherDashboard() {
  const { t, i18n } = useLingui();
  const localize = useLocalize();
  const { contest, venue } = useTeacher();
  const locale = i18n.locale;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody title={t`Announcements`}>
          <Announcements />
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Contest information`}>
          <div className="prose prose-a:link-info max-w-none">
            <Markdown>{localize(contest.instructions)}</Markdown>
          </div>
          {contest.onlineSettings && (
            <div className="font-bold">
              {isSameDay(
                contest.onlineSettings.contestWindow.start,
                contest.onlineSettings.contestWindow.end,
              ) ? (
                <Trans>
                  The contest can be taken from{" "}
                  <DateTime
                    date={contest.onlineSettings.contestWindow.start}
                    dateStyle="long"
                    locale={locale}
                  />{" "}
                  until{" "}
                  <DateTime
                    date={contest.onlineSettings.contestWindow.end}
                    dateStyle="hidden"
                    locale={locale}
                  />
                  .
                </Trans>
              ) : (
                <Trans>
                  The contest can be taken from{" "}
                  <DateTime
                    date={contest.onlineSettings.contestWindow.start}
                    dateStyle="long"
                    locale={locale}
                  />{" "}
                  to{" "}
                  <DateTime
                    date={contest.onlineSettings.contestWindow.end}
                    dateStyle="long"
                    locale={locale}
                  />
                  .
                </Trans>
              )}
            </div>
          )}
          {contest.hasOffline && <PdfDownloads />}
        </CardBody>
      </Card>
      <Card>
        <CardBody title={t`Contest management`}>
          {/* contest data */}
          {contest.onlineSettings &&
            (venue.participationWindow ? (
              <ContestData participationWindow={venue.participationWindow} />
            ) : (
              <p>
                <Trans>The contest has not started yet!</Trans>
              </p>
            ))}
          <CardActions>
            {contest.onlineSettings && (
              <WithinTimeRange
                start={contest.onlineSettings.contestWindow.start}
                end={contest.onlineSettings.contestWindow.end}>
                {venue.participationWindow ? (
                  contest.onlineSettings.allowRestart && (
                    <WithinTimeRange start={venue.participationWindow.end}>
                      <StartContestButton />
                    </WithinTimeRange>
                  )
                ) : (
                  <StartContestButton />
                )}
              </WithinTimeRange>
            )}
            {venue.participationWindow && (
              <WithinTimeRange end={subMinutes(venue.participationWindow.start, 1)}>
                <StopContestButton />
              </WithinTimeRange>
            )}
            <Link className="btn btn-primary" href="/students">
              <Trans>Manage students and answers</Trans>
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      {contest.onlineSettings && (
        <Card>
          <CardBody title={t`Access requests`}>
            <div className="h-96 max-h-screen">
              <StudentRestoreList isStarted={!!venue.token} />
            </div>
          </CardBody>
        </Card>
      )}
      {contest.onlineSettings?.terminationMode === "teacher_approval" && (
        <Card>
          <CardBody title={t`Submission requests`}>
            <div className="h-96 max-h-screen">
              <SubmissionRequestList isStarted={!!venue.token} />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function PdfDownloads() {
  const { t } = useLingui();
  const { contest } = useTeacher();
  // Contests stored before `languages` existed don't have the field
  const languages = contest.languages ?? ["it"];
  const [language, setLanguage] = useState(languages[0]);
  const multilingual = languages.length > 1;

  return (
    <CardActions>
      {multilingual && (
        <select
          className="select select-bordered"
          aria-label={t`Statement language`}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((lang) => {
            const code = lang.toUpperCase();
            return (
              <option key={lang} value={lang}>
                {t`Statements in ${code}`}
              </option>
            );
          })}
        </select>
      )}
      <DownloadPdfButton language={multilingual ? language : undefined} />
      <DownloadZipButton language={multilingual ? language : undefined} />
    </CardActions>
  );
}

/** Name of a downloaded file: `<venue>.pdf`, or `<venue>.<lang>.pdf` for multilingual contests. */
function downloadName(venueId: string, language: string | undefined, extension: string) {
  return language ? `${venueId}.${language}.${extension}` : `${venueId}.${extension}`;
}

function DownloadPdfButton({ language }: { language?: string }) {
  const { venue, getPdfStatements } = useTeacher();

  const onClick = async () => {
    const statements = await getPdfStatements({ language });
    // In the language of the statements (Italian for single-language contests).
    const pdfI18n = await loadUiLocale(language);

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
        page.drawText(pdfI18n._(msg`This page intentionally left blank`), {
          x: 10,
          y: 10,
          size: 17,
        });
      }
    }

    const data = await pdf.save();
    const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    saveAs(blob, downloadName(venue.id, language, "pdf"));
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      <Trans>Download PDF with all statements</Trans>
    </Button>
  );
}

function DownloadZipButton({ language }: { language?: string }) {
  const { venue, getPdfStatements } = useTeacher();

  const onClick = async () => {
    const statements = await getPdfStatements({ language });

    const files = Object.entries(statements).map(
      ([name, data]) =>
        new File([data], `${name}.pdf`, {
          type: "application/pdf",
        }),
    );
    const zip = await downloadZip(files).blob();

    saveAs(zip, downloadName(venue.id, language, "zip"));
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      <Trans>Download ZIP with all statements</Trans>
    </Button>
  );
}
