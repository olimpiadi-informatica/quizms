import React, { Suspense, useMemo, useRef, useState } from "react";

import classNames from "classnames";
import { get, range } from "lodash-es";
import { ChevronDown, ChevronUp, ChevronsUpDown, Upload } from "lucide-react";

import { studentConverter } from "~/firebase/converters";
import { useCollection } from "~/firebase/hooks";
import { Contest } from "~/models/contest";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Loading from "~/ui/components/loading";

import { useTeacher } from "./provider";
import ImportModal from "./tableImporter";
import TableRow from "./tableRow";

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
          <ImportModal ref={modalRef} contest={contests[selectedContest]} school={school} />
        </Suspense>
      </div>
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

  const setStudentAndUpdateId = (student: Student) => {
    void setStudent(student);
    newStudentId.current = window.crypto.randomUUID();
  };

  const [sortedFields, setSortedFields] = useState<Record<string, boolean | undefined>>({
    ...Object.fromEntries(
      contest.personalInformation.map((field) => [`personalInformation.${field.name}`, undefined]),
    ),
    variant: undefined,
    createdAt: false,
  });

  const setSorted = (field: string) => (sorted?: boolean) => {
    setSortedFields((prev) => ({
      ...prev,
      [field]: sorted,
    }));
  };

  const allStudents: Student[] = useMemo(() => {
    const sortedStudents = students.slice();
    sortedStudents.sort((a, b) => {
      for (const [field, sorted] of Object.entries(sortedFields)) {
        if (sorted === undefined) continue;
        const fa = get(a, field);
        const fb = get(b, field);
        if (fa === undefined && fb === undefined) continue;
        if (fa === undefined) return 1;
        if (fb === undefined) return -1;
        if (fa < fb) return sorted ? 1 : -1;
        if (fa > fb) return sorted ? -1 : 1;
      }
      return 0;
    });

    sortedStudents.push({
      id: newStudentId.current,
      contest: contest.id,
      school: school.id,
      createdAt: new Date(),
    });

    return sortedStudents;
  }, [students, contest, school, sortedFields]);

  return (
    <table className="table table-pin-rows table-pin-cols">
      <thead>
        <tr>
          <td></td>
          {contest.personalInformation.map((field) =>
            field.pinned ? (
              <th key={field.name}>
                <SortedField
                  sorted={sortedFields[`personalInformation.${field.name}`]}
                  setSorted={setSorted(`personalInformation.${field.name}`)}
                  label={field.label}
                />
              </th>
            ) : (
              <td key={field.name}>
                <SortedField
                  sorted={sortedFields[`personalInformation.${field.name}`]}
                  setSorted={setSorted(`personalInformation.${field.name}`)}
                  label={field.label}
                />
              </td>
            ),
          )}
          {contest.hasVariants && (
            <td>
              <SortedField
                sorted={sortedFields["variant"]}
                setSorted={setSorted("variant")}
                label="Variante"
              />
            </td>
          )}
          {range(contest.questionCount).map((i) => (
            <td key={i} className={classNames(i % 4 === 3 && "pr-8")}>
              {i + 1}
            </td>
          ))}
          <th>Punteggio</th>
          <td>Escludi</td>
        </tr>
      </thead>
      <tbody>
        {allStudents.map((student) => (
          <TableRow
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

type SortedFieldProps = {
  label: string;
  sorted?: boolean;
  setSorted: (sorted?: boolean) => void;
};

function SortedField({ label, sorted, setSorted }: SortedFieldProps) {
  const onClick = () => {
    if (sorted === undefined) setSorted(false);
    if (sorted === false) setSorted(true);
    if (sorted === true) setSorted(undefined);
  };

  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <button onClick={onClick}>
        {sorted === false && <ChevronUp size={16} />}
        {sorted === true && <ChevronDown size={16} />}
        {sorted === undefined && <ChevronsUpDown size={16} />}
      </button>
    </div>
  );
}
