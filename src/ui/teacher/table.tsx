import React, { Ref, Suspense, forwardRef, lazy, useMemo, useRef, useState } from "react";

import { CellEditRequestEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import classNames from "classnames";
import { format, isEqual as isEqualDate } from "date-fns";
import { it as dateLocaleIT } from "date-fns/locale";
import { cloneDeep, compact, set, sumBy } from "lodash-es";
import { AlertTriangle, FileCheck, Upload, Users } from "lucide-react";

import { Contest } from "~/models/contest";
import { School } from "~/models/school";
import { score } from "~/models/score";
import { Student } from "~/models/student";
import { Variant } from "~/models/variant";
import Loading from "~/ui/components/loading";
import Modal from "~/ui/components/modal";

import { useTeacher } from "./provider";
import ImportModal from "./tableImporter";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const AgGridReact = lazy(() => import("ag-grid-react").then((m) => ({ default: m.AgGridReact })));

export function TeacherTable() {
  const { contests, variants, schools } = useTeacher();
  const [selectedSchool, setSelectedSchool] = useState(0);
  const importRef = useRef<HTMLDialogElement>(null);
  const finalizeRef = useRef<HTMLDialogElement>(null);

  const contest = contests.find((c) => c.id === schools[selectedSchool].contestId)!;
  return (
    <>
      <div className="m-5 flex items-center justify-between gap-5">
        {contests.length >= 2 && (
          <div className="flex justify-center">
            <div role="tablist" className="tabs-boxed tabs flex flex-wrap justify-center">
              {schools.map((school, i) => (
                <a
                  role="tab"
                  key={school.id}
                  className={classNames("tab", i == selectedSchool && "tab-active")}
                  onClick={() => setSelectedSchool(i)}>
                  {contests.find((c) => c.id == school.contestId)!.name}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-none gap-5">
          <div className="hidden md:block">
            <Suspense>
              <div className="flex h-10 items-center gap-2 rounded-btn bg-primary px-3 text-primary-content">
                <Users />
                <Counter school={schools[selectedSchool]} contest={contest} />
                <div className="hidden lg:block"> studenti</div>
              </div>
            </Suspense>
          </div>
          <button
            className="btn btn-primary btn-sm h-10"
            onClick={() => importRef.current?.showModal()}>
            <Upload />
            <div className="hidden lg:block">Importa studenti</div>
          </button>
          {!schools[selectedSchool].finalized && (
            <button
              className="btn btn-primary btn-sm h-10"
              onClick={() => finalizeRef.current?.showModal()}>
              <FileCheck />
              <div className="hidden lg:block">Finalizza</div>
            </button>
          )}
          <FinalizeModal ref={finalizeRef} school={schools[selectedSchool]} />
        </div>
      </div>
      <div className="min-h-0 flex-auto overflow-scroll">
        <Suspense fallback={<Loading />}>
          <Table
            key={selectedSchool}
            contest={contest}
            variants={variants}
            school={schools[selectedSchool]}
          />
          <ImportModal ref={importRef} school={schools[selectedSchool]} contest={contest} />
        </Suspense>
      </div>
    </>
  );
}

function Counter({ school, contest }: { school: School; contest: Contest }) {
  const { students, schools } = useTeacher();
  return sumBy(students, (s) => {
    return Number(school.contestId === contest.id && isComplete(s, contest));
  });
}

const FinalizeModal = forwardRef(function FinalizeModal(
  props: { school: School },
  ref: Ref<HTMLDialogElement> | null,
) {
  const { setSchool } = useTeacher();

  const finalize = async () => {
    await setSchool({ ...props.school, finalized: true });
    window.location.reload();
  };

  return (
    <Modal ref={ref} title="Finalizza scuola">
      <p className="mb-3">
        <strong className="text-error">Attenzione:</strong> questa operazione è irreversibile.
      </p>
      <p className="mb-3">Finalizzando non sarà più possibile modificare i dati degli studenti.</p>
      <div className="flex justify-center gap-5">
        <button className="btn btn-error" onClick={finalize}>
          Conferma
        </button>
        <button className="btn btn-neutral">Annulla</button>
      </div>
    </Modal>
  );
});

function Table({
  school,
  contest,
  variants,
}: {
  school: School;
  contest: Contest;
  variants: Variant[];
}) {
  const { schools, contests, solutions, students, setStudent } = useTeacher();

  const newStudentId = useRef(window.crypto.randomUUID());

  const setStudentAndUpdateId = async (student: Student) => {
    newStudentId.current = window.crypto.randomUUID();
    await setStudent(student);
  };

  const allStudents = [
    ...students.filter((s) => s.school === school.id),
    {
      id: newStudentId.current,
      contest: contest.id,
      school: school.id,
      createdAt: new Date(),
      answers: {},
    } as Student,
  ];

  const widths = useMemo(
    () => ({
      xs: 100,
      sm: 125,
      md: 150,
      lg: 200,
      xl: 250,
    }),
    [],
  );

  const colDefs = useMemo(
    (): ColDef[] =>
      compact([
        ...contest.personalInformation.map(
          (field, i): ColDef => ({
            field: `personalInformation.${field.name}`,
            headerName: field.label,
            pinned: field.pinned,
            cellDataType: field.type,
            sortable: true,
            filter: true,
            resizable: true,
            editable: !school.finalized,
            width: widths[field.size ?? "md"],
            equals: field.type === "date" ? isEqualDate : undefined,
            cellRenderer: ({ api, data, value }: ICellRendererParams<Student>) => {
              if (field.type === "date" && value) {
                return format(value, "P", { locale: dateLocaleIT });
              }
              if (
                i === 0 &&
                field.type === "text" &&
                !isComplete(data!, contest) &&
                !isEmpty(data!, contest) &&
                !data?.disabled &&
                !api.getSelectedRows().some((s: Student) => s.id === data?.id)
              ) {
                return (
                  <>
                    {value} <AlertTriangle className="mb-1 inline-block text-warning" size={16} />
                  </>
                );
              }
              return value;
            },
          }),
        ),
        contest.hasVariants && {
          field: "variant",
          headerName: "Variante",
          sortable: true,
          filter: true,
          resizable: true,
          editable: !school.finalized,
          width: 100,
        },
        ...contest.problemIds.map(
          (id, i): ColDef => ({
            field: `answers.${id}`,
            headerName: String(id),
            sortable: false,
            resizable: true,
            editable: !school.finalized,
            width: 50 + (i % 4 === 3 ? 15 : 0),
          }),
        ),
        {
          headerName: "Punti",
          pinned: "right",
          sortable: true,
          filter: true,
          resizable: true,
          width: 100,
          valueGetter: ({ data }) => score(data, variants, solutions),
        },
        {
          field: "disabled",
          headerName: "Escludi",
          cellDataType: "boolean",
          filter: true,
          resizable: true,
          editable: !school.finalized,
          width: 100,
          valueGetter: ({ data }) => data.disabled ?? false,
        },
      ]),
    [contest, variants, solutions, widths, school.finalized],
  );

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let value = ev.newValue;
    const [field, subfield] = ev.colDef.field!.split(".");
    if (field === "personalInformation") {
      const schema = contest.personalInformation.find((f) => f.name === subfield);
      if (
        schema?.type === "number" &&
        (value < (schema?.min ?? -Infinity) || value > (schema?.max ?? Infinity))
      ) {
        value = undefined;
      }
    }
    if (field === "variant") {
      if (!variants.some((v) => v.id === value && v.contest === contest.id)) {
        value = undefined;
      }
    }
    if (field === "answers") {
      value = value?.toUpperCase();

      const variant = variants.find(
        (v) => v.id === (ev.data as Student).variant && v.contest === contest.id,
      );
      const schema = variant?.schema[subfield];

      const isValid = schema?.options?.includes(value) ?? true;
      if (!isValid) value = undefined;
    }

    const student = cloneDeep(ev.data as Student);
    set(student, ev.colDef.field!, value);
    await setStudentAndUpdateId(student);

    ev.api.refreshCells({ force: true });
  };

  return (
    <div className="ag-theme-quartz-auto-dark h-full p-2">
      <AgGridReact
        rowData={allStudents}
        getRowId={(row) => (row.data as Student).id}
        columnDefs={colDefs}
        singleClickEdit={true}
        readOnlyEdit={true}
        rowSelection="single"
        onCellEditRequest={onCellEditRequest}
      />
    </div>
  );
}

function isComplete(student: Student, contest: Contest) {
  return Boolean(
    contest.personalInformation.every((field) => {
      return student.personalInformation?.[field.name];
    }) &&
      student.variant &&
      contest.problemIds.every((id) => student.answers?.[id]) &&
      !student.disabled,
  );
}

function isEmpty(student: Student, contest: Contest) {
  return (
    contest.personalInformation.every((field) => {
      return !student.personalInformation?.[field.name];
    }) &&
    !student.variant &&
    contest.problemIds.every((id) => !student.answers?.[id])
  );
}
