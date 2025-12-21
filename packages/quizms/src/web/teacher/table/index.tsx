import { Suspense, useMemo, useRef, useState } from "react";

import { Button, useIsAfter } from "@olinfo/react-components";
import type { CellEditRequestEvent } from "ag-grid-community";
import { addMinutes } from "date-fns";
import { cloneDeep, omit, setWith, sumBy } from "lodash-es";
import { Download, FileCheck, Trash2, Upload, UserCheck } from "lucide-react";

import { calcScore, type Student } from "~/models";
import { randomId } from "~/utils";
import { AgGrid, Loading } from "~/web/components";
import { useTeacher, useTeacherStudents } from "~/web/teacher/context";

import { columnDefinition } from "./col-def";
import { DeleteModal } from "./delete";
import { DeleteAllModal } from "./delete-all";
import { ExportModal } from "./export";
import { FinalizeModal } from "./finalize";
import { ImportModal } from "./importer";
import { canViewScore, deleteConfirmStorageKey, isStudentIncomplete } from "./utils";

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
            <UserCheck />
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
        {contest.allowStudentDelete && !participation.finalized && (
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
    () => columnDefinition(contest, variants, canViewScore(contest, participation), frozen),
    [contest, variants, participation, frozen],
  );

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let student = ev.data as Student;
    const name = [student.userData?.surname, student.userData?.name].filter(Boolean).join(" ");
    setCurrentStudent(name);

    let value = ev.newValue;
    if (ev.colDef.field === "disabled" && value) {
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
        <AgGrid
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
