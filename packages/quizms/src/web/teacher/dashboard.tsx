import { useRef } from "react";

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
import { addMinutes, isSameDay, subMinutes } from "date-fns";
import { saveAs } from "file-saver";
import { range } from "lodash-es";
import Markdown from "react-markdown";
import { Link } from "wouter";

import { Timer } from "~/web/components";

import { useTeacher } from "./context";
import { Announcements } from "./dashboard-announcements";
import { StudentRestoreList } from "./dashboard-student-restore";

function StartContestButton() {
  const { startParticipation } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);

  const close = () => modalRef.current?.close();

  const start = async () => {
    await startParticipation();
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
  const { stopParticipation } = useTeacher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const close = () => modalRef.current?.close();

  const undoContestStart = async () => {
    await stopParticipation();
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

function ContestData({ startingTime, endingTime }: { startingTime: Date; endingTime: Date }) {
  const { participation } = useTeacher();

  const undoEnd = subMinutes(startingTime!, 1);

  return (
    <div className="flex flex-col gap-2">
      <WithinTimeRange end={startingTime}>
        <p className="my-2 text-lg">
          <b>Codice:</b> <span className="font-mono">{participation.token}</span>
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
          <b>Codice:</b> <span className="font-mono">{participation.token}</span>
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
  const { contest, participation } = useTeacher();

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
          {contest.hasOnline && (
            <div className="font-bold">
              La gara si potrà svolgere dal{" "}
              <DateTime date={contest.contestWindowStart} dateStyle="long" />{" "}
              {isSameDay(contest.contestWindowStart, contest.contestWindowEnd) ? (
                <>
                  alle <DateTime date={contest.contestWindowEnd} dateStyle="hidden" />
                </>
              ) : (
                <>
                  al <DateTime date={contest.contestWindowEnd} dateStyle="long" />
                </>
              )}
              .
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
        <CardBody title="Gestione Gara">
          {/* contest data */}
          {contest.hasOnline &&
            (participation.startingTime && participation.endingTime ? (
              <ContestData
                startingTime={participation.startingTime}
                endingTime={participation.endingTime}
              />
            ) : (
              <p>La gara non è ancora iniziata!</p>
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
            <Link className="btn btn-primary" href="/students">
              Gestisci studenti e risposte
            </Link>
          </CardActions>
        </CardBody>
      </Card>
      {contest.hasOnline && (
        <Card>
          <CardBody title="Richieste di accesso">
            <div className="h-96 max-h-screen">
              <StudentRestoreList isStarted={!!participation.token} />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function DownloadPdfButton() {
  const { participation, getPdfStatements } = useTeacher();

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
        page.drawText("Pagina lasciata volontariamente vuota", {
          x: 10,
          y: 10,
          size: 17,
        });
      }
    }

    const data = await pdf.save();
    const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    saveAs(blob, `${participation.id}.pdf`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      Scarica PDF con tutti i testi
    </Button>
  );
}

function DownloadZipButton() {
  const { participation, getPdfStatements } = useTeacher();

  const onClick = async () => {
    const statements = await getPdfStatements();

    const files = Object.entries(statements).map(
      ([name, data]) =>
        new File([data], `${name}.pdf`, {
          type: "application/pdf",
        }),
    );
    const zip = await downloadZip(files).blob();

    saveAs(zip, `${participation.id}.zip`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      Scarica ZIP con tutti i testi
    </Button>
  );
}
