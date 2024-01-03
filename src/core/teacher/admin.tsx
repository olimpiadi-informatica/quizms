import React, { Suspense, useRef, useState } from "react";

import classNames from "classnames";
import {
  addMinutes,
  addSeconds,
  differenceInMinutes,
  roundToNearestMinutes,
  subMinutes,
} from "date-fns";
import { saveAs } from "file-saver";
import { groupBy, range } from "lodash-es";

import { Contest, Participation, StudentRestore } from "~/models";
import { hash, randomToken } from "~/utils/random";

import { Button, LoadingButtons } from "../components/button";
import Loading from "../components/loading";
import Modal from "../components/modal";
import { useIsAfter, useTime } from "../components/time";
import Timer from "../components/timer";
import { useTeacher, useTeacherStudentRestores } from "./provider";

function canStartContest(now: Date, participation: Participation, contest: Contest) {
  if (now < contest.contestWindowStart! || now > contest.contestWindowEnd!) return false;
  if (!participation.startingTime) return true;
  if (!contest.allowRestart) return false;
  return differenceInMinutes(now, participation.startingTime) >= contest.duration!;
}

function canUndoContest(now: Date, participation: Participation) {
  return participation.startingTime && now < subMinutes(participation.startingTime, 1);
}

function formatTime(time: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeStyle: "short" }).format(time);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(date);
}

function StartContestButton({ participation }: { participation: Participation }) {
  const { setParticipation } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<Error>();
  const getNow = useTime();

  const start = async () => {
    try {
      const token = await randomToken();
      const startingTime = roundToNearestMinutes(addSeconds(getNow(), 3.5 * 60));
      await setParticipation({ ...participation, token, startingTime });
    } catch (e) {
      setError(e as Error);
    }
  };

  return (
    <>
      <button className="btn btn-success" onClick={() => modalRef.current?.showModal()}>
        Inizia prova online
      </button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler iniziare la gara?</p>
        <span className="pt-1 text-error">
          {error?.message ? `Errore: ${error?.message}` : <>&nbsp;</>}
        </span>
        <div className="mt-3 flex flex-row justify-center gap-3">
          <LoadingButtons>
            <Button className="btn-info">Annulla</Button>
            <Button className="btn-warning" onClick={start}>
              Conferma
            </Button>
          </LoadingButtons>
        </div>
      </Modal>
    </>
  );
}

function StopContestButton({ participation }: { participation: Participation }) {
  const { setParticipation } = useTeacher();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<Error>();

  const undoContestStart = async () => {
    try {
      await setParticipation({ ...participation, token: undefined, startingTime: undefined });
    } catch (e) {
      setError(e as Error);
    }
  };

  return (
    <>
      <button className="btn btn-error" onClick={() => modalRef.current?.showModal()}>
        Annulla inizio gara
      </button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler annullare l&apos;inizio della gara?</p>
        <span className="pt-1 text-error">
          {error?.message ? `Errore: ${error?.message}` : <>&nbsp;</>}
        </span>
        <div className="mt-3 flex flex-row justify-center gap-3">
          <LoadingButtons>
            <Button className="btn-info">Annulla</Button>
            <Button className="btn-warning" onClick={undoContestStart}>
              Conferma
            </Button>
          </LoadingButtons>
        </div>
      </Modal>
    </>
  );
}

function ContestData({
  contest,
  participation,
}: {
  participation: Participation;
  contest: Contest;
}) {
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
        <b>Codice:</b> <span className="text-mono">{participation.token}</span>
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

function StudentRestoreButton({
  studentRestore,
  approve,
  reject,
}: {
  studentRestore: StudentRestore[];
  approve: (studentRestore: StudentRestore) => Promise<void>;
  reject: (studentId: string) => Promise<void>;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");

  const targetCodes = studentRestore.map((request) =>
    `${hash(request.id) % 1000}`.padStart(3, "0"),
  );

  const approveRequest = async () => {
    const request = studentRestore.find(
      (request) => `${hash(request.id) % 1000}`.padStart(3, "0") === code,
    );
    if (request) {
      await approve(request);
    }
  };

  const rejectRequest = async () => {
    await reject(studentRestore[0].studentId);
  };

  return (
    <>
      <button className="btn btn-success" onClick={() => modalRef.current?.showModal()}>
        Richiesta di accesso {studentRestore[0].name} {studentRestore[0].surname}
      </button>
      <Modal ref={modalRef} title="Conferma">
        <p>
          {studentRestore[0].name} {studentRestore[0].surname} sta cercando di accedere alla gara.
          Per approvarlo, inserisci il codice di conferma che gli è stato mostrato.
        </p>
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Codice di conferma</span>
          </div>
          <input
            type="number"
            placeholder="Inserisci codice"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input input-bordered w-full"
          />
        </label>
        <div className="mt-3 flex flex-row justify-center gap-3">
          <LoadingButtons>
            <Button className="btn-info" onClick={rejectRequest}>
              Rigetta
            </Button>
            <Button
              className="btn-error"
              onClick={approveRequest}
              disabled={!targetCodes.includes(code)}>
              Approva
            </Button>
          </LoadingButtons>
        </div>
      </Modal>
    </>
  );
}

function StudentRestoreList({ participation }: { participation: Participation }) {
  const [studentRestores, approve, reject] = useTeacherStudentRestores(participation);

  if (!studentRestores || studentRestores.length === 0) {
    return <>Nessuna richiesta.</>;
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {Object.entries(groupBy(studentRestores, "studentId")).map(([id, requests]) => (
        <StudentRestoreButton
          studentRestore={requests}
          key={id}
          approve={approve}
          reject={reject}
        />
      ))}
    </div>
  );
}

function ContestAdmin({
  participation,
  contest,
}: {
  participation: Participation;
  contest: Contest;
}) {
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
    <div className="flex flex-col gap-5 p-5 pb-32">
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Informazioni Gara</h2>
          {/* contest info */}
          La gara si potrà svolgere dalle {formatTime(contest.contestWindowStart)} alle{" "}
          {formatTime(contest.contestWindowEnd)} del {formatDate(contest.contestWindowStart)}.
          <div className="mt-2 flex justify-center">
            <DownloadPdfButton participation={participation} contest={contest} />
          </div>
        </div>
      </div>
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Gestione Gara</h2>
          {/* contest data */}
          {!participation.startingTime ? (
            <p>La gara non è ancora iniziata!</p>
          ) : (
            <ContestData participation={participation} contest={contest} />
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {/* contest buttons */}
            {canStartContest(now, participation, contest) && (
              <StartContestButton participation={participation} key={participation.id} />
            )}
            {canUndoContest(now, participation) && (
              <StopContestButton participation={participation} />
            )}
            <a /* TODO */
              className="btn btn-info"
              href={`./students/#${participation.contestId}`}
              target="_blank"
              rel="noreferrer">
              Gestisci studenti e risposte
            </a>
          </div>
        </div>
      </div>
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Richieste di accesso</h2>
          <Suspense fallback={<Loading />}>
            <StudentRestoreList participation={participation} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function DownloadPdfButton({
  participation,
  contest,
}: {
  participation: Participation;
  contest: Contest;
}) {
  const { getPdfStatements } = useTeacher();

  const onClick = async () => {
    const statements = await getPdfStatements(participation.pdfVariants ?? []);

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

    const blob = new Blob([await pdf.save()]);
    saveAs(blob, `${contest.id}-${participation.schoolId}.pdf`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      Scarica testo per prova cartacea
    </Button>
  );
}

export function TeacherAdmin() {
  const { contests, participations } = useTeacher();
  const [selectedContest, setSelectedContest] = useState(participations.length === 1 ? 0 : -1);

  return (
    <>
      <div className="m-5 flex justify-center">
        <div className="flex justify-center">
          <div role="tablist" className="tabs-boxed tabs flex w-full flex-wrap justify-center">
            {participations.map((participation, i) => (
              <a
                role="tab"
                key={participation.id}
                className={classNames("tab", i === selectedContest && "tab-active")}
                onClick={() => setSelectedContest(i)}>
                {contests.find((contest) => contest.id === participations[i].contestId)!.name}
              </a>
            ))}
          </div>
        </div>
      </div>
      {selectedContest !== -1 && (
        <ContestAdmin
          participation={participations[selectedContest]}
          contest={
            contests.find((contest) => contest.id === participations[selectedContest].contestId)!
          }
        />
      )}
      {selectedContest === -1 && (
        <div className="flex h-full flex-col items-center justify-center">
          Nessuna gara selezionata.
        </div>
      )}
    </>
  );
}
