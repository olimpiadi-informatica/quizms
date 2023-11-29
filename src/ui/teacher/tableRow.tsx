import React, { ChangeEvent, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { constant, range, times, zip } from "lodash-es";
import { Check } from "lucide-react";

import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";

import { useTeacher } from "./provider";
import { TableBooleanField, TableField } from "./tableFields";

type StudentRowProps = {
  contest: Contest;
  variants: Variant[];
  student: Student;
  setStudent: (student: Student) => void;
};

export default function TableRow({ contest, variants, student, setStudent }: StudentRowProps) {
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
      <th className="px-0.5">
        <div className="flex justify-center">{!isNaN(points) && points}</div>
      </th>
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
