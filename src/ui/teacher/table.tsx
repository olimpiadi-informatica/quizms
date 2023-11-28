import React, { ChangeEvent, Suspense, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { formatISO } from "date-fns";
import { constant, range, times } from "lodash-es";
import { Check } from "lucide-react";

import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Loading from "~/ui/components/loading";

import { useTeacher } from "./provider";

export function TeacherTable() {
  const { contests } = useTeacher();

  const [selectedContest, setSelectedContest] = useState(0);

  return (
    <>
      {contests.length >= 2 && (
        <div className="m-5 flex justify-center">
          <div role="tablist" className="tabs-boxed tabs justify-center">
            {contests.map((contest, i) => (
              <a
                role="tab"
                key={contest.id}
                className={classNames("tab", i == selectedContest && "tab-active")}
                onClick={() => setSelectedContest(i)}>
                {contest.name}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="min-h-0 flex-auto overflow-scroll pb-[25vh]">
        <Suspense fallback={<Loading />}>
          <Table contest={contests[selectedContest]} />
        </Suspense>
      </div>
    </>
  );
}

function Table({ contest }: { contest: Contest }) {
  const { school } = useTeacher();

  // TODO: extract firebase logic
  const [students, setStudent] = useCollection("students", studentConverter, {
    constraints: {
      school: school.id,
      contest: contest.id,
    },
    orderBy: "createdAt",
  });

  const newStudentId = useRef(window.crypto.randomUUID());

  const allStudents: Student[] = [
    ...students,
    {
      id: newStudentId.current,
      contest: contest.id,
      school: school.id,
      createdAt: new Date(),
    },
  ];

  const setStudentAndUpdateId = (student: Student) => {
    setStudent(student);
    newStudentId.current = window.crypto.randomUUID();
  };

  return (
    <table className="table">
      <thead className="sticky top-0 bg-base-100">
        <tr>
          <th></th>
          <th>Nome</th>
          <th>Cognome</th>
          <th>Classe</th>
          <th>Sezione</th>
          <th>Data di nascita</th>
          <th>Variante</th>
          {range(contest.questionCount).map((i) => (
            <th key={i}>{i + 1}</th>
          ))}
          <th>Escludi</th>
        </tr>
      </thead>
      <tbody>
        {allStudents.map((student) => (
          <StudentRow
            key={student.id}
            contest={contest}
            student={student}
            setStudent={setStudentAndUpdateId}
          />
        ))}
      </tbody>
    </table>
  );
}

type StudentRowProps = {
  contest: Contest;
  student: Student;
  setStudent: (student: Student) => void;
};

function StudentRow({ contest, student, setStudent }: StudentRowProps) {
  const { variants } = useTeacher();
  const variant = variants.find(
    (variant) => variant.contest === contest.id && variant.id == student.variant,
  );

  const birthDate = student.birthDate
    ? formatISO(student.birthDate, { representation: "date" })
    : "";
  const setBirthDate = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent({
      ...student,
      birthDate: e.target.valueAsDate ?? undefined,
    });
  };

  const setClassYear = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === "") {
      setStudent({ ...student, classYear: undefined });
    } else {
      const classYear = Number(e.target.value);
      if (1 <= classYear && classYear <= 5) {
        setStudent({ ...student, classYear });
      }
    }
  };

  const setDisabled = (e: ChangeEvent<HTMLInputElement>) => {
    setStudent({ ...student, disabled: e.target.checked });
  };

  const setField = (field: keyof Student) => (e: ChangeEvent<HTMLInputElement>) => {
    setStudent({ ...student, [field]: e.target.value });
  };

  const setAnswer = (index: number) => (value: string) => {
    const answers = [...(student.answers ?? times(contest.questionCount, constant("")))];
    answers[index] = value;
    setStudent({ ...student, answers });
  };

  const isComplete = useMemo(() => {
    const answers = range(contest.questionCount).every((i) => student.answers?.[i]);
    const fields: (keyof Student)[] = [
      "name",
      "surname",
      "classYear",
      "classSection",
      "birthDate",
      "variant",
    ];
    return answers && fields.every((f) => student[f]) && !student.disabled;
  }, [student, contest.questionCount]);

  return (
    <tr>
      <td>
        <Check className={classNames("text-success", !isComplete && "opacity-0")} />
      </td>
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
          type="text"
          placeholder="Classe"
          value={student.classYear ?? ""}
          onChange={setClassYear}
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
        <Answer
          key={i}
          question={variant?.schema?.[i]}
          value={student.answers?.[i] ?? ""}
          setValue={setAnswer(i)}
          disabled={student.disabled}
        />
      ))}
      <td>
        <div className="flex justify-center">
          <input
            className={classNames("checkbox", student.disabled && "checkbox-error")}
            type="checkbox"
            checked={student.disabled ?? false}
            onChange={setDisabled}
            tabIndex={-1}
          />
        </div>
      </td>
    </tr>
  );
}

function Answer({
  question,
  value,
  setValue,
  disabled,
}: {
  question?: Variant["schema"][0];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTableCellElement>(null);

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
