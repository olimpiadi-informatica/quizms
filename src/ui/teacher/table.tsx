import React, { ChangeEvent, Suspense, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { constant, range, times } from "lodash-es";
import { Check } from "lucide-react";

import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Loading from "~/ui/components/loading";

import { useTeacher } from "./provider";
import { TableBooleanField, TableField } from "./tableFields";

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
          {contest.personalInformation.map((field) => (
            <th key={field.name}>{field.label}</th>
          ))}
          {contest.hasVariants && <th>Variante</th>}
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

  const setAnswer = (index: number) => (value: string) => {
    const answers = [...(student.answers ?? times(contest.questionCount, constant("")))];
    answers[index] = value;
    setStudent({ ...student, answers });
  };

  const isComplete = useMemo(() => {
    const answers = range(contest.questionCount).every((i) => student.answers?.[i]);
    const personalInformation = contest.personalInformation.every(
      (f) => student.personalInformation?.[f.name],
    );
    return answers && personalInformation && !student.disabled;
  }, [student, contest.questionCount, contest.personalInformation]);

  return (
    <tr>
      <td>
        <Check className={classNames("text-success", !isComplete && "opacity-0")} />
      </td>
      {contest.personalInformation.map((field) => (
        <TableField
          key={field.name}
          {...field}
          data={student.personalInformation ?? {}}
          setData={(info) => setStudent({ ...student, personalInformation: info })}
        />
      ))}
      <TableField
        name="variant"
        type="text"
        label="Variante"
        data={student}
        setData={setStudent}
        disabled={student.disabled}
      />
      {range(contest.questionCount).map((i) => (
        <Answer
          key={i}
          question={variant?.schema?.[i]}
          value={student.answers?.[i] ?? ""}
          setValue={setAnswer(i)}
          disabled={student.disabled}
        />
      ))}
      <TableBooleanField
        className={student.disabled && "checkbox-error"}
        name="disabled"
        data={student}
        setData={setStudent}
      />
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
