import {
  type ComponentType,
  type Ref,
  Suspense,
  forwardRef,
  lazy,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CellEditRequestEvent,
  ColDef,
  ICellRendererParams,
  IFilterOptionDef,
  ITooltipParams,
} from "@ag-grid-community/core";
import { AG_GRID_LOCALE_IT } from "@ag-grid-community/locale";
import type { AgGridReactProps } from "@ag-grid-community/react/dist/types/src/shared/interfaces";
import {
  Button,
  CheckboxField,
  Form,
  FormButton,
  Modal,
  SubmitButton,
  TextField,
  useIsAfter,
} from "@olinfo/react-components";
import { addMinutes, isEqual as isEqualDate } from "date-fns";
import { cloneDeep, deburr, isString, lowerFirst, omit, set, sumBy } from "lodash-es";
import { Download, FileCheck, TriangleAlert, Upload, Users } from "lucide-react";

import {
  type Contest,
  type Student,
  type Variant,
  calcScore,
  formatUserData,
  parseUserData,
} from "~/models";
import { randomId } from "~/utils/random";
import { Loading } from "~/web/components";

import { useTeacher, useTeacherStudents } from "./provider";
import Exporter from "./table-exporter";
import ImportModal from "./table-importer";

import "@ag-grid-community/styles/ag-grid.css";
import "@ag-grid-community/styles/ag-theme-quartz.css";

const AgGridReact: ComponentType<AgGridReactProps> = lazy(() => import("~/web/components/ag-grid"));

export default function TeacherTable() {
  const { contest, participation } = useTeacher();
  const importRef = useRef<HTMLDialogElement>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const finalizeRef = useRef<HTMLDialogElement>(null);

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
        <FinalizeModal key={contest.id} ref={finalizeRef} />
      </div>
      <Suspense fallback={<Loading />}>
        <Table key={participation.id} />
        <ImportModal ref={importRef} />
        <Exporter ref={exportRef} />
      </Suspense>
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

  const error = useMemo(() => {
    const prevStudents = new Set<string>();

    // Generate a list of string that can uniquely identify a student. Multiple
    // strings are generated to prevent possible errors during data entry.
    function normalize(student: Student) {
      const info = student.userData;
      const orderings = [
        ["name", "surname", "classYear", "classSection"],
        ["surname", "name", "classYear", "classSection"],
      ];
      return orderings.map((fields) => {
        return deburr(fields.map((field) => info?.[field] ?? "").join("\n"))
          .toLowerCase()
          .replaceAll(/[^\w\n]/g, "");
      });
    }

    for (const student of students) {
      if (student.disabled) continue;

      const { name, surname } = student.userData ?? {};

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

  const close = () => {
    if (ref && "current" in ref) {
      ref.current?.close();
    }
  };

  const finalize = async () => {
    try {
      await setParticipation({ ...participation, finalized: true });
    } finally {
      close();
    }
  };

  return (
    <Modal ref={ref} title="Finalizza scuola">
      {error ? (
        <div className="prose">
          <p>Non è possibile finalizzare la scuola a causa del seguente errore:</p>
          <p className="flex justify-center rounded-box bg-base-200 px-3 py-2">{error}</p>
          {contest.allowStudentDelete && (
            <p>
              Se questo studente è stato aggiunto per errore e vuoi rimuoverlo, puoi usare il
              pulsante <i>Cancella</i> nell&apos;ultima colonna.
            </p>
          )}
        </div>
      ) : (
        <Form onSubmit={finalize} className="!max-w-full">
          <div className="prose">
            <p>
              <strong className="text-error">Attenzione:</strong> questa operazione è irreversibile.
            </p>
            <p>
              Finalizzando <b>non</b> sarà più possibile{" "}
              {contest.allowStudentImport && (
                <>
                  <b>aggiungere</b> nuovi studenti o{" "}
                </>
              )}
              <b>modificare</b> i dati degli studenti in questa scuola per la gara{" "}
              <i>{contest?.name}</i>.
            </p>
            <p>
              Se hai capito e sei d&apos;accordo, scrivi &ldquo;<i>{correctConfirm}</i>&rdquo;.
            </p>
          </div>
          <TextField field="confirm" label="Conferma" placeholder="tutti gli studenti..." />
          {({ confirm }) => (
            <div className="flex flex-wrap justify-center gap-2">
              <FormButton onClick={close}>Annulla</FormButton>
              <SubmitButton
                className="btn-error"
                icon={TriangleAlert}
                disabled={confirm !== correctConfirm}>
                Conferma
              </SubmitButton>
            </div>
          )}
        </Form>
      )}
    </Modal>
  );
});

const deleteConfirmStorageKey = "delete-confirm";

const DeleteModal = forwardRef(function DeleteModal(
  { studentName }: { studentName: string },
  ref: Ref<HTMLDialogElement> | null,
) {
  const close = (value: string) => {
    if (ref && "current" in ref && ref.current) {
      ref.current.returnValue = value;
      ref.current.close();
    }
  };

  const confirm = ({ notAgain }: { notAgain: boolean }) => {
    sessionStorage.setItem(deleteConfirmStorageKey, notAgain ? "1" : "0");
    close("1");
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
        <Form onSubmit={confirm} className="!max-w-full">
          <CheckboxField field="notAgain" label="Non mostrare più questo pop-up" optional />
          <div className="flex flex-wrap justify-center gap-2">
            <FormButton onClick={() => close("0")}>Annulla</FormButton>
            <SubmitButton className="btn-warning">Continua</SubmitButton>
          </div>
        </Form>
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
    participation.startingTime && contest.hasOnline
      ? addMinutes(participation.startingTime, contest.duration)
      : undefined;
  const isContestFinished = useIsAfter(endTime) || !endTime;
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

  const colDefs = useMemo(() => columnDefinition(contest, variants), [contest, variants]);

  const onCellEditRequest = async (ev: CellEditRequestEvent) => {
    let student = ev.data as Student;
    const name = [student.userData?.surname, student.userData?.name].filter(Boolean).join(" ");
    setCurrentStudent(name);

    let value = ev.newValue;
    const [field, subfield] = ev.colDef.field!.split(/[.[\]]/);
    if (field === "userData") {
      const schema = contest.userData.find((f) => f.name === subfield);
      const [newValue, error] = parseUserData(value, schema);
      if (error) throw new Error(error);
      value = newValue;
    }
    if (field === "variant" && !variants[value]) {
      throw new Error(`La variante ${value} non è valida`);
    }
    if (field === "answers") {
      if (isString(value)) {
        value = value.trim().toUpperCase();
      }
      if (value === "") {
        value = undefined;
      }

      const schema = variants[student.variant!]?.schema[subfield];
      const options = [schema?.optionsCorrect, schema?.optionsBlank, schema?.optionsWrong]
        .filter(Boolean)
        .flat();

      if (value !== undefined && schema && !options.includes(value)) {
        if (schema.type === "text") {
          throw new Error(`La risposta "${value}" non è valida`);
        }

        if (schema.type === "number") {
          value = Number(value);
          if (!Number.isInteger(value)) {
            throw new TypeError("La risposta deve essere un numero intero");
          }
        }

        if (schema.type === "points") {
          value = Number(value);
          if (!Number.isInteger(value)) {
            throw new TypeError("Il punteggio deve essere un numero intero");
          }
          if (schema.pointsCorrect && !(0 <= value && value <= schema.pointsCorrect)) {
            throw new Error(`Il punteggio deve essere compreso tra 0 e ${schema.pointsCorrect}`);
          }
        }
      }
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

    if (value === undefined) {
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
    <div className="ag-theme-quartz-auto-dark relative grow p-2">
      <div className="absolute inset-0">
        <AgGridReact
          rowData={allStudents}
          getRowId={(row) => (row.data as Student).id}
          columnDefs={colDefs}
          singleClickEdit={true}
          suppressClickEdit={frozen}
          readOnlyEdit={true}
          rowSelection="single"
          onCellEditRequest={onCellEditRequest}
          enableBrowserTooltips={true}
          localeText={AG_GRID_LOCALE_IT}
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

function columnDefinition(contest: Contest, variants: Record<string, Variant>): ColDef[] {
  const sampleVariant = Object.values(variants)[0];

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
            !api.getSelectedRows().some((s: Student) => s.id === data?.id) &&
            isStudentIncomplete(data!, contest, variants)
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
    ...contest.problemIds.map((id, i): ColDef => {
      const schema = sampleVariant?.schema[id];
      let width = schema?.type === "number" ? 100 : 50;
      if (i % 4 === 3) width += 15;

      return {
        field: `answers[${id}]`,
        headerName: id,
        width,
        valueGetter: ({ data }) => {
          if (data.absent || data.disabled) return "";
          if (!(id in (data.answers ?? {}))) return "";
          return data.answers[id] ?? schema?.optionsBlank?.[0] ?? "";
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

function isStudentIncomplete(
  student: Student,
  contest: Contest,
  variants: Record<string, Variant>,
) {
  if (isStudentEmpty(student)) return;
  if (student.absent || student.disabled) return;

  for (const field of contest.userData) {
    if (!student.userData?.[field.name]) {
      return `${field.label} mancante`;
    }
  }

  if (contest.hasVariants) {
    if (!student.variant) return "Variante mancante";
    if (!(student.variant in variants)) return `La variante ${student.variant} non è valida`;
  }
  const variant = variants[student.variant!] ?? Object.values(variants)[0];

  for (const id of Object.keys(variant.schema)) {
    if (!(id in (student.answers ?? {}))) {
      return `Domanda ${id} mancante`;
    }
  }
}

function isStudentEmpty(student: Student) {
  return (
    !Object.values(student.userData ?? {}).some((x) => x !== undefined) &&
    !Object.values(student.answers ?? {}).some((x) => x !== undefined)
  );
}
