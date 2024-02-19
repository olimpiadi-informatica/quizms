import React, { Ref, Suspense, forwardRef, lazy, useMemo, useRef, useState } from "react";

import type {
  CellEditRequestEvent,
  ColDef,
  ICellRendererParams,
  ITooltipParams,
} from "@ag-grid-community/core";
import { addMinutes, isEqual as isEqualDate } from "date-fns";
import { cloneDeep, compact, deburr, isString, lowerFirst, set, sumBy } from "lodash-es";
import { AlertTriangle, FileCheck, Upload, Users } from "lucide-react";

import { Button, Loading, LoadingButtons, Modal, useIsAfter } from "~/components";
import { Contest, Student, Variant, parsePersonalInformation, score } from "~/models";
import { formatDate } from "~/utils/date";
import { randomId } from "~/utils/random";

import { useTeacher, useTeacherStudents } from "./provider";
import ImportModal from "./table-importer";
import { agGridLocaleIT } from "./table-locale";

import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-quartz.css";

const AgGridReact = lazy(() => import("~/components/ag-grid"));

export function TeacherTable() {
  const { contest, participation } = useTeacher();
  const importRef = useRef<HTMLDialogElement>(null);
  const finalizeRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className="m-5 flex flex-none justify-end gap-5">
        <Suspense>
          <div className="flex h-10 items-center gap-2 rounded-btn bg-primary px-3 text-primary-content">
            <Users />
            <Counter />
            <div className="hidden md:block"> studenti</div>
          </div>
        </Suspense>
        {!participation.finalized && (
          <button
            className="btn btn-primary btn-sm h-10"
            onClick={() => importRef.current?.showModal()}>
            <Upload />
            <div className="hidden md:block">Importa studenti</div>
          </button>
        )}
        {!participation.finalized && (
          <button
            className="btn btn-primary btn-sm h-10"
            onClick={() => finalizeRef.current?.showModal()}>
            <FileCheck />
            <div className="hidden md:block">Finalizza</div>
          </button>
        )}
        <FinalizeModal key={contest.id} ref={finalizeRef} />
      </div>
      <div className="min-h-0 flex-auto">
        <Suspense fallback={<Loading />}>
          <Table key={participation.id} />
          <ImportModal ref={importRef} />
        </Suspense>
      </div>
    </>
  );
}

function Counter() {
  const { contest, variants } = useTeacher();
  const [students] = useTeacherStudents();

  return sumBy(students, (s) => {
    return Number(!s.disabled && !isStudentEmpty(s) && !isStudentIncomplete(s, contest, variants));
  });
}

const FinalizeModal = forwardRef(function FinalizeModal(
  _props,
  ref: Ref<HTMLDialogElement> | null,
) {
  const { contest, participation, variants, setParticipation } = useTeacher();
  const [students] = useTeacherStudents();
  const [confirm, setConfirm] = useState("");

  const error = useMemo(() => {
    const prevStudents = new Set<string>();

    // Generate a list of string that can uniquely identify a student. Multiple
    // strings are generated to prevent possible errors during data entry.
    function normalize(student: Student) {
      const info = student.personalInformation!;
      const orderings = [
        ["name", "surname", "classYear", "classSection"],
        ["surname", "name", "classYear", "classSection"],
      ];
      return orderings.map((fields) => {
        return deburr(fields.map((field) => info[field]).join("\n"))
          .toLowerCase()
          .replaceAll(/[^\na-z]/g, "");
      });
    }

    for (const student of students) {
      if (student.disabled) continue;

      const { name, surname } = student.personalInformation ?? {};

      const reason = isStudentIncomplete(student, contest, variants);
      if (reason) {
        if (!name || !surname) return "Almeno uno studente non ha nome o cognome";
        return `Lo studente ${name} ${surname} non può essere finalizzato: ${lowerFirst(reason)}.`;
      }

      for (const normalized of normalize(student)) {
        if (prevStudents.has(normalized)) {
          return `Lo studente ${name} ${surname} è stato inserito più volte`;
        }
        prevStudents.add(normalized);
      }
    }
  }, [students, contest, variants]);

  const correctConfirm = "tutti gli studenti sono stati correttamente inseriti";

  const finalize = async () => {
    await setParticipation({ ...participation, finalized: true });
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
            <i>{contest?.name}</i>.
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
            <LoadingButtons>
              <Button className="btn-neutral">Annulla</Button>
              <Button
                className="btn-error"
                onClick={finalize}
                disabled={confirm !== correctConfirm}>
                <AlertTriangle />
                Conferma
              </Button>
            </LoadingButtons>
          </div>
        </div>
      )}
    </Modal>
  );
});

const deleteConfirmStorageKey = "delete-confirm";

const DeleteModal = forwardRef(function DeleteModal(
  { studentName }: { studentName: string },
  ref: Ref<HTMLDialogElement> | null,
) {
  const [checked, setChecked] = useState(sessionStorage.getItem(deleteConfirmStorageKey) === "1");

  const confirm = () => {
    if (ref && "current" in ref && ref.current) {
      ref.current.returnValue = "1";
      ref.current.close();
    }
  };

  return (
    <Modal ref={ref} title="Cancella studente">
      <div className="prose break-words">
        <p>
          Stai per cancellare{" "}
          {studentName ? (
            <>
              lo studente <b>{studentName}</b>
            </>
          ) : (
            <>uno studente</>
          )}
          . Puoi vedere gli studenti cancellati e annullarne la cancellazione cliccando sulla
          testata della colonna &ldquo;<i>Cancella</i>&rdquo; e scegliendo &ldquo;
          <i>Seleziona tutti</i>&rdquo; come filtro.
        </p>
        <div className="form-control mb-2">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox"
              checked={checked}
              onChange={(e) => {
                setChecked(e.target.checked);
                sessionStorage.setItem(deleteConfirmStorageKey, String(+e.target.checked));
              }}
            />
            <span className="label-text">Non mostrarmi più questo pop-up</span>
          </label>
        </div>
        <div className="flex justify-center gap-5">
          <Button className="btn-info">Annulla</Button>
          <Button className="btn-warning" onClick={() => confirm()}>
            Continua
          </Button>
        </div>
      </div>
    </Modal>
  );
});

function Table() {
  const { contest, participation, variants } = useTeacher();
  const [students, setStudent] = useTeacherStudents();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [currentStudent, setCurrentStudent] = useState("");

  const endTime =
    participation.startingTime && contest.duration
      ? addMinutes(participation.startingTime, contest.duration)
      : undefined;
  const isContestFinished = useIsAfter(endTime);
  const editable = (!contest.hasOnline || isContestFinished) && !participation.finalized;

  const newStudentId = useRef(randomId());
  const setStudentAndUpdateId = async (student: Student) => {
    newStudentId.current = randomId();
    await setStudent(student);
  };

  const allStudents = [...students];
  if (editable) {
    allStudents.push({
      id: newStudentId.current,
      contestId: contest.id,
      participationId: participation.id,
      variant: contest.hasVariants ? undefined : Object.keys(variants)[0],
      createdAt: new Date(),
      answers: {},
      disabled: false,
    } as Student);
  }

  const colDefs = useMemo(
    () => columnDefinition(contest, variants, editable),
    [contest, variants, editable],
  );

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let student = ev.data as Student;
    const name = [student.personalInformation?.surname, student.personalInformation?.name]
      .filter(Boolean)
      .join(" ");
    setCurrentStudent(name);

    let value = ev.newValue;
    const [field, subfield] = ev.colDef.field!.split(/[.[\]]/);
    if (field === "personalInformation") {
      const schema = contest.personalInformation.find((f) => f.name === subfield);
      [value] = parsePersonalInformation(value, schema);
    }
    if (field === "variant" && !variants[value]) {
      value = undefined;
    }
    if (field === "answers") {
      if (isString(value)) {
        value = value!.trim().toUpperCase();
      }

      const schema = variants[student.variant!]?.schema[subfield];
      if (!schema?.blankOptions?.includes(value)) {
        if (schema.type === "number" || schema.type === "points") value = Number(value);

        let isValid = true;
        isValid &&= schema?.options?.includes(value) ?? true;
        if (schema.type === "number" || schema.type === "points") {
          isValid &&= Number.isInteger(value);
        }
        if (schema.type === "points" && schema.pointsCorrect) {
          isValid &&= 0 <= value && value <= schema.pointsCorrect;
        }

        if (!isValid) value = undefined;
      }
    }
    if (field === "disabled" && value) {
      const modal = modalRef.current!;
      if (sessionStorage.getItem(deleteConfirmStorageKey) !== "1") {
        ev.api.refreshCells();

        modal.returnValue = "0";
        modal.showModal();
        // eslint-disable-next-line unicorn/prefer-add-event-listener
        await new Promise<void>((resolve) => (modal.onclose = () => resolve()));
        value = modal.returnValue === "1";
      }
    }

    student = cloneDeep(student);
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
        localeText={agGridLocaleIT}
        onGridReady={(ev) => {
          ev.api.setFilterModel({
            disabled: {
              filterType: "text",
              type: "false",
            },
          });
        }}
      />
      <DeleteModal studentName={currentStudent} ref={modalRef} />
    </div>
  );
}

function columnDefinition(
  contest: Contest,
  variants: Record<string, Variant>,
  editable: boolean,
): ColDef[] {
  const widths = {
    xs: 100,
    sm: 125,
    md: 150,
    lg: 200,
    xl: 250,
  };

  const defaultOptions: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    editable,
  };

  return [
    ...contest.personalInformation.map(
      (field, i): ColDef => ({
        field: `personalInformation.${field.name}`,
        headerName: field.label,
        pinned: field.pinned,
        cellDataType: field.type,
        width: widths[field.size ?? "md"],
        equals: field.type === "date" ? isEqualDate : undefined,
        ...defaultOptions,
        tooltipValueGetter: ({ data }: ITooltipParams<Student>) => {
          return isStudentIncomplete(data!, contest, variants);
        },
        cellRenderer: ({ api, data, value }: ICellRendererParams<Student>) => {
          if (field.type === "date" && value) {
            return formatDate(value, { style: "short" });
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
                <AlertTriangle className="mb-1 inline-block cursor-text text-warning" size={16} />
              </span>
            );
          }
          return value;
        },
      }),
    ),
    ...compact([
      contest.hasVariants && {
        field: "variant",
        headerName: "Variante",
        width: 100,
        ...defaultOptions,
      },
      (contest.hasVariants || contest.hasOnline) && {
        headerName: "Vedi Prova",
        width: 100,
        cellRenderer: ({ data }: ICellRendererParams<Student>) =>
          data?.variant && (
            <a
              className="link link-info"
              href={`/teacher/test/?studentId=${data!.id}#${data!.contestId}`}
              target="_blank"
              rel="noreferrer">
              apri
            </a>
          ),
        sortable: false,
      },
    ]),
    ...contest.problemIds.map(
      (id, i): ColDef => ({
        field: `answers[${id}]`,
        headerName: id,
        width: 50 + (i % 4 === 3 ? 15 : 0),
        valueGetter: ({ data }) => data.answers?.[id],
        tooltipValueGetter: ({ data }) => data.answers?.[id],
        ...defaultOptions,
        sortable: false,
        filter: false,
      }),
    ),
    {
      headerName: "Punti",
      pinned: "right",
      width: 100,
      valueGetter: ({ data }) => (isStudentEmpty(data) ? "" : score(data, variants)),
      ...defaultOptions,
      editable: false,
    },
    {
      field: "disabled",
      headerName: "Cancella",
      cellDataType: "boolean",
      width: 120,
      valueGetter: ({ data }) => data.disabled ?? false,
      ...defaultOptions,
      sortable: false,
    },
  ];
}

function isStudentIncomplete(
  student: Student,
  contest: Contest,
  variants: Record<string, Variant>,
) {
  if (isStudentEmpty(student)) return;
  if (student.disabled) return;

  for (const field of contest.personalInformation) {
    if (!student.personalInformation?.[field.name]) {
      return `${field.label} mancante`;
    }
  }

  if (contest.hasVariants) {
    if (!student.variant) return "Variante mancante";
    if (!(student.variant in variants)) return `La variante ${student.variant} non è valida`;
  }
  const variant = variants[student.variant!] ?? Object.values(variants)[0];

  for (const id of Object.keys(variant.schema)) {
    if (student.answers?.[id] === undefined) {
      return `Domanda ${id} mancante`;
    }
  }
}

function isStudentEmpty(student: Student) {
  return (
    !Object.values(student.personalInformation ?? {}).some(Boolean) &&
    !Object.values(student.answers ?? {}).some(Boolean)
  );
}
