import type {
  ColDef,
  ICellEditorParams,
  ICellRendererParams,
  IFilterOptionDef,
  ITooltipParams,
} from "ag-grid-community";
import { isEqual as isEqualDate } from "date-fns";
import { TriangleAlert } from "lucide-react";

import {
  type Contest,
  displayAnswer,
  formatUserData,
  parseAnswer,
  parseUserData,
  type Student,
  type Variant,
  validateAnswer,
  validateUserData,
} from "~/models";

import { isStudentIncomplete } from "./utils";

export function columnDefinition(
  contest: Contest,
  variants: Record<string, Variant>,
  canViewScore: boolean,
  frozen: boolean,
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
        editable: contest.allowStudentEdit && !frozen,
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
        valueParser: (params) => parseUserData(params.newValue, field),
        cellEditorParams: {
          getValidationErrors: (params) => validateUserData(params.value, field),
        } satisfies Partial<ICellEditorParams<Student>>,
      }),
    ),
    {
      field: "variant",
      headerName: "Variante",
      width: 100,
      editable: !frozen,
      ...defaultOptions,
      hide: !contest.hasVariants,
      cellEditorParams: {
        getValidationErrors: (params) => {
          if (params.value && !variants[params.value]) {
            return ["Variante non è valida"];
          }
          return null;
        },
      } satisfies Partial<ICellEditorParams<Student>>,
    },
    {
      headerName: "Vedi Prova",
      width: 100,
      cellRenderer: ({ data }: ICellRendererParams<Student>) => {
        if (data?.absent || data?.disabled || !data?.variant) return;
        return (
          <a
            className="link link-info"
            href={`./students/${data.id}`}
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
        resizable: true,
        valueGetter: ({ data }) => {
          if (data.absent || data.disabled) return "";
          if (!(id in (data.answers ?? {}))) return "";
          if (variants[data.variant] == null) return "";
          return displayAnswer(data.answers[id], variants[data.variant].schema[id].type) ?? "";
        },
        tooltipValueGetter: ({ data }) => data.answers?.[id],
        editable: ({ data }) =>
          contest.allowAnswerEdit && data.variant && !data.absent && !data.disabled && !frozen,
        valueParser: (params) => {
          const schema = variants[params.data.variant!].schema;
          return parseAnswer(params.newValue, schema[id]);
        },
        cellEditorParams: {
          getValidationErrors: (params) => {
            const schema = variants[params.cellEditorParams.data.variant!].schema;
            return validateAnswer(params.value, schema[id]);
          },
        } satisfies Partial<ICellEditorParams<Student>>,
      };
    }),
    {
      field: "score",
      headerName: "Punti",
      pinned: "right",
      width: 100,
      ...defaultOptions,
      hide: !canViewScore,
    },
    {
      field: "absent",
      headerName: "Assente",
      cellDataType: "boolean",
      width: 120,
      valueGetter: ({ data }) => data.absent ?? false,
      editable: !frozen,
      ...defaultOptions,
      sortable: false,
      hide: !contest.allowAnswerEdit,
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
      editable: !frozen,
      pinned: "right",
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
