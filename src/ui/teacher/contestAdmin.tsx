import React, {
  Ref,
  Suspense,
  forwardRef,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import classNames from "classnames";
import {
  addMinutes,
  addSeconds,
  differenceInMilliseconds,
  differenceInMinutes,
  differenceInSeconds,
} from "date-fns";
import { differenceInSecondsWithOptions } from "date-fns/fp";

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
  return (
    <>
      <button className="btn-confirm btn" onClick={() => modalRef.current?.showModal()}>
        inizia
      </button>
      <Modal ref={modalRef} title="conferma">
        <div className="text-md flex flex-row justify-center gap-5">
          Sei sicuro di voler iniziare il contest?
          <button
            className="btn-confirm btn"
            onClick={() => {
              props.setSchool({
                ...props.school,
                startingTime: addMinutes(new Date(), 3),
                token: randomToken(),
              });
            }}>
            conferma
          </button>
          <button className="btn btn-error">annulla</button>
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

  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const d: Date = undoTimeLimit < new Date() ? school.startingTime! : undoTimeLimit;
    const interval = setTimeout(
      () => {
        setTime(Date.now());
      },
      differenceInMilliseconds(d, Date.now()) + 1000,
    );
    return () => {
      clearInterval(interval);
    };
  }, [time]);

  if (contestFinished(school, contest)) {
    return (
      <>
        <p> Gara iniziata alle ore {school.startingTime?.toLocaleTimeString()}</p>
        <p>La gara è terminata</p>
      </>
    );
  }
  if (contestRunning(school, contest)) {
    return (
      <>
        <p> Gara iniziata alle ore {school.startingTime?.toLocaleTimeString()}</p>
        <p>
          La gara terminerà alle{" "}
          {addMinutes(school.startingTime!, contest.duration!).toLocaleTimeString()}. Tempo
          rimanente:{" "}
        </p>

        <Timer endTime={addMinutes(school.startingTime!, contest.duration!)} />
      </>
    );
  }

  return (
    <>
      <p>La gara inizierà alle {school.startingTime?.toLocaleTimeString()}, tra </p>
      <Timer endTime={school.startingTime} />
      <p>Token scuola: {props.school.token}</p>
      {canUndoContest(school) && (
        <>
          <p> Se ti sei sbagliato, puoi cancellare la gara cliccando il bottone nei prossimi </p>
          <Timer endTime={undoTimeLimit} />
          <p> minuti</p>
          <button className="btn btn-error" onClick={() => modalRef.current?.showModal()}>
            Cancella gara
          </button>
          <Modal ref={modalRef} title="conferma">
            <div className="text-md flex flex-row justify-center gap-5">
              Sei sicuro di voler cancellare la gara?
              <button
                className="btn-confirm btn"
                onClick={() =>
                  props.setSchool({ ...props.school, token: undefined, startingTime: undefined })
                }>
                conferma
              </button>
              <button className="btn btn-error">annulla</button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
}

function ContestAdmin(props: {
  school: School;
  setSchool: (school: School) => void;
  contest: Contest;
}) {
  const { school, setSchool, contest } = props;

  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    if (school.startingTime) {
      const d: Date =
        school.startingTime < new Date()
          ? addMinutes(school.startingTime, contest.duration!)
          : school.startingTime;
      if (d > new Date()) {
        const interval = setTimeout(
          () => {
            setTime(Date.now());
          },
          differenceInMilliseconds(d, Date.now()) + 1000,
        );
        return () => {
          clearInterval(interval);
        };
      }
    }
  }, [school.startingTime, time]);

  if (!contest.startingWindowEnd || !contest.startingWindowStart) {
    throw new Error("data inizio e fine del contest non specificate");
  }
  if (!contest.duration) {
    throw new Error("durata del contest non specificata");
  }
  return (
    <div>
      <p>Contest: {contest.name}</p>
      <p>Scuola: {school.name}</p>
      {/* <Token school={school} setSchool={setSchool} /> */}
      <p>starting window start: {contest.startingWindowStart?.toLocaleTimeString("it-IT")}</p>
      <p>starting window end: {contest.startingWindowEnd?.toLocaleTimeString("it-IT")}</p>
      {!school.startingTime ? (
        <p> Gara non ancora iniziata</p>
      ) : (
        <ContestData school={school} contest={contest} setSchool={setSchool} />
      )}
      {canStartContest(school, contest) && (
        <StartContest school={school} contest={contest} setSchool={setSchool} />
      )}
    </div>
  );
}

export function ContestsAdminPage() {
  const { contests, variants, schools, setSchool } = useTeacher();
  const [selectedContest, setSelectedContest] = useState(0);
  return (
    <>
      {schools.length >= 2 && (
        <div className="flex justify-center">
          <div role="tablist" className="tabs-boxed tabs flex flex-wrap justify-center">
            {schools.map((school, i) => (
              <a
                role="tab"
                key={school.id}
                className={classNames("tab", i == selectedContest && "tab-active")}
                onClick={() => setSelectedContest(i)}>
                {contests.find((contest) => contest.id === schools[selectedContest].contestId)!.name}
              </a>
            ))}
          </div>
        </div>
      )}
      <Suspense>
        <div className="border-2">
          <ContestAdmin school={schools[selectedContest]} setSchool={setSchool} contest={contests.find((contest) => contest.id === schools[selectedContest].contestId)!} />
        </div>
      </Suspense>
    </>
  );
}
