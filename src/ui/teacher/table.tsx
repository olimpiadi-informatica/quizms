import React, { CSSProperties, ChangeEvent, useEffect, useRef, useState } from "react";

import classNames from "classnames";
import { formatISO } from "date-fns";
import { range } from "lodash-es";

import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Progress from "~/ui/components/progress";

import { useTeacher } from "./provider";

export function TeacherTable() {
  const { contests } = useTeacher();

  const [selectedContest, setSelectedContest] = useState(Object.values(contests)[0].id);

  return (
    <div>
      <div role="tablist" className="not-prose tabs-boxed tabs mb-5 justify-center">
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
      <Table contest={contests[selectedContest]} />
    </div>
  );
}

function Table({ contest }: { contest: Contest }) {
  const ref = useRef<HTMLDivElement>(null);
  const [padding, setPadding] = useState<CSSProperties>({ paddingLeft: 16, paddingRight: 16 });
  const [loadingTable, setLoading] = useState(true);

  useEffect(() => {
    function onResize() {
      if (ref.current?.offsetLeft) {
        setPadding({
          paddingLeft: Math.min(ref.current.offsetLeft, 160),
          paddingRight: Math.min(ref.current.offsetLeft, 160),
        });
      }
    }

    onResize();
    setLoading(!ref.current);

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ref]);

  return (
    <div className="not-prose" ref={ref}>
      {loadingTable && <Loading />}
      {!loadingTable && (
        <div
          className="relative inset-y-0 left-1/2 w-screen -translate-x-1/2 overflow-x-auto"
          style={padding}>
          <table className="table">
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
                <th>Abilitato</th>
              </tr>
            </thead>
            <tbody>
              {range(3).map((i) => (
                <StudentRow key={i} contest={contest} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentRow({ contest }: { contest: Contest }) {
  const [student, setStudent] = useState<Student>({});

  const { variants } = useTeacher();
  const variant = variants[student.variant ?? ""];

  const birthDate = student.birthDate
    ? formatISO(student.birthDate, { representation: "date" })
    : "";
  const setBirthDate = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent((student) => ({
      ...student,
      birthDate: e.target.value ? new Date(e.target.value) : undefined,
    }));
  };

  const setDisabled = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent((student) => ({ ...student, disabled: !e.target.checked }));
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
      console.log("focus", sibling);
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

function Loading() {
  return (
    <div className="m-auto my-64 w-64">
      <Progress>Caricamento in corso...</Progress>
    </div>
  );
}
