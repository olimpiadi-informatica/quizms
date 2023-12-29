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
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { groupBy, range } from "lodash-es";

import { useDb } from "~/firebase/baseLogin";
import { studentRestoreConverter } from "~/firebase/converters";
import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest, School, StudentRestore } from "~/models";
import { hash, randomToken } from "~/utils/random";

import { Button, LoadingButtons } from "../components/button";
import Loading from "../components/loading";
import Modal from "../components/modal";
import { useIsAfter, useTime } from "../components/time";
import Timer from "../components/timer";
import { useTeacher } from "./provider";

function canStartContest(now: Date, school: School, contest: Contest) {
  if (now < contest.startingWindowStart! || now > contest.startingWindowEnd!) return false;
  if (!school.startingTime) return true;
  if (!contest.allowRestart) return false;
  return differenceInMinutes(now, school.startingTime) >= contest.duration!;
}

function canUndoContest(now: Date, school: School) {
  return school.startingTime && now < subMinutes(school.startingTime, 1);
}

function formatTime(time: Date) {
  return new Intl.DateTimeFormat("it-IT", { timeStyle: "short" }).format(time);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(date);
}

function StartContestButton({ school }: { school: School }) {
  const { setSchool } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<Error>();
  const getNow = useTime();

  const start = async () => {
    try {
      const token = await randomToken();
      const startingTime = roundToNearestMinutes(addSeconds(getNow(), 3.5 * 60));
      await setSchool({ ...school, token, startingTime });
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
            <Button className="btn-warning" onClick={start}>
              Conferma
            </Button>
            <Button>Annulla</Button>
          </LoadingButtons>
        </div>
      </Modal>
    </>
  );
}

function StopContestButton({ school }: { school: School }) {
  const { setSchool } = useTeacher();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<Error>();

  const undoContestStart = async () => {
    try {
      await setSchool({ ...school, token: undefined, startingTime: undefined });
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
            <Button className="btn-warning" onClick={undoContestStart}>
              Conferma
            </Button>
            <Button>Annulla</Button>
          </LoadingButtons>
        </div>
      </Modal>
    </>
  );
}

function ContestData({ contest, school }: { school: School; contest: Contest }) {
  const endTime = addMinutes(school.startingTime!, contest.duration!);

  const getNow = useTime();
  const now = getNow();

  if (now > endTime) {
    return (
      <div className="flex flex-col gap-3">
        <p>Gara iniziata alle ore {formatTime(school.startingTime!)}.</p>
        <p>La gara è terminata.</p>
      </div>
    );
  }
  if (now < school.startingTime!) {
    return (
      <div className="flex flex-col gap-3">
        <p className="my-2 text-lg">
          <b>Codice:</b> <span className="font-mono">{school.token}</span>
        </p>
        <p>La gara inizierà alle ore {formatTime(school.startingTime!)}.</p>
        <p>
          Tempo rimanente all&apos;inizio: <Timer endTime={school.startingTime!} />
        </p>
        {canUndoContest(now, school) && (
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
        <b>Codice:</b> <span className="text-mono">{school.token}</span>
      </p>
      <p>La gara terminerà alle {formatTime(endTime)}.</p>
      <p>
        Tempo rimanente: <Timer endTime={endTime} />
      </p>
      <div className="mx-auto flex flex-col items-center justify-center gap-2 text-2xl">
        Gara iniziata alle ore {formatTime(school.startingTime!)}.
      </div>
    </div>
  );
}

function StudentRestoreButton({ studentRestore }: { studentRestore: StudentRestore[] }) {
  const db = useDb();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");

  const targetCodes = studentRestore.map((request) =>
    String(hash(request.id) % 1000).padStart(3, "0"),
  );

  const approve = async () => {
    for (const request of studentRestore) {
      if (code === String(hash(request.id) % 1000).padStart(3, "0")) {
        const q = query(
          collection(db, "studentMappingUid"),
          where("studentId", "==", request.studentId),
          limit(400),
        );
        const prevMappings = await getDocs(q);

        const batch = writeBatch(db);
        batch.update(doc(db, "students", request.studentId).withConverter(studentConverter), {
          uid: request.id,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, "studentMappingUid", request.id), {
          studentId: request.studentId,
        });
        prevMappings.forEach((mapping) => {
          batch.delete(doc(db, "studentMappingUid", mapping.id));
        });

        await batch.commit();
      }
    }

    reject();
  };

  const reject = () => {
    studentRestore.map((request) => {
      void deleteDoc(doc(db, "studentRestore", request.id));
    });
    modalRef.current?.close();
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
            <Button className="btn-error" onClick={approve} disabled={!targetCodes.includes(code)}>
              Approva
            </Button>
            <Button onClick={reject}>Rigetta</Button>
          </LoadingButtons>
        </div>
      </Modal>
    </>
  );
}

function StudentRestoreList(props: { school: School }) {
  const { school } = props;
  const [studentRestore] = useCollection("studentRestore", studentRestoreConverter, {
    constraints: { schoolId: school.id, token: school.token ?? "" },
    subscribe: true,
  });

  if (!studentRestore || studentRestore.length === 0) {
    return <>Nessuna richiesta.</>;
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {Object.entries(groupBy(studentRestore, (request) => request.studentId)).map(
        ([id, requests]) => (
          <StudentRestoreButton studentRestore={requests} key={id} />
        ),
      )}
    </div>
  );
}

function ContestAdmin({ school, contest }: { school: School; contest: Contest }) {
  const getNow = useTime();
  const now = getNow();

  useIsAfter(school.startingTime);
  useIsAfter(school.startingTime && addMinutes(school.startingTime, contest.duration!));
  useIsAfter(school.startingTime && addMinutes(school.startingTime, -1));

  if (!contest.startingWindowEnd || !contest.startingWindowStart) {
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
          La gara si potrà svolgere dalle {formatTime(contest.startingWindowStart)} alle{" "}
          {formatTime(contest.startingWindowEnd)} del {formatDate(contest.startingWindowStart)}.
          <div className="mt-2 flex justify-center">
            <DownloadPdfButton school={school} contest={contest} />
          </div>
        </div>
      </div>
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Gestione Gara</h2>
          {/* contest data */}
          {!school.startingTime ? (
            <p>La gara non è ancora iniziata!</p>
          ) : (
            <ContestData school={school} contest={contest} />
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {/* contest buttons */}
            {canStartContest(now, school, contest) && (
              <StartContestButton school={school} key={school.id} />
            )}
            {canUndoContest(now, school) && <StopContestButton school={school} />}
            <a className="btn btn-info" href={`./students/#${school.contestId}`} /* TODO */>
              Gestisci studenti e risposte
            </a>
          </div>
        </div>
      </div>
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Richieste di accesso</h2>
          <Suspense fallback={<Loading />}>
            <StudentRestoreList school={school} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function DownloadPdfButton({ school, contest }: { school: School; contest: Contest }) {
  const { getPdfStatements } = useTeacher();

  const onClick = async () => {
    const statements = await getPdfStatements(school.pdfVariants ?? []);

    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const pdf = await PDFDocument.create();
    for (const statement of statements) {
      const otherPdf = await PDFDocument.load(statement.statement);
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
    saveAs(blob, `${contest.id}-${school.schoolId}.pdf`);
  };

  return (
    <Button className="btn-warning" onClick={onClick}>
      Scarica testo per prova cartacea
    </Button>
  );
}

export function TeacherAdmin() {
  const { contests, schools } = useTeacher();
  const [selectedContest, setSelectedContest] = useState(schools.length === 1 ? 0 : -1);

  return (
    <>
      <div className="m-5 flex justify-center">
        <div className="flex justify-center">
          <div role="tablist" className="tabs-boxed tabs flex w-full flex-wrap justify-center">
            {schools.map((school, i) => (
              <a
                role="tab"
                key={school.id}
                className={classNames("tab", i === selectedContest && "tab-active")}
                onClick={() => setSelectedContest(i)}>
                {contests.find((contest) => contest.id === schools[i].contestId)!.name}
              </a>
            ))}
          </div>
        </div>
      </div>
      {selectedContest !== -1 && (
        <ContestAdmin
          school={schools[selectedContest]}
          contest={contests.find((contest) => contest.id === schools[selectedContest].contestId)!}
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
