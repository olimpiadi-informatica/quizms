import { useRef } from "react";

import { Card, CardBody, DateTime, WithinTimeRange } from "@olinfo/react-components";
import { addMinutes, addSeconds, isSameDay, roundToNearestMinutes, subMinutes } from "date-fns";
import { saveAs } from "file-saver";
import { range } from "lodash-es";
import { Link } from "wouter";

import { Button, Buttons, Modal, Timer } from "~/components";
import { randomToken } from "~/utils/random";

import { Announcements } from "./dashboard-announcements";
import { StudentRestoreList } from "./dashboard-student-restore";
import { useTeacher } from "./provider";

function StartContestButton() {
  const { participation, setParticipation } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);

  const start = async () => {
    const token = await randomToken();
    const startingTime = roundToNearestMinutes(addSeconds(Date.now(), 3.5 * 60));
    await setParticipation({ ...participation, token, startingTime });
  };

  return (
    <>
      <Button className="btn-success" onClick={() => modalRef.current?.showModal()}>
        Inizia prova online
      </Button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler iniziare la gara?</p>
        <Buttons className="mt-3" showError>
          <Button className="btn-info">Annulla</Button>
          <Button className="btn-warning" onClick={start}>
            Conferma
          </Button>
        </Buttons>
      </Modal>
    </>
  );
}

function StopContestButton() {
  const { participation, setParticipation } = useTeacher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const undoContestStart = () =>
    setParticipation({ ...participation, token: undefined, startingTime: undefined });

  return (
    <>
      <Button className="btn-error" onClick={() => modalRef.current?.showModal()}>
        Annulla inizio gara
      </Button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler annullare l&apos;inizio della gara?</p>
        <Buttons className="mt-1" showError>
          <Button className="btn-info">Annulla</Button>
          <Button className="btn-warning" onClick={undoContestStart}>
            Conferma
          </Button>
        </Buttons>
      </Modal>
    </>
  );
}

function ContestData({ startingTime }: { startingTime: Date }) {
  const { contest, participation } = useTeacher();

  const undoEnd = subMinutes(startingTime, 1);
  const contestEnd = addMinutes(startingTime, contest.duration!);

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
            Se ti sei sbagliato, puoi ancora annullare la gara fino a un minuto prima
            dell&apos;inizio.
          </p>
        </WithinTimeRange>
      </WithinTimeRange>
      <WithinTimeRange start={startingTime} end={contestEnd}>
        <p>
          <b>Codice:</b> <span className="font-mono">{participation.token}</span>
        </p>
        <p>
          La gara terminerà alle <DateTime date={contestEnd} dateStyle="hidden" />.
        </p>
        <p>
          Tempo rimanente: <Timer endTime={contestEnd} />
        </p>
        <div className="mx-auto flex flex-col items-center justify-center gap-2 text-2xl">
          Gara iniziata alle ore <DateTime date={startingTime} dateStyle="hidden" />.
        </div>
      </WithinTimeRange>
      <WithinTimeRange start={contestEnd}>
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

  if (!contest.contestWindowEnd || !contest.contestWindowStart) {
    throw new Error("Data inizio e fine del contest non specificate");
  }
  if (!contest.duration) {
    throw new Error("Durata del contest non specificata");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody title="Comunicazioni">
          <Announcements />
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Informazioni Gara">
          <div className="prose mb-2 max-w-none whitespace-pre-wrap">{contest.instructions}</div>
          {contest.hasOnline && (
            <div className="font-bold">
              La gara si potrà svolgere dal{" "}
              <DateTime date={contest.contestWindowStart} dateStyle="long" />{" "}
              {isSameDay(contest.contestWindowStart, contest.contestWindowEnd) ? (
                <>
                  alle <DateTime date={contest.contestWindowStart} dateStyle="hidden" />
                </>
              ) : (
                <>
                  al <DateTime date={contest.contestWindowStart} dateStyle="long" />
                </>
              )}
              .
            </div>
          )}
          {contest.hasPdf && (
            <Buttons className="mt-2">
              <DownloadPdfButton />
            </Buttons>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody title="Gestione Gara">
          {/* contest data */}
          {contest.hasOnline &&
            (participation.startingTime ? (
              <ContestData startingTime={participation.startingTime} />
            ) : (
              <p>La gara non è ancora iniziata!</p>
            ))}
          <Buttons className="mt-2">
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
            <Link className="btn btn-info" href="/students/">
              Gestisci studenti e risposte
            </Link>
          </Buttons>
        </CardBody>
      </Card>
      {contest.hasOnline && (
        <Card>
          <CardBody title="Richieste di accesso">
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

  const onClick = async () => {
    const statements = await getPdfStatements();

    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const pdf = await PDFDocument.create();
    for (const statement of statements) {
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

    const blob = new Blob([await pdf.save()], { type: "application/pdf" });
    saveAs(blob, `${participation.id}.pdf`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      Scarica testi in formato PDF
    </Button>
  );
}