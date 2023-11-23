import React, { ChangeEvent, useState } from "react";

import classNames from "classnames";
import { formatISO } from "date-fns";
import { FirebaseOptions } from "firebase/app";
import { collection, doc } from "firebase/firestore";
import { range } from "lodash-es";
import { useErrorBoundary } from "react-error-boundary";
import { useCollectionDataOnce, useDocumentDataOnce } from "react-firebase-hooks/firestore";

import { FirebaseLogin, useDb } from "~/firebase/login";
import { Contest, contestConverter } from "~/firebase/types/contest";
import { Student } from "~/firebase/types/student";
import { Variant, variantConverter } from "~/firebase/types/variant";
import Progress from "~/ui/components/progress";

import TeacherLogin from "./login";

type Props = {
  config: FirebaseOptions;
};

export function TeacherTable({ config }: Props) {
  return (
    <FirebaseLogin config={config}>
      <TeacherLogin>
        <TableSelector />
      </TeacherLogin>
    </FirebaseLogin>
  );
}

function TableSelector() {
  const db = useDb();
  const { showBoundary } = useErrorBoundary();

  const contestsRef = collection(db, "contests").withConverter(contestConverter);
  const [contests, loading, error] = useCollectionDataOnce(contestsRef);

  const [selectedContest, setSelectedContest] = useState<number>(0);

  if (error) showBoundary(error);

  if (loading) {
    return (
      <div className="m-auto mt-[171px] w-64">
        <Progress>Caricamento in corso...</Progress>
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" className="not-prose tabs-boxed tabs mb-5 justify-center">
        {contests!.map((contest, i) => (
          <a
            role="tab"
            key={i}
            className={classNames("tab", i == selectedContest && "tab-active")}
            onClick={() => setSelectedContest(i)}>
            {contest.name}
          </a>
        ))}
      </div>
      <Table contest={contests![selectedContest]} />
    </div>
  );
}

function Table({ contest }: { contest: Contest }) {
  return (
    <div className="not-prose">
      <div className="relative inset-y-0 left-1/2 w-screen -translate-x-1/2 overflow-x-auto">
        <table className="table relative left-0">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cognome</th>
              <th>Classe</th>
              <th>Sezione</th>
              <th>Data di nascita</th>
              <th>Variante</th>
              {range(contest.questionCount).map((i) => (
                <th key={i}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {range(100).map((i) => (
              <StudentRow key={i} contest={contest} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentRow({ contest }: { contest: Contest }) {
  const db = useDb();

  const [student, setStudent] = useState<Student>({});

  const variantRef = student.variant
    ? doc(db, "variants", student.variant).withConverter(variantConverter)
    : undefined;
  const [variant, loading, error] = useDocumentDataOnce(variantRef);

  const birthDate = student.birthDate
    ? formatISO(student.birthDate, { representation: "date" })
    : "";
  const setBirthDate = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent((student) => ({
      ...student,
      birthDate: e.target.value ? new Date(e.target.value) : undefined,
    }));
  };

  const setField = (field: keyof Student) => (e: ChangeEvent<HTMLInputElement>) => {
    setStudent((student) => ({ ...student, [field]: e.target.value }));
  };

  return (
    <tr>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Nome"
          value={student.name ?? ""}
          onChange={setField("name")}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Cognome"
          value={student.surname ?? ""}
          onChange={setField("surname")}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="number"
          placeholder="Classe"
          value={student.classYear ?? 0}
          onChange={setField("classYear")}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Sezione"
          value={student.classSection ?? ""}
          onChange={setField("classSection")}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="date"
          placeholder="Data di nascita"
          value={birthDate}
          onChange={setBirthDate}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Variante"
          value={student.variant ?? ""}
          onChange={setField("variant")}
        />
      </td>
      {range(contest.questionCount).map((i) => (
        <Answer key={i} question={variant?.schema[i]} />
      ))}
    </tr>
  );
}

function Answer({ question }: { question?: Variant["schema"][0] }) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  return (
    <td className="px-0.5">
      <input
        className="input input-ghost input-xs w-10"
        type={question?.type ?? "text"}
        disabled={!question}
        onChange={onChange}
      />
    </td>
  );
}
