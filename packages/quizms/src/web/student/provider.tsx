import { type ReactNode, useCallback, useEffect, useState } from "react";

import { useIsAfter } from "@olinfo/react-components";

import { type Contest, calcScore, type Participation, type Schema, type Student } from "~/models";

import { StudentContext, type StudentContextProps } from "./context";
import { StudentLayout } from "./layout";

type StudentProviderProps = {
  /** Student data */
  student: Student;
  /** Function to update student data */
  setStudent: (value: Student) => Promise<void> | void;
  /** Student's contest */
  contest: Contest;
  /** Student's school */
  participation: Participation;
  /** Function to reset answers and restart the test (optional) */
  reset?: () => Promise<void> | void;
  /** Function executed when the student has completed the test (optional) */
  onSubmit?: () => Promise<void> | void;
  /** Function to change user */
  logout?: () => Promise<void> | void;
  /** Flag indicating if the test is completed */
  terminated: boolean;
};

export function StudentProvider({
  setStudent,
  children,
  student,
  ...props
}: Omit<StudentProviderProps, "terminated"> & {
  children: ReactNode;
}) {
  const [schema, registerSchema] = useState<Schema>({});
  const terminated = useIsAfter(student.finishedAt) ?? false;

  const setStudentAndScore = useCallback(
    async (student: Student) => {
      if (process.env.QUIZMS_MODE === "training") {
        await setStudent({ ...student, score: calcScore(student, schema) });
      } else {
        await setStudent(student);
      }
    },
    [setStudent, schema],
  );

  const value: StudentContextProps = {
    ...props,
    student,
    setStudent: setStudentAndScore,
    terminated,
    schema,
    registerSchema,
  };

  useEffect(() => {
    if (process.env.QUIZMS_MODE === "training" && student.maxScore == null) {
      let maxScore = 0;
      const answers = { ...student.answers };
      for (const id in schema) {
        maxScore += schema[id].maxPoints;
        answers[id] ??= null;
      }
      setStudent({ ...student, maxScore, answers });
    }
  }, [student, setStudent, schema]);

  return (
    <StudentContext.Provider value={value}>
      <StudentLayout>{children}</StudentLayout>
    </StudentContext.Provider>
  );
}
