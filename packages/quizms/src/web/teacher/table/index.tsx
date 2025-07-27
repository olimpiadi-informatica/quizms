import { type ComponentType, lazy, Suspense, useMemo, useRef, useState } from "react";

import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { type _t, Trans, useLingui } from "@lingui/react/macro";
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
import { cloneDeep, omit, setWith, sumBy, toPath } from "lodash-es";
import { Download, FileCheck, Trash2, TriangleAlert, Upload, Users } from "lucide-react";

import {
  type Contest,
  calcScore,
  formatUserData,
  parseAnswer,
  parseUserData,
  type Student,
  type Variant,
} from "~/models";
import { randomId } from "~/utils/random";
import { Loading } from "~/web/components";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

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
            <div className="hidden md:block">
              <Trans>students</Trans>
            </div>
          </div>
        </Suspense>
        {contest.allowStudentImport && !participation.finalized && (
          <Button
            className="btn-primary btn-sm h-10"
            icon={Upload}
            onClick={() => importRef.current?.showModal()}>
            <div className="hidden md:block">
              <Trans>Import students</Trans>
            </div>
          </Button>
        )}
        <Button
          className="btn-primary btn-sm h-10"
          icon={Download}
          onClick={() => exportRef.current?.click()}>
          <div className="hidden md:block">
            <Trans>Export</Trans>
          </div>
        </Button>
        {!participation.finalized && (
          <Button
            className="btn-primary btn-sm h-10"
            icon={FileCheck}
            onClick={() => finalizeRef.current?.showModal()}>
            <div className="hidden md:block">
              <Trans>Finalize</Trans>
            </div>
          </Button>
        )}
        <FinalizeModal key={participation.id} ref={finalizeRef} />
        {contest.allowStudentDelete && !participation.finalized && (
          <Button
            className="btn-primary btn-sm h-10"
            icon={Trash2}
            onClick={() => deleterRef.current?.showModal()}>
            <div className="hidden md:block">
              <Trans>Empty</Trans>
            </div>
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
  const { t } = useLingui();

  return sumBy(students, (s) => {
    return Number(!s.disabled && !isStudentIncomplete(s, contest, variants, t));
  });
}

function Table() {
  const { contest, participation, variants } = useTeacher();
  const [students, setStudent] = useTeacherStudents();
  const { t, i18n } = useLingui();

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
    () => columnDefinition(contest, variants, isContestFinished, t),
    [contest, variants, isContestFinished, t],
  );

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let student = ev.data as Student;
    const name = [student.userData?.surname, student.userData?.name].filter(Boolean).join(" ");
    setCurrentStudent(name);

    let value = ev.newValue;
    const [field, subfield] = toPath(ev.colDef.field!);
    if (field === "userData") {
      const schema = contest.userData.find((f) => f.name === subfield);
      value = parseUserData(value, schema!, i18n);
    }
    if (field === "variant" && value && !variants[value]) {
      throw new Error(t`Variant ${value} is not valid`);
    }
    if (field === "answers") {
      const schema = variants[student.variant!]?.schema;
      if (!schema) {
        throw new Error(t`Missing variant`);
      }
      value = parseAnswer(value, schema[subfield], t);
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
      setWith(student, ev.colDef.field!, value, Object);
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
  t: typeof _t,
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
          return isStudentIncomplete(data!, contest, variants, t);
        },
        cellRenderer: ({ api, data, value }: ICellRendererParams<Student>) => {
          value = formatUserData(data, field, i18n.locale);
          if (
            field.pinned &&
            data?.updatedAt &&
            !api.getSelectedRows().some((s: Student) => s.id === data.id) &&
            isStudentIncomplete(data, contest, variants, t)
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
      headerName: t(msg`Variant`),
      width: 100,
      editable: true,
      ...defaultOptions,
      hide: !contest.hasVariants,
    },
    {
      headerName: t(msg`View Test`),
      width: 100,
      cellRenderer: ({ data }: ICellRendererParams<Student>) => {
        if (data?.absent || data?.disabled || !data?.variant) return;
        return (
          <a
            className="link link-info"
            href={`${window.location.pathname}${data.id}/`}
            target="_blank"
            rel="noreferrer">
            <Trans>open</Trans>
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
      headerName: t(msg`Score`),
      pinned: "right",
      width: 100,
      ...defaultOptions,
      hide: !isContestFinished,
    },
    {
      field: "absent",
      headerName: t(msg`Absent`),
      cellDataType: "boolean",
      width: 120,
      valueGetter: ({ data }) => data.absent ?? false,
      editable: true,
      ...defaultOptions,
      sortable: false,
      hide: !contest.allowAnswerEdit,
      filterParams: {
        filterOptions: [
          {
            displayKey: "all",
            displayName: t(msg`Select all`),
            predicate: () => true,
            numberOfInputs: 0,
          },
          {
            displayKey: "absent",
            displayName: t(msg`Absent`),
            predicate: (_filter: any[], absent: boolean) => absent,
            numberOfInputs: 0,
          },
          {
            displayKey: "present",
            displayName: t(msg`Present`),
            predicate: (_filter: any[], absent: boolean) => !absent,
            numberOfInputs: 0,
          },
        ] as IFilterOptionDef[],
      },
    },
    {
      field: "disabled",
      headerName: t(msg`Delete`),
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
            displayName: t(msg`Select all`),
            predicate: () => true,
            numberOfInputs: 0,
          },
          {
            displayKey: "disabled",
            displayName: t(msg`Deleted`),
            predicate: (_filter: any[], disabled: boolean) => disabled,
            numberOfInputs: 0,
          },
          {
            displayKey: "enabled",
            displayName: t(msg`Not deleted`),
            predicate: (_filter: any[], disabled: boolean) => !disabled,
            numberOfInputs: 0,
          },
        ] as IFilterOptionDef[],
      },
    },
  ];
}
