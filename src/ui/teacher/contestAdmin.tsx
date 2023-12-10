import React, { Suspense, useEffect, useRef, useState } from "react";

import classNames from "classnames";
import {
  addMinutes,
  addSeconds,
  differenceInMilliseconds,
  differenceInSeconds,
  format,
  roundToNearestMinutes,
} from "date-fns";
import { it as dateLocaleIT } from "date-fns/locale";
import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { groupBy } from "lodash-es";

import {
  schoolConverter,
  schoolMappingConverter,
  studentRestoreConverter,
} from "~/firebase/converters";
import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { useDb } from "~/firebase/login";
import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { StudentRestore } from "~/models/student";
import { hash, randomToken } from "~/utils/random";

import Modal from "../components/modal";
import modal from "../components/modal";
import Timer from "../components/timer";
import { useTeacher } from "./provider";

function contestFinished(school: School, contest: Contest) {
  return (
    school.startingTime &&
    differenceInSeconds(new Date(), school.startingTime) > contest.duration! * 60
  );
}

function contestRunning(school: School, contest: Contest) {
  return (
    school.startingTime && !contestFinished(school, contest) && new Date() >= school.startingTime!
  );
}

function insideContestWindow(contest: Contest) {
  return new Date() >= contest.startingWindowStart! && new Date() <= contest.startingWindowEnd!;
}

function canStartContest(school: School, contest: Contest) {
  if (school.startingTime) {
    return contest.allowRestart && contestFinished(school, contest) && insideContestWindow(contest);
  }
  return insideContestWindow(contest);
}

function canUndoContest(school: School) {
  return school.startingTime && new Date() < addMinutes(school.startingTime, -1);
}

function StartContest({ school }: { school: School }) {
  const db = useDb();
  const { setSchool } = useTeacher();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const start = async () => {
    try {
      setLoading(true);
      const newSchool = await generateToken(db, school);
      await setSchool(newSchool);
    } catch (e) {
      setError(e as Error);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="btn btn-success" onClick={() => modalRef.current?.showModal()}>
        Inizia prova online
      </button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler iniziare il contest?</p>
        <span className="pt-1 text-error">
          {error?.message ? `Errore: ${error?.message}` : <>&nbsp;</>}
        </span>
        <div className="mt-3 flex flex-row justify-center gap-3">
          <button className="btn btn-warning" onClick={start} disabled={loading}>
            <span className={classNames("loading loading-spinner", !loading && "hidden")}></span>
            Conferma
          </button>
          <button className="btn" disabled={loading}>
            Annulla
          </button>
        </div>
      </Modal>
    </>
  );
}

async function generateToken(db: Firestore, prevSchool: School) {
  const token = randomToken();
  const startingTime = roundToNearestMinutes(addSeconds(addMinutes(new Date(), 30), 30));

  const school: School = {
    ...prevSchool,
    token,
    startingTime,
  };

  const schoolMappingsRef = doc(db, "schoolMapping", token).withConverter(schoolMappingConverter);
  const schoolRef = doc(db, "schools", school.id).withConverter(schoolConverter);

  await runTransaction(db, async (trans) => {
    const mapping = await trans.get(schoolMappingsRef);
    if (mapping.exists()) {
      throw new Error("Token già esistente");
    }

    trans.set(schoolRef, school);
    trans.set(schoolMappingsRef, {
      id: token,
      school: school.id,
      startingTime,
    });
  });

  return school;
}

function StopContest({ school }: { school: School }) {
  const { setSchool } = useTeacher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const [loading, setLoading] = useState(false);
  const db = useDb();

  const undoContestStart = async () => {
    setLoading(true);

    // delete all student connected to token
    const q = query(
      collection(db, "students"),
      where("school", "==", school.id),
      where("token", "==", school.token),
    );

    const students = await getDocs(q);
    await students.forEach((student) => {
      console.log(student.id);
      deleteDoc(doc(db, "students", student.id).withConverter(studentConverter));
    });

    await setSchool({ ...school, token: undefined, startingTime: undefined });

    setLoading(false);
  };

  return (
    <>
      <button className="btn btn-error" onClick={() => modalRef.current?.showModal()}>
        Annulla inizio gara
      </button>
      <Modal ref={modalRef} title="Conferma">
        <p>Sei sicuro di voler annullare l&apos;inizio della gara?</p>
        <div className="mt-3 flex flex-row justify-center gap-3">
          <button className="btn btn-warning" onClick={undoContestStart} disabled={loading}>
            <span className={classNames("loading loading-spinner", !loading && "hidden")}></span>
            Conferma
          </button>
          <button className="btn" disabled={loading}>
            Annulla
          </button>
        </div>
      </Modal>
    </>
  );
}

function ContestData({ contest, school }: { school: School; contest: Contest }) {
  const endTime = addMinutes(school.startingTime!, contest.duration!);

  if (contestFinished(school, contest)) {
    return (
      <div className="flex flex-col gap-3">
        <p>
          Gara iniziata alle ore {format(school.startingTime!, "HH:mm", { locale: dateLocaleIT })}.
        </p>
        <p>La gara è terminata.</p>
      </div>
    );
  }
  if (contestRunning(school, contest)) {
    return (
      <div className="flex flex-col gap-3">
        <p>
          <b>Codice:</b> <span className="text-mono">{school.token}</span>
        </p>
        <p>La gara terminerà alle {format(endTime, "HH:mm", { locale: dateLocaleIT })}.</p>
        <p>
          Tempo rimanente: <Timer endTime={endTime} />
        </p>
        <div className="mx-auto flex flex-col items-center justify-center gap-2 text-2xl">
          Gara iniziata alle ore {format(school.startingTime!, "HH:mm")}.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="my-2 text-lg">
        <b>Codice:</b> <span className="font-mono">{school.token}</span>
      </p>
      <p>La gara inizierà alle ore {format(school.startingTime!, "HH:mm")}.</p>
      <p>
        Tempo rimanente all&apos;inizio: <Timer endTime={school.startingTime!} />
      </p>
      {canUndoContest(school) && (
        <p>
          Se ti sei sbagliato, puoi ancora annullare la gara fino a un minuto prima
          dell&apos;inizio.
        </p>
      )}
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
      if (code == String(hash(request.id) % 1000).padStart(3, "0")) {
        await updateDoc(doc(db, "students", request.studentId).withConverter(studentConverter), {
          uid: request.id,
          updatedAt: serverTimestamp(),
        });
      }
    }
    await reject();
  };

  const reject = async () => {
    await Promise.all(
      studentRestore.map((request) => {
        deleteDoc(doc(db, "studentRestore", request.id));
      }),
    );
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
        <p className="text-warning">Codice: {targetCodes}</p>
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
          <button
            className="btn btn-error"
            onClick={approve}
            disabled={!targetCodes.includes(code)}
            type="button">
            Approva
          </button>
          <button className="btn" onClick={reject}>
            Rigetta
          </button>
        </div>
      </Modal>
    </>
  );
}

function StudentRestoreList(props: { school: School }) {
  const { school } = props;
  const [studentRestore] = useCollection("studentRestore", studentRestoreConverter, {
    constraints: { schoolId: school.id },
  });

  if (studentRestore.length === 0) {
    return <>Nessuna richiesta</>;
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {Object.entries(groupBy(studentRestore, (request) => request.studentId)).map(
        (requests, i) => (
          <StudentRestoreButton studentRestore={requests[1]} key={i} />
        ),
      )}
    </div>
  );
}

function ContestAdmin(props: { school: School; contest: Contest }) {
  const { school, contest } = props;
  const [time, setTime] = useState(new Date());

  // refresh the page when the page should change
  useEffect(() => {
    if (school.startingTime) {
      const refreshDates: Date[] = [
        school.startingTime,
        addMinutes(school.startingTime, contest.duration!),
        addMinutes(school.startingTime, -1),
      ];
      const timeouts: NodeJS.Timeout[] = [];
      for (const d of refreshDates) {
        if (d > new Date()) {
          const interval = setTimeout(
            () => {
              setTime(new Date());
            },
            differenceInMilliseconds(d, new Date()) + 1000,
          );
          timeouts.push(interval);
        }
      }
      return () => {
        for (const interval of timeouts) {
          clearInterval(interval);
        }
      };
    }
  }, [school.startingTime, time, contest.duration]);

  if (!contest.startingWindowEnd || !contest.startingWindowStart) {
    throw new Error("Data inizio e fine del contest non specificate");
  }
  if (!contest.duration) {
    throw new Error("Durata del contest non specificata");
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Informazioni Gara</h2>
          {/* contest info */}
          La gara si potrà svolgere dalle{" "}
          {format(contest.startingWindowStart, "HH:mm", { locale: dateLocaleIT })} alle{" "}
          {format(contest.startingWindowEnd, "HH:mm", { locale: dateLocaleIT })} del{" "}
          {format(contest.startingWindowStart, "d LLLL", { locale: dateLocaleIT })}.
          <div className="mt-2 flex justify-center">
            <button className="btn btn-warning">Scarica testo per prova cartacea</button>
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
            {canStartContest(school, contest) && <StartContest school={school} key={school.id} />}
            {canUndoContest(school) && <StopContest school={school} />}
            <button
              className="btn btn-info"
              onClick={() => (window.location.href = "students.html") /* TODO */}>
              Gestisci studenti e risposte
            </button>
          </div>
        </div>
      </div>
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Richieste di accesso</h2>
          <Suspense fallback={<p className="loading loading-spinner" />}>
            <StudentRestoreList school={school} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export function ContestsAdminPage() {
  const { contests, schools } = useTeacher();
  const [selectedContest, setSelectedContest] = useState(0);
  return (
    <>
      {schools.length >= 2 && (
        <div className="m-5 flex justify-center">
          <div className="flex justify-center">
            <div role="tablist" className="tabs-boxed tabs flex w-full flex-wrap justify-center">
              {schools.map((school, i) => (
                <a
                  role="tab"
                  key={school.id}
                  className={classNames("tab", i == selectedContest && "tab-active")}
                  onClick={() => setSelectedContest(i)}>
                  {contests.find((contest) => contest.id === schools[i].contestId)!.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      {selectedContest != -1 && (
        <ContestAdmin
          school={schools[selectedContest]}
          contest={contests.find((contest) => contest.id === schools[selectedContest].contestId)!}
        />
      )}
    </>
  );
}
