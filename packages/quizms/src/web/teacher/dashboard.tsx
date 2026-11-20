import { useRef, useState } from "react";

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

import type { TimeRange } from "~/models";
import { statementString } from "~/utils";
import { Timer } from "~/web/components";

import { useTeacher } from "./context";
import { Announcements } from "./dashboard-announcements";
import { StudentRestoreList } from "./dashboard-student-restore";

function StartContestButton() {
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
        Inizia prova online
      </Button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler iniziare la gara?</p>
        <Form onSubmit={start} className="!max-w-full">
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={close}>Annulla</FormButton>
            <SubmitButton className="btn-warning">Conferma</SubmitButton>
          </div>
        </Form>
      </Modal>
    </>
  );
}

function StopContestButton() {
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
        Annulla inizio gara
      </Button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler annullare l&apos;inizio della gara?</p>
        <Form onSubmit={undoContestStart} className="!max-w-full">
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={close}>Indietro</FormButton>
            <SubmitButton className="btn-warning">Conferma</SubmitButton>
          </div>
        </Form>
      </Modal>
    </>
  );
}

function ContestData({ participationWindow }: { participationWindow: TimeRange }) {
  const { venue } = useTeacher();
  const { start: startingTime, end: endingTime } = participationWindow;

  const undoEnd = subMinutes(startingTime!, 1);

  return (
    <div className="flex flex-col gap-2">
      <WithinTimeRange end={startingTime}>
        <p className="my-2 text-lg">
          <b>Codice:</b> <span className="font-mono">{venue.token}</span>
        </p>
        <p>
          La gara inizierà alle ore <DateTime date={startingTime} dateStyle="hidden" />.
        </p>
        <p>
          Tempo rimanente all&apos;inizio: <Timer endTime={startingTime} />
        </p>
        <WithinTimeRange end={undoEnd}>
          <p>
            Se hai iniziato per sbaglio, puoi ancora annullare la gara fino a un minuto prima
            dell&apos;inizio.
          </p>
        </WithinTimeRange>
      </WithinTimeRange>
      <WithinTimeRange start={startingTime} end={endingTime}>
        <p>
          <b>Codice:</b> <span className="font-mono">{venue.token}</span>
        </p>
        <p>
          La gara terminerà alle <DateTime date={endingTime} dateStyle="hidden" />.
        </p>
        <p>
          Tempo rimanente: <Timer endTime={endingTime} />
        </p>
        <p className="text-center text-2xl">
          Gara iniziata alle ore <DateTime date={startingTime} dateStyle="hidden" />.
        </p>
      </WithinTimeRange>
      <WithinTimeRange start={endingTime}>
        <p>
          Gara iniziata alle ore <DateTime date={startingTime} dateStyle="hidden" />.
        </p>
        <p>La gara è terminata.</p>
      </WithinTimeRange>
    </div>
  );
}

export default function TeacherDashboard() {
  const { contest, venue } = useTeacher();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody title="Comunicazioni">
          <Announcements />
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Informazioni Gara">
          <div className="prose prose-a:link-info max-w-none">
            <Markdown>{contest.instructions}</Markdown>
          </div>
          {contest.onlineSettings && (
            <div className="font-bold">
              La gara si potrà svolgere dal{" "}
              <DateTime date={contest.onlineSettings.contestWindow.start} dateStyle="long" />{" "}
              {isSameDay(
                contest.onlineSettings.contestWindow.start,
                contest.onlineSettings.contestWindow.end,
              ) ? (
                <>
                  alle{" "}
                  <DateTime date={contest.onlineSettings.contestWindow.end} dateStyle="hidden" />
                </>
              ) : (
                <>
                  al <DateTime date={contest.onlineSettings.contestWindow.end} dateStyle="long" />
                </>
              )}
              .
            </div>
          )}
          {contest.hasOffline && <PdfDownloads />}
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Gestione Gara">
          {/* contest data */}
          {contest.onlineSettings &&
            (venue.participationWindow ? (
              <ContestData participationWindow={venue.participationWindow} />
            ) : (
              <p>La gara non è ancora iniziata!</p>
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
              Gestisci studenti e risposte
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      {contest.onlineSettings && (
        <Card>
          <CardBody title="Richieste di accesso">
            <div className="h-96 max-h-screen">
              <StudentRestoreList isStarted={!!venue.token} />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function PdfDownloads() {
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
          aria-label="Lingua dei testi"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              Testi in {lang.toUpperCase()}
            </option>
          ))}
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
        page.drawText(statementString(language, "blankPage"), {
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
      Scarica PDF con tutti i testi
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
      Scarica ZIP con tutti i testi
    </Button>
  );
}
