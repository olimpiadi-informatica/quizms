import React, { Suspense, useEffect, useRef, useState } from "react";

import classNames from "classnames";
import { add, addMinutes, differenceInMilliseconds, differenceInSeconds } from "date-fns";

import { schoolConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { randomToken } from "~/utils/random";

import Modal from "../components/modal";
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
    school.startingTime &&
    !contestFinished(school, contest) &&
    differenceInSeconds(new Date(), school.startingTime!) > 0
  );
}

function insideContestWindow(contest: Contest) {
  return new Date() >= contest.startingWindowStart! && new Date() <= contest.startingWindowEnd!;
}

function canStartContest(school: School, contest: Contest) {
  if (school.startingTime) {
    return contest.allowRestart && contestFinished(school, contest);
  }
  return insideContestWindow(contest);
}

function canUndoContest(school: School) {
  return school.startingTime && new Date() < addMinutes(school.startingTime, -1);
}

function StartContest(props: {
  school: School;
  contest: Contest;
  setSchool: (school: School) => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [token, setToken] = useState(randomToken());
  const [schools] = useCollection("schools", schoolConverter, {
    constraints: { token: token },
  });
  useEffect(() => {
    console.log(schools);
    if (schools.length) {
      let x = randomToken();
      while (x == token) {
        x = randomToken();
      }
      setToken(x);
    }
  }, [token, schools]);

  return (
    <>
      <button
        className="btn btn-success h-full w-full text-xl"
        onClick={() => modalRef.current?.showModal()}>
        Inizia prova online
      </button>
      <Modal ref={modalRef} title="Conferma">
        <div className="text-md flex flex-row justify-center gap-5">
          Sei sicuro di voler iniziare il contest?
          <button
            className="btn-confirm btn"
            onClick={() => {
              props.setSchool({
                ...props.school,
                startingTime: addMinutes(new Date(), 3),
                token: token,
              });
            }}>
            SÌ
          </button>
          <button className="btn btn-error">NO</button>
        </div>
      </Modal>
    </>
  );
}

function StopContest(props: {
  school: School;
  contest: Contest;
  setSchool: (school: School) => void;
}) {
  const modalRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="btn btn-error h-full w-full text-xl"
        onClick={() => modalRef.current?.showModal()}>
        Annulla inizio gara
      </button>
      <Modal ref={modalRef} title="Conferma">
        <div className="text-md flex flex-row justify-center gap-5">
          Sei sicuro di voler annullare l'inizio della gara?
          <button
            className="btn-confirm btn"
            onClick={() =>
              props.setSchool({ ...props.school, token: undefined, startingTime: undefined })
            }>
            SÌ
          </button>
          <button className="btn btn-error">NO</button>
        </div>
      </Modal>
    </>
  );
}

function ContestData(props: {
  school: School;
  contest: Contest;
  setSchool: (school: School) => void;
}) {
  const { school, contest } = props;
  const modalRef = useRef<HTMLDialogElement>(null);
  const undoTimeLimit = addMinutes(school.startingTime!, -1);

  if (contestFinished(school, contest)) {
    return (
      <>
        <p>Gara iniziata alle ore {school.startingTime?.toLocaleTimeString()}</p>
        <p>La gara è terminata</p>
      </>
    );
  }
  if (contestRunning(school, contest)) {
    return (
      <div className="grid grid-flow-row grid-cols-2 justify-center gap-4">
        <div className="card mx-auto flex flex-col items-center justify-center gap-2 text-center text-2xl">
          <div className="card-body">
            <h2 className="card-title">Codice</h2>
            {props.school.token}
          </div>
        </div>
        <div className="row-span-2 mx-auto flex flex-col items-center justify-center gap-2 text-center">
          La gara terminerà alle{" "}
          {addMinutes(school.startingTime!, contest.duration!).toLocaleTimeString()}. Tempo
          rimanente: <Timer endTime={addMinutes(school.startingTime!, contest.duration!)} />
        </div>
        <div className="mx-auto flex flex-col items-center justify-center gap-2 text-2xl">
          Gara iniziata alle ore {school.startingTime?.toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-flow-row grid-cols-2 justify-center gap-4">
      <div className="mx-auto flex flex-col items-center justify-center gap-2 text-2xl">
        La gara inizierà alle {school.startingTime?.toLocaleTimeString()}
      </div>
      <div className="mx-auto flex flex-col items-center justify-center gap-2 text-center">
        Inizio gara in <Timer endTime={school.startingTime} />
      </div>
      <div
        className={
          "col-span- flex flex-col" +
          (canUndoContest(school) ? "1" : "2") +
          " card mx-auto items-center justify-center gap-2 text-center text-2xl"
        }>
        <div className="card-body">
          <h2 className="card-title">Codice</h2>
          {props.school.token}
        </div>
      </div>
      {canUndoContest(school) && (
        <div className="mx-auto flex flex-col items-center justify-center gap-2 text-center">
          <p>
            Se ti sei sbagliato, puoi ancora annullare l'inizio della gara cliccando il bottone
            entro i prossimi
          </p>
          <Timer endTime={undoTimeLimit} />
        </div>
      )}
    </div>
  );
}

function ContestAdmin(props: {
  school: School;
  setSchool: (school: School) => void;
  contest: Contest;
}) {
  const { school, setSchool, contest } = props;

  const [time, setTime] = useState(Date.now());
  // refresh the page when the page should change
  useEffect(() => {
    if (school.startingTime) {
      const refresh_dates: Date[] = [
        school.startingTime,
        addMinutes(school.startingTime, contest.duration!),
        addMinutes(school.startingTime, -1),
      ];
      const timeouts: NodeJS.Timeout[] = [];
      for (const d of refresh_dates) {
        if (d > new Date()) {
          const interval = setTimeout(
            () => {
              setTime(Date.now());
            },
            differenceInMilliseconds(d, Date.now()) + 1000,
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
    throw new Error("data inizio e fine del contest non specificate");
  }
  if (!contest.duration) {
    throw new Error("durata del contest non specificata");
  }
  return (
    <div className="grid grid-flow-row grid-cols-7 gap-4">
      <div className="card col-span-2 bg-base-100 shadow-xl shadow-indigo-500/10">
        <div className="card-body">
          <h2 className="card-title">Informazioni Scuola</h2>
          {/* school info */}
          <p>{school.name}</p>
          {/* <Token school={school} setSchool={setSchool} /> */}
        </div>
      </div>

      <div className="card col-span-5 bg-base-100 shadow-xl shadow-indigo-500/10">
        <div className="card-body pb-0">
          <h2 className="card-title">Informazioni Gara</h2>
          {/* contest info */}
          <div className="flex flex-row justify-between p-0">
            <div className="flex flex-col justify-center">
              <button className="btn btn-lg btn-warning text-xl">
                Scarica testo per prova cartacea
              </button>
            </div>
            <div className="card flex flex-col">
              <div className="card-body">
                <h2 className="card-title">Inizio finestra di gara</h2>
                {contest.startingWindowStart?.toLocaleTimeString("it-IT")}
              </div>
            </div>
            <div className="card flex flex-col">
              <div className="card-body">
                <h2 className="card-title">Fine finestra di gara</h2>
                {contest.startingWindowEnd?.toLocaleTimeString("it-IT")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={((canStartContest(school, contest) || canUndoContest(school)) ? "row-span-2" : "") + " col-span-5 card bg-base-100 shadow-xl shadow-indigo-500/10"}>
        <div className="card-body">
          <h2 className="card-title">Gestione Gara</h2>
          {/* contest data */}
          {!school.startingTime ? (
            <p>La gara non è ancora iniziata!</p>
          ) : (
            <ContestData school={school} contest={contest} setSchool={setSchool} />
          )}
        </div>
      </div>

      {/* show the button only if needed */}
      {(canStartContest(school, contest) || canUndoContest(school)) && (
      <div className="col-span-2 bg-base-100 shadow-xl shadow-indigo-500/20">
        {/* contest buttons */}
        {canStartContest(school, contest) && (
          <StartContest school={school} contest={contest} setSchool={setSchool} key={school.id} />
        )}
        {canUndoContest(school) && (
          <StopContest school={school} contest={contest} setSchool={setSchool} />
        )}
      </div>
      )}
      <div className="col-span-2 bg-base-100 shadow-xl shadow-indigo-500/20">
        <button
          className="btn btn-info h-full w-full text-xl"
          onClick={() => (window.location.href = "students.html")}>
          Gestisci studenti e risposte
        </button>
      </div>
    </div>
  );
}

export function ContestsAdminPage() {
  const { contests, schools, setSchool } = useTeacher();
  const [selectedContest, setSelectedContest] = useState(-1);
  return (
    <>
      {schools.length >= 2 && (
        <div className="flex w-full justify-center">
          <div
            role="tablist"
            className="tabs-boxed tabs tabs-lg flex w-full flex-wrap justify-center">
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
      )}
      {selectedContest != -1 && (
        <Suspense>
          <div className="container-fluid h-full overflow-y-scroll">
            <div className="container m-5 mx-auto text-lg">
              <ContestAdmin
                school={schools[selectedContest]}
                setSchool={setSchool}
                contest={
                  contests.find((contest) => contest.id === schools[selectedContest].contestId)!
                }
              />
            </div>
          </div>
        </Suspense>
      )}
    </>
  );
}
