import React, {
  Ref,
  Suspense,
  forwardRef,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CellEditRequestEvent,
  ColDef,
  ICellRendererParams,
  ITooltipParams,
} from "ag-grid-community";
import classNames from "classnames";
import { addMinutes, differenceInMilliseconds, format, isEqual as isEqualDate } from "date-fns";
import { it as dateLocaleIT } from "date-fns/locale";
import { cloneDeep, compact, set, sumBy } from "lodash-es";
import { AlertTriangle, FileCheck, Upload, Users } from "lucide-react";

import { Contest, parsePersonalInformation } from "~/models/contest";
import { School } from "~/models/school";
import { score } from "~/models/score";
import { Student, studentHash } from "~/models/student";
import { SchemaDoc } from "~/models/variant";
import Loading from "~/ui/components/loading";
import Modal from "~/ui/components/modal";
import useTime from "~/ui/components/time";
import { randomId } from "~/utils/random";

import { useTeacher } from "./provider";
import ImportModal from "./tableImporter";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const AgGridReact = lazy(() => import("ag-grid-react").then((m) => ({ default: m.AgGridReact })));

export function TeacherTable() {
  const { contests, schools } = useTeacher();
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
          <FinalizeModal
            key={contest.id}
            ref={finalizeRef}
            school={schools[selectedSchool]}
            contest={contest}
          />
        </div>
      </div>
      <div className="min-h-0 flex-auto">
        <Suspense fallback={<Loading />}>
          <Table key={selectedSchool} contest={contest} school={schools[selectedSchool]} />
          <ImportModal ref={importRef} school={schools[selectedSchool]} contest={contest} />
        </Suspense>
      </div>
    </>
  );
}

function Counter({ school, contest }: { school: School; contest: Contest }) {
  const { students, variants } = useTeacher();

  return sumBy(students, (s) => {
    return Number(
      s.school === school.id &&
        !isEmpty(s, contest) &&
        !s.disabled &&
        !isStudentIncomplete(s, contest, variants),
    );
  });
}

const FinalizeModal = forwardRef(function FinalizeModal(
  props: { contest: Contest; school: School },
  ref: Ref<HTMLDialogElement> | null,
) {
  const { students, variants, setSchool } = useTeacher();
  const [confirm, setConfirm] = useState("");

  const error = useMemo(() => {
    const filteredStudents = students.filter((s) => s.school === props.school.id);

    const prevStudents = new Set();

    for (const student of filteredStudents) {
      const { name, surname } = student.personalInformation ?? {};

      const reason = isStudentIncomplete(student, props.contest, variants);
      if (reason) {
        if (!name || !surname) return "Almeno uno studente non ha nome o cognome";
        return `Lo studente ${name} ${surname} non può essere finalizzato: ${reason}`;
      }

      if (!student.disabled) {
        if (prevStudents.has(studentHash(student))) {
          return `Lo studente ${name} ${surname} è stato inserito più volte`;
        }
        prevStudents.add(studentHash(student));
      }
    }
  }, [students, props, variants]);

  const correctConfirm = "tutti gli studenti sono stati correttamente inseriti";

  const finalize = async () => {
    await setSchool({ ...props.school, finalized: true });
    window.location.reload();
  };

  return (
    <Modal ref={ref} title="Finalizza scuola">
      {error && (
        <div className="prose">
          <p>Non è possibile finalizzare la scuola a causa del seguente errore:</p>
          <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">{error}</p>
          <p>
            Se questo studente è stato aggiunto per errore e vuoi rimuoverlo, puoi usare il pulsante{" "}
            <i>Cancella</i> nell&apos;ultima colonna.
          </p>
        </div>
      )}
      {!error && (
        <div className="prose">
          <p>
            <strong className="text-error">Attenzione:</strong> questa operazione è irreversibile.
          </p>
          <p>
            Finalizzando <b>non</b> sarà più possibile <b>aggiungere</b> nuovi studenti o{" "}
            <b>modificare</b> i dati degli studenti in questa scuola per la gara{" "}
            <i>{props.contest?.name}</i>.
          </p>
          <p>
            Se hai capito e sei d&apos;accordo, scrivi &ldquo;<i>{correctConfirm}</i>&rdquo;.
          </p>
          <p>
            <input
              type="text"
              className="input input-bordered w-full px-5"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </p>
          <div className="flex justify-center gap-5">
            <button
              className="btn btn-error"
              onClick={finalize}
              disabled={confirm !== correctConfirm}>
              <AlertTriangle />
              Conferma
            </button>
            <button className="btn btn-neutral">Annulla</button>
          </div>
        </div>
      )}
    </Modal>
  );
});

function Table({ school, contest }: { school: School; contest: Contest }) {
  const { solutions, students, setStudent, variants } = useTeacher();

  const getNow = useTime();
  const endTime =
    !!school.startingTime &&
    !!contest.duration &&
    addMinutes(school.startingTime, contest.duration);
  const isContestRunning = endTime && getNow() <= endTime;

  const TESTID = "scolastiche-test"; // TODO: revert, only for testing
  const editable = (!isContestRunning || contest.id == TESTID) && !school.finalized;

  const newStudentId = useRef(randomId());

  const setStudentAndUpdateId = async (student: Student) => {
    newStudentId.current = randomId();
    await setStudent(student);
  };

  const allStudents = [
    ...students.filter((s) => s.school === school.id),
    ...(editable
      ? [
          {
            id: newStudentId.current,
            contest: contest.id,
            school: school.id,
            createdAt: new Date(),
            answers: {},
          } as Student,
        ]
      : []),
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

  const [, setTime] = useState(getNow);
  useEffect(() => {
    if (!isContestRunning) return;
    const now = getNow();
    const id = setTimeout(() => setTime(getNow), differenceInMilliseconds(endTime, now));
    return () => clearTimeout(id);
  }, [getNow, endTime, isContestRunning]);

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
            editable,
            width: widths[field.size ?? "md"],
            equals: field.type === "date" ? isEqualDate : undefined,
            tooltipValueGetter: ({ data }: ITooltipParams<Student>) => {
              return isStudentIncomplete(data!, contest, variants);
            },
            cellRenderer: ({ api, data, value }: ICellRendererParams<Student>) => {
              if (field.type === "date" && value) {
                return format(value, "P", { locale: dateLocaleIT });
              }
              if (
                i === 0 &&
                field.type === "text" &&
                !api.getSelectedRows().some((s: Student) => s.id === data?.id) &&
                isStudentIncomplete(data!, contest, variants)
              ) {
                return (
                  <span>
                    {value}{" "}
                    <AlertTriangle
                      className="mb-1 inline-block cursor-text text-warning"
                      size={16}
                    />
                  </span>
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
          editable,
          width: 100,
        },
        ...contest.problemIds.map(
          (id, i): ColDef => ({
            field: `answers[${id}]`,
            valueGetter: ({ data }) => data.answers?.[id],
            tooltipValueGetter: ({ data }) => data.answers?.[id],
            headerName: String(id),
            sortable: false,
            resizable: true,
            editable,
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
          headerName: "Cancella",
          cellDataType: "boolean",
          filter: true,
          resizable: true,
          editable,
          width: 120,
          valueGetter: ({ data }) => data.disabled ?? false,
        },
      ]),
    [contest, variants, solutions, widths, editable],
  );

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let value = ev.newValue;
    const [field, subfield] = ev.colDef.field!.split(/[.[\]]/);
    if (field === "personalInformation") {
      const schema = contest.personalInformation.find((f) => f.name === subfield);
      value = parsePersonalInformation(value, schema);
    }
    if (field === "variant") {
      if (
        !variants.some((v) => v.id === value && (v.contest === contest.id || contest.id == TESTID))
      ) {
        value = undefined;
      }
    }
    if (field === "answers") {
      value = value?.toUpperCase();

      const variant = variants.find(
        (v) => v.id === (ev.data as Student).variant && v.contest === contest.id,
      );
      const schema = variant?.schema[subfield];

      const isValid = value === schema?.blankOption || (schema?.options?.includes(value) ?? true);
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
        enableBrowserTooltips={true}
        onGridReady={(ev) => {
          ev.api.setFilterModel({
            disabled: {
              filterType: "text",
              type: "false",
            },
          });
        }}
      />
    </div>
  );
}

function isStudentIncomplete(student: Student, contest: Contest, variants: SchemaDoc[]) {
  if (isEmpty(student, contest)) return;
  if (student.disabled) return;

  for (const field of contest.personalInformation) {
    if (!student.personalInformation?.[field.name]) {
      return `${field.label} mancante`;
    }
  }

  let variant = variants.find((v) => v.id === student.variant);

  if (contest.hasVariants && !variant) return "Variante mancante";
  if (!variant) {
    variant = variants.find((v) => v.contest === contest.id && ["1", "2"].includes(v.id))!; // TODO: ugly hack
  }

  for (const [id, schema] of Object.entries(variant.schema)) {
    const ans = student.answers?.[id];
    if (!ans || ans === schema.blankOption) continue;
    if (schema.type === "number" && !/^\d+$/.test(ans.trim())) {
      return `La domanda ${id} deve contenere un numero intero`;
    }
  }
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
