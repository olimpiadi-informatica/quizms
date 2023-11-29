import React, { ChangeEvent, Suspense, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { constant, range, times, zip } from "lodash-es";
import { Check, Upload } from "lucide-react";

import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Loading from "~/ui/components/loading";

import { useTeacher } from "./provider";
import { TableBooleanField, TableField } from "./tableFields";
import { ImportModal } from "./tableImporter";

export function TeacherTable() {
  const { contests, variants, school } = useTeacher();
  const [selectedContest, setSelectedContest] = useState(0);
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className="flex items-center justify-between">
        {contests.length >= 2 && (
          <div className="m-5 flex justify-center">
            <div role="tablist" className="tabs-boxed tabs flex flex-wrap justify-center">
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
        <button
          className="btn btn-primary btn-sm mx-5 h-10"
          onClick={() => modalRef.current?.showModal()}>
          <Upload />
          <div className="hidden md:block">Importa studenti</div>
        </button>
      </div>
      <div className="min-h-0 flex-auto overflow-scroll pb-[25vh]">
        <Suspense fallback={<Loading />}>
          <Table contest={contests[selectedContest]} variants={variants} />
        </Suspense>
      </div>
      <ImportModal
        ref={modalRef}
        contest={contests[selectedContest]}
        variants={variants}
        school={school}
      />
    </>
  );
}

function Table({ contest, variants }: { contest: Contest; variants: Variant[] }) {
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
          <th>Punteggio</th>
          <th>Escludi</th>
        </tr>
      </thead>
      <tbody>
        {allStudents.map((student) => (
          <StudentRow
            key={student.id}
            contest={contest}
            variants={variants}
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
  variants: Variant[];
  student: Student;
  setStudent: (student: Student) => void;
};

function StudentRow({ contest, variants, student, setStudent }: StudentRowProps) {
  const { solutions } = useTeacher();
  const variant = variants.find((v) => v.contest == contest.id && v.id == student.variant);
  const solution = solutions.find((s) => s.id == student.variant)?.answers;

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

  const points = useMemo(() => {
    if (!student?.answers || !variant?.schema || !solution) return NaN;
    return zip(variant.schema, student.answers, solution).reduce(
      (acc, [schema, answer, solution]) => {
        if (
          schema?.pointsCorrect === undefined ||
          schema?.pointsBlank === undefined ||
          schema?.pointsWrong === undefined ||
          answer === undefined ||
          solution === undefined
        ) {
          return NaN;
        }

        if (answer === solution) {
          return acc + schema.pointsCorrect;
        }
        if (answer === undefined || answer === schema?.blankOption) {
          return acc + schema.pointsBlank;
        }
        return acc + schema.pointsWrong;
      },
      0,
    );
  }, [variant, student, solution]);

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
          disabled={student.disabled}
        />
      ))}
      <TableField
        name="variant"
        type="text"
        label="Variante"
        size="md"
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
      <td className="px-0.5">
        <div className="flex justify-center">{!isNaN(points) && points}</div>
      </td>
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
  question?: Variant["schema"][number];
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
