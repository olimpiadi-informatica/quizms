import { type ComponentType, Suspense, lazy, useMemo, useRef, useState } from "react";

import { Button, useIsAfter } from "@olinfo/react-components";
import type {
  CellEditRequestEvent,
  ColDef,
  ICellRendererParams,
  IFilterOptionDef,
  ITooltipParams,
} from "ag-grid-community";
import type { AgGridReactProps } from "ag-grid-react";
import { addMinutes, isEqual as isEqualDate } from "date-fns";
import { cloneDeep, omit, set, sumBy, toPath } from "lodash-es";
import { Download, FileCheck, Trash2, TriangleAlert, Upload, Users } from "lucide-react";

import {
  type Contest,
  type Student,
  type Variant,
  calcScore,
  formatUserData,
  parseAnswer,
  parseUserData,
} from "~/models";
import { randomId } from "~/utils/random";
import { Loading } from "~/web/components";
import { useTeacher, useTeacherStudents } from "~/web/teacher/provider";

import { DeleteModal } from "./delete";
import { DeleteAllModal } from "./delete-all";
import { ExportModal } from "./export";
import { FinalizeModal } from "./finalize";
import { ImportModal } from "./importer";
import { deleteConfirmStorageKey, isStudentIncomplete } from "./utils";

const AgGridReact: ComponentType<AgGridReactProps> = lazy(() => import("~/web/components/ag-grid"));

export default function TeacherTable() {
  const { contest, participation } = useTeacher();
  const importRef = useRef<HTMLDialogElement>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const finalizeRef = useRef<HTMLDialogElement>(null);
  const deleterRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className="mb-3 flex flex-none justify-start gap-2">
        <Suspense>
          <div className="flex h-10 items-center gap-2 rounded-btn bg-primary px-3 text-primary-content">
            <Users />
            <Counter />
            <div className="hidden md:block"> studenti</div>
          </div>
        </Suspense>
        {contest.allowStudentImport && !participation.finalized && (
          <Button
            className="btn-primary btn-sm h-10"
            icon={Upload}
            onClick={() => importRef.current?.showModal()}>
            <div className="hidden md:block">Importa studenti</div>
          </Button>
        )}
        <Button
          className="btn-primary btn-sm h-10"
          icon={Download}
          onClick={() => exportRef.current?.click()}>
          <div className="hidden md:block">Esporta</div>
        </Button>
        {!participation.finalized && (
          <Button
            className="btn-primary btn-sm h-10"
            icon={FileCheck}
            onClick={() => finalizeRef.current?.showModal()}>
            <div className="hidden md:block">Finalizza</div>
          </Button>
        )}
        <FinalizeModal key={participation.id} ref={finalizeRef} />
        {!participation.finalized && (
          <Button
            className="btn-primary btn-sm h-10"
            icon={Trash2}
            onClick={() => deleterRef.current?.showModal()}>
            <div className="hidden md:block">Svuota</div>
          </Button>
        )}
      </div>
      <Suspense fallback={<Loading />}>
        <Table key={participation.id} />
        <ImportModal ref={importRef} />
        <ExportModal ref={exportRef} />
        <DeleteAllModal ref={deleterRef} />
      </Suspense>
    </>
  );
}

function Counter() {
  const { contest, variants } = useTeacher();
  const [students] = useTeacherStudents();

  return sumBy(students, (s) => {
    return Number(!s.disabled && !isStudentIncomplete(s, contest, variants));
  });
}

function Table() {
  const { contest, participation, variants } = useTeacher();
  const [students, setStudent] = useTeacherStudents();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [currentStudent, setCurrentStudent] = useState("");

  const endTime =
    participation.startingTime && contest.hasOnline
      ? addMinutes(participation.startingTime, contest.duration)
      : undefined;
  const isContestFinished = useIsAfter(endTime) ?? true;
  const frozen = (contest.hasOnline && !isContestFinished) || participation.finalized;

  const newStudentId = useRef(randomId());
  const setStudentAndUpdateId = async (student: Student) => {
    newStudentId.current = randomId();
    await setStudent(student);
  };

  const allStudents = [...students];
  if (contest.allowStudentImport && !frozen) {
    allStudents.push({
      id: newStudentId.current,
      contestId: contest.id,
      participationId: participation.id,
      variant: contest.hasVariants ? undefined : Object.keys(variants)[0],
      createdAt: new Date(),
      answers: {},
      absent: false,
      disabled: false,
    } as Student);
  }

  const colDefs = useMemo(
    () => columnDefinition(contest, variants, isContestFinished),
    [contest, variants, isContestFinished],
  );

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let student = ev.data as Student;
    const name = [student.userData?.surname, student.userData?.name].filter(Boolean).join(" ");
    setCurrentStudent(name);

    let value = ev.newValue;
    const [field, subfield] = toPath(ev.colDef.field!);
    if (field === "userData") {
      const schema = contest.userData.find((f) => f.name === subfield);
      value = parseUserData(value, schema!);
    }
    if (field === "variant" && value && !variants[value]) {
      throw new Error(`La variante ${value} non è valida`);
    }
    if (field === "answers") {
      const schema = variants[student.variant!]?.schema;
      if (!schema) {
        throw new Error("Variante mancante");
      }
      value = parseAnswer(value, schema[subfield]);
    }
    if (field === "disabled" && value) {
      const modal = modalRef.current!;
      if (sessionStorage.getItem(deleteConfirmStorageKey) !== "1") {
        ev.api.refreshCells();

        modal.returnValue = "0";
        modal.showModal();
        await new Promise<void>((resolve) => {
          modal.onclose = () => resolve();
        });
        value = modal.returnValue === "1";
      }
    }

    if (value == null) {
      student = omit(student, ev.colDef.field!) as Student;
    } else {
      student = cloneDeep(student);
      set(student, ev.colDef.field!, value);
    }
    student.score = calcScore(student, variants[student.variant!]?.schema);
    await setStudentAndUpdateId(student);

    ev.api.refreshCells({ force: true });
  };

  return (
    <div className="relative grow p-2">
      <div className="absolute inset-0">
        <AgGridReact
          rowData={allStudents}
          getRowId={(row) => (row.data as Student).id}
          columnDefs={colDefs}
          suppressClickEdit={frozen}
          onCellEditRequest={onCellEditRequest}
          onGridReady={(ev) => {
            if (!contest.allowStudentDelete) return;
            ev.api.setFilterModel({
              disabled: {
                filterType: "text",
                type: "enabled",
              },
            });
          }}
        />
      </div>
      <DeleteModal studentName={currentStudent} ref={modalRef} />
    </div>
  );
}

function columnDefinition(
  contest: Contest,
  variants: Record<string, Variant>,
  isContestFinished: boolean,
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
  };

  return [
    ...contest.userData.map(
      (field): ColDef => ({
        field: `userData.${field.name}`,
        headerName: field.label,
        pinned: field.pinned,
        cellDataType: field.type,
        width: widths[field.size ?? "md"],
        equals: field.type === "date" ? isEqualDate : undefined,
        editable: contest.allowStudentEdit,
        ...defaultOptions,
        tooltipValueGetter: ({ data }: ITooltipParams<Student>) => {
          return isStudentIncomplete(data!, contest, variants);
        },
        cellRenderer: ({ api, data, value }: ICellRendererParams<Student>) => {
          value = formatUserData(data, field);
          if (
            field.pinned &&
            data?.updatedAt &&
            !api.getSelectedRows().some((s: Student) => s.id === data.id) &&
            isStudentIncomplete(data, contest, variants)
          ) {
            return (
              <span>
                {value}{" "}
                <TriangleAlert className="mb-1 inline-block cursor-text text-warning" size={16} />
              </span>
            );
          }
          return value;
        },
      }),
    ),
    {
      field: "variant",
      headerName: "Variante",
      width: 100,
      editable: true,
      ...defaultOptions,
      hide: !contest.hasVariants,
    },
    {
      headerName: "Vedi Prova",
      width: 100,
      cellRenderer: ({ data }: ICellRendererParams<Student>) => {
        if (data?.absent || data?.disabled || !data?.variant) return;
        return (
          <a
            className="link link-info"
            href={`${window.location.pathname}${data.id}/`}
            target="_blank"
            rel="noreferrer">
            apri
          </a>
        );
      },
      sortable: false,
      hide: !contest.hasOnline,
    },
    ...contest.problemIds.map((id): ColDef => {
      return {
        field: `answers[${id}]`,
        headerName: id,
        width: 60,
        valueGetter: ({ data }) => {
          if (data.absent || data.disabled) return "";
          if (!(id in (data.answers ?? {}))) return "";
          return data.answers[id] ?? "";
        },
        tooltipValueGetter: ({ data }) => data.answers?.[id],
        editable: ({ data }) => contest.allowAnswerEdit && !data.absent && !data.disabled,
        resizable: true,
      };
    }),
    {
      field: "score",
      headerName: "Punti",
      pinned: "right",
      width: 100,
      ...defaultOptions,
      hide: !isContestFinished,
    },
    {
      field: "absent",
      headerName: "Assente",
      cellDataType: "boolean",
      width: 120,
      valueGetter: ({ data }) => data.absent ?? false,
      editable: true,
      ...defaultOptions,
      sortable: false,
      hide: !contest.hasPdf || !contest.allowAnswerEdit,
      filterParams: {
        filterOptions: [
          {
            displayKey: "all",
            displayName: "Seleziona tutti",
            predicate: () => true,
            numberOfInputs: 0,
          },
          {
            displayKey: "absent",
            displayName: "Assenti",
            predicate: (_filter: any[], absent: boolean) => absent,
            numberOfInputs: 0,
          },
          {
            displayKey: "present",
            displayName: "Presenti",
            predicate: (_filter: any[], absent: boolean) => !absent,
            numberOfInputs: 0,
          },
        ] as IFilterOptionDef[],
      },
    },
    {
      field: "disabled",
      headerName: "Cancella",
      cellDataType: "boolean",
      width: 120,
      valueGetter: ({ data }) => data.disabled ?? false,
      editable: true,
      ...defaultOptions,
      sortable: false,
      hide: !contest.allowStudentDelete,
      filterParams: {
        filterOptions: [
          {
            displayKey: "all",
            displayName: "Seleziona tutti",
            predicate: () => true,
            numberOfInputs: 0,
          },
          {
            displayKey: "disabled",
            displayName: "Cancellati",
            predicate: (_filter: any[], disabled: boolean) => disabled,
            numberOfInputs: 0,
          },
          {
            displayKey: "enabled",
            displayName: "Non cancellati",
            predicate: (_filter: any[], disabled: boolean) => !disabled,
            numberOfInputs: 0,
          },
        ] as IFilterOptionDef[],
      },
    },
  ];
}
