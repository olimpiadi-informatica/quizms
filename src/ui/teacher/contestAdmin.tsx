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

import { addMinutes, differenceInMinutes } from "date-fns";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { randomToken } from "~/utils/random";

import Modal from "../components/modal";
import { useTeacher } from "./provider";

function contestFinished(school: School, contest: Contest) {
  return differenceInMinutes(new Date(), school.startingTime!) > contest.duration!;
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
            onClick={() => props.setSchool({ ...props.school, startingTime: new Date() })}>
            conferma
          </button>
          <button className="btn btn-error">annulla</button>
        </div>
      </Modal>
    </>
  );
}

function RestartContest(props: {
  school: School;
  contest: Contest;
  setSchool: (school: School) => void;
}) {
  useEffect(() => {
    let newToken: string = randomToken();
    props.setSchool({ ...props.school, token: newToken });
  }, [props.school.token]);
  const modalRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="btn-confirm btn" onClick={() => modalRef.current?.showModal()}>
        Rincomincia
      </button>
      <Modal ref={modalRef} title="conferma">
        <div className="text-md flex flex-row justify-center gap-5">
          Sei sicuro di voler iniziare il contest?
          <button
            className="btn-confirm btn"
            onClick={() => props.setSchool({ ...props.school, startingTime: new Date() })}>
            conferma
          </button>
          <button className="btn btn-error">annulla</button>
        </div>
      </Modal>
    </>
  );
}

export function ContestsAdminPage() {
  const { contests, variants, school, setSchool } = useTeacher();
  useEffect(() => {
    if (!school.token) {
      let newToken: string = randomToken();
      setSchool({ ...school, token: newToken });
    }
  }, [school.token]);

  let contest: Contest = contests[0];
  if (!contest.startingWindowEnd || !contest.startingWindowStart) {
    throw new Error("data inizio e fine del contest non specificate");
  }
  if (!contest.duration) {
    throw new Error("durata del contest non specificata");
  }
  return (
    <div>
      <p>Scuola: {school.name}</p>
      <p>Token scuola: {school.token}</p>
      <p>starting window start: {contest.startingWindowStart?.toDateString()}</p>
      <p>starting window end: {contest.startingWindowEnd?.toDateString()}</p>
      <p>iniziata a {school.startingTime?.toDateString()}</p>
      {!school.startingTime ? (
        <div>
          <p> Gara non ancora iniziata</p>
          <StartContest school={school} contest={contest} setSchool={setSchool} />
        </div>
      ) : (
        <>
          <p> Gara iniziata alle ore {school.startingTime?.toLocaleTimeString()}</p>
          {contestFinished(school, contest) ? (
            <>
              <p>La gara è terminata</p>
              {contest.allowRestart && (
                <RestartContest school={school} contest={contest} setSchool={setSchool} />
              )}
            </>
          ) : (
            <p>
              La gara terminerà alle{" "}
              {addMinutes(school.startingTime, contest.duration).toLocaleTimeString()}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
