import React, { ChangeEvent, Suspense, useRef, useState } from "react";

import classNames from "classnames";
import { formatISO } from "date-fns";
import { range } from "lodash-es";

import { studentConverter } from "~/firebase/converters";
import { useCollection, useDocument } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Loading from "~/ui/components/loading";

import { useTeacher } from "./provider";

export function TeacherTable() {
  const { contests } = useTeacher();

  const [selectedContest, setSelectedContest] = useState(Object.values(contests)[0].id);

  return (
    <>
      <div className="mb-5 flex justify-center">
        <div role="tablist" className="tabs-boxed tabs grow justify-center lg:max-w-3xl">
          {Object.values(contests).map((contest) => (
            <a
              role="tab"
              key={contest.id}
              className={classNames("tab", contest.id == selectedContest && "tab-active")}
              onClick={() => setSelectedContest(contest.id)}>
              {contest.name}
            </a>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-auto overflow-auto">
        <Suspense fallback={<Loading className="h-full" />}>
          <Table contest={contests[selectedContest]} />
        </Suspense>
      </div>
    </>
  );
}

function Table({ contest }: { contest: Contest }) {
  const { school } = useTeacher();

  // TODO: extract firebase login
  const students = useCollection("students", studentConverter, {
    school: school.id,
    contest: contest.id,
  });

  return (
    <table className="table">
      <thead className="sticky top-0 bg-base-100">
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
          <th>Abilitato</th>
        </tr>
      </thead>
      <tbody>
        {students!.map((student) => (
          <StudentRow key={student.id} contest={contest} studentId={student.id!} />
        ))}
      </tbody>
    </table>
  );
}

type StudentRowProps = {
  contest: Contest;
  studentId: string;
};

function StudentRow({ contest, studentId }: StudentRowProps) {
  const [student, setStudent] = useDocument(`students/${studentId}`, studentConverter);

  const { variants } = useTeacher();
  const variant = variants[student.variant ?? ""];

  const birthDate = student.birthDate
    ? formatISO(student.birthDate, { representation: "date" })
    : "";
  const setBirthDate = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent({
      ...student,
      birthDate: e.target.value ? new Date(e.target.value) : undefined,
    });
  };

  const setDisabled = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent({ ...student, disabled: !e.target.checked });
  };

  const setField = (field: keyof Student) => (e: ChangeEvent<HTMLInputElement>) => {
    setStudent({ ...student, [field]: e.target.value });
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
          disabled={student.disabled}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Cognome"
          value={student.surname ?? ""}
          onChange={setField("surname")}
          disabled={student.disabled}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="number"
          placeholder="Classe"
          value={student.classYear ?? ""}
          onChange={setField("classYear")}
          disabled={student.disabled}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Sezione"
          value={student.classSection ?? ""}
          onChange={setField("classSection")}
          disabled={student.disabled}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="date"
          placeholder="Data di nascita"
          value={birthDate}
          onChange={setBirthDate}
          disabled={student.disabled}
        />
      </td>
      <td>
        <input
          className="input input-ghost input-xs"
          type="text"
          placeholder="Variante"
          value={student.variant ?? ""}
          onChange={setField("variant")}
          disabled={student.disabled}
        />
      </td>
      {range(contest.questionCount).map((i) => (
        <Answer key={i} question={variant?.schema[i]} disabled={student.disabled} />
      ))}
      <td>
        <div className="flex justify-center">
          <input
            className="checkbox"
            type="checkbox"
            checked={!student.disabled}
            onChange={setDisabled}
            tabIndex={-1}
          />
        </div>
      </td>
    </tr>
  );
}

function Answer({ question, disabled }: { question?: Variant["schema"][0]; disabled?: boolean }) {
  const ref = useRef<HTMLTableCellElement>(null);

  const [value, setValue] = useState("");
  const [blur, setBlur] = useState(false);

  function isPartiallyValid(value: string) {
    return question?.options?.some((option) => option.startsWith(value)) ?? true;
  }

  function isValid(value: string) {
    return question?.options?.includes(value) ?? true;
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBlur(false);
    const newValue = e.target.value.toUpperCase(); // TODO: this is not always correct
    if (isPartiallyValid(newValue)) setValue(newValue);

    if (isValid(newValue)) {
      const sibling = ref.current?.nextElementSibling?.firstElementChild as HTMLInputElement;
      if (sibling) sibling.focus();
    }
  };

  return (
    <td className="px-0.5" ref={ref}>
      <input
        className={classNames(
          "input input-ghost input-xs w-10",
          blur && !isValid(value) && "input-error",
        )}
        type={question?.type ?? "text"}
        disabled={disabled || !question}
        value={value}
        onChange={onChange}
        onBlur={() => setBlur(true)}
      />
    </td>
  );
}
