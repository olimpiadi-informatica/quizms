import { useRef } from "react";

import {
  addMinutes,
  addSeconds,
  differenceInMinutes,
  isSameDay,
  roundToNearestMinutes,
  subMinutes,
} from "date-fns";
import { saveAs } from "file-saver";
import { range } from "lodash-es";

import { Button, Buttons, Card, Modal, Timer, useIsAfter, useTime } from "~/components";
import { Contest, Participation } from "~/models";
import { formatDate, formatTime } from "~/utils/date";
import { randomToken } from "~/utils/random";
import { Announcements } from "~/web/teacher/admin-announcements";

import StudentRestoreList from "./admin-student-restore";
import { useTeacher } from "./provider";

function canStartContest(now: Date, participation: Participation, contest: Contest) {
  if (now < contest.contestWindowStart! || now > contest.contestWindowEnd!) return false;
  if (!participation.startingTime) return true;
  if (!contest.allowRestart) return false;
  return differenceInMinutes(now, participation.startingTime) >= contest.duration!;
}

function canUndoContest(now: Date, participation: Participation) {
  return participation.startingTime && now < subMinutes(participation.startingTime, 1);
}

function StartContestButton() {
  const { participation, setParticipation } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);
  const getNow = useTime();

  const start = async () => {
    const token = await randomToken();
    const startingTime = roundToNearestMinutes(addSeconds(getNow(), 3.5 * 60));
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

function ContestData() {
  const { contest, participation } = useTeacher();

  const endTime = addMinutes(participation.startingTime!, contest.duration!);

  const getNow = useTime();
  const now = getNow();

  if (now > endTime) {
    return (
      <div className="flex flex-col gap-3">
        <p>Gara iniziata alle ore {formatTime(participation.startingTime!)}.</p>
        <p>La gara è terminata.</p>
      </div>
    );
  }
  if (now < participation.startingTime!) {
    return (
      <div className="flex flex-col gap-3">
        <p className="my-2 text-lg">
          <b>Codice:</b> <span className="font-mono">{participation.token}</span>
        </p>
        <p>La gara inizierà alle ore {formatTime(participation.startingTime!)}.</p>
        <p>
          Tempo rimanente all&apos;inizio: <Timer endTime={participation.startingTime!} />
        </p>
        {canUndoContest(now, participation) && (
          <p>
            Se ti sei sbagliato, puoi ancora annullare la gara fino a un minuto prima
            dell&apos;inizio.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p>
        <b>Codice:</b> <span className="font-mono">{participation.token}</span>
      </p>
      <p>La gara terminerà alle {formatTime(endTime)}.</p>
      <p>
        Tempo rimanente: <Timer endTime={endTime} />
      </p>
      <div className="mx-auto flex flex-col items-center justify-center gap-2 text-2xl">
        Gara iniziata alle ore {formatTime(participation.startingTime!)}.
      </div>
    </div>
  );
}

export function TeacherAdmin() {
  const { contest, participation } = useTeacher();

  const getNow = useTime();
  const now = getNow();

  useIsAfter(participation.startingTime);
  useIsAfter(
    participation.startingTime && addMinutes(participation.startingTime, contest.duration!),
  );
  useIsAfter(participation.startingTime && addMinutes(participation.startingTime, -1));

  if (!contest.contestWindowEnd || !contest.contestWindowStart) {
    throw new Error("Data inizio e fine del contest non specificate");
  }
  if (!contest.duration) {
    throw new Error("Durata del contest non specificata");
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <Card title="Comunicazioni">
        <Announcements />
      </Card>
      <Card title="Informazioni Gara">
        <div className="prose mb-2 max-w-none whitespace-pre-wrap">{contest.instructions}</div>
        {contest.hasOnline && (
          <div className="font-bold">
            La gara si potrà svolgere dalle {formatTime(contest.contestWindowStart)}{" "}
            {!isSameDay(contest.contestWindowStart, contest.contestWindowEnd) && (
              <>del {formatDate(contest.contestWindowStart)} </>
            )}
            alle {formatTime(contest.contestWindowEnd)} del {formatDate(contest.contestWindowEnd)}.
          </div>
        )}
        {contest.hasPdf && (
          <Buttons className="mt-2">
            <DownloadPdfButton />
          </Buttons>
        )}
      </Card>
      <Card title="Gestione Gara">
        {/* contest data */}
        {contest.hasOnline &&
          (participation.startingTime ? <ContestData /> : <p>La gara non è ancora iniziata!</p>)}
        <Buttons className="mt-2">
          {contest.hasOnline && canStartContest(now, participation, contest) && (
            <StartContestButton />
          )}
          {contest.hasOnline && canUndoContest(now, participation) && <StopContestButton />}
          <a className="btn btn-info" href={`/teacher/students/#${participation.contestId}`}>
            Gestisci studenti e risposte
          </a>
        </Buttons>
      </Card>
      {contest.hasOnline && (
        <Card title="Richieste di accesso">
          <div className="h-96 max-h-screen">
            <StudentRestoreList />
          </div>
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
