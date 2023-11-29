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
          <ImportModal
            ref={modalRef}
            contest={contests[selectedContest]}
            variants={variants}
            school={school}
          />
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

  const [sortedField, setSortedField] = useState<[string, boolean | undefined]>(["", undefined]);

  const getSorted = (field: string) => {
    if (field === sortedField[0]) return sortedField[1];
    return undefined;
  };

  const setSorted = (field: string) => (sorted?: boolean) => {
    setSortedField([field, sorted]);
  };

  console.log(sortedField);

  const allStudents: Student[] = useMemo(() => {
    const sortedStudents = students.slice();
    sortedStudents.sort((a, b) => {
      const fa = get(a, sortedField[0]);
      const fb = get(b, sortedField[0]);

      if (sortedField[1] === undefined || (fa === undefined && fb === undefined)) {
        return comp(a.createdAt, b.createdAt, false);
      }

      if (fa === undefined) return 1;
      if (fb === undefined) return -1;
      return comp(fa, fb, !sortedField[1]);

      function comp(a: any, b: any, reverse: boolean) {
        if (a === b) return 0;
        return (a < b ? -1 : 1) * (reverse ? -1 : 1);
      }
    });

    return [
      ...sortedStudents,
      {
        id: newStudentId.current,
        contest: contest.id,
        school: school.id,
        createdAt: new Date(),
      },
    ];
  }, [students, sortedField, contest, school]);

  return (
    <table className="table table-pin-rows table-pin-cols">
      <thead>
        <tr>
          <td></td>
          {contest.personalInformation.map((field) =>
            field.pinned ? (
              <th key={field.name}>
                <SortedField
                  sorted={getSorted(`personalInformation.${field.name}`)}
                  setSorted={setSorted(`personalInformation.${field.name}`)}
                  label={field.label}
                />
              </th>
            ) : (
              <td key={field.name}>
                <SortedField
                  sorted={getSorted(`personalInformation.${field.name}`)}
                  setSorted={setSorted(`personalInformation.${field.name}`)}
                  label={field.label}
                />
              </td>
            ),
          )}
          {contest.hasVariants && (
            <td>
              <SortedField
                sorted={getSorted("variant")}
                setSorted={setSorted("variant")}
                label="Variante"
              />
            </td>
          )}
          {range(contest.questionCount).map((i) => (
            <td key={i}>{i + 1}</td>
          ))}
          <th>
            {/* <SortedField
              sorted={getSorted("Punteggio")}
              setSorted={setSorted("Punteggio")}
              label="Punteggio"
            /> */}
            Punteggio
          </th>
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
    if (sorted === undefined) setSorted(true);
    if (sorted === true) setSorted(false);
    if (sorted === false) setSorted(undefined);
  };

  return (
    <div className="flex items-center gap-1">
      <span>{label}</span>
      <button onClick={onClick}>
        {sorted === true && <ChevronUp size={16} />}
        {sorted === false && <ChevronDown size={16} />}
        {sorted === undefined && <ChevronsUpDown size={16} />}
      </button>
    </div>
  );
}
