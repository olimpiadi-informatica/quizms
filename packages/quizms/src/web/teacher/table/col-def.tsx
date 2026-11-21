import { msg } from "@lingui/core/macro";
import type {
  ColDef,
  ICellEditorParams,
  ICellRendererParams,
  IFilterOptionDef,
  ITooltipParams,
} from "ag-grid-community";
import { isEqual as isEqualDate } from "date-fns";
import { TriangleAlert } from "lucide-react";

import type { I18n } from "~/i18n";
import {
  type Contest,
  displayAnswer,
  formatUserData,
  localize,
  parseAnswer,
  parseUserData,
  type Student,
  type Variant,
  validateAnswerValue,
  validateUserData,
} from "~/models";

import { isStudentIncomplete } from "./utils";

export function columnDefinition(
  contest: Contest,
  variants: Record<string, Variant>,
  canViewScore: boolean,
  frozen: boolean,
  i18n: I18n,
  /** Language of the texts of the configuration (see `useContentLanguage`) */
  language: string | undefined,
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
        headerName: localize(field.label, language),
        pinned: field.pinned,
        cellDataType: field.type,
        width: widths[field.size ?? "md"],
        equals: field.type === "date" ? isEqualDate : undefined,
        editable: contest.allowStudentEdit && !frozen,
        ...defaultOptions,
        tooltipValueGetter: ({ data }: ITooltipParams<Student>) => {
          return isStudentIncomplete(data!, contest, variants, i18n, language);
        },
        cellRenderer: ({ api, data, value }: ICellRendererParams<Student>) => {
          value = formatUserData(data, field);
          if (
            field.pinned &&
            data?.updatedAt &&
            !api.getSelectedRows().some((s: Student) => s.id === data.id) &&
            isStudentIncomplete(data, contest, variants, i18n, language)
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
          getValidationErrors: (params) => validateUserData(params.value, field, language, i18n),
        } satisfies Partial<ICellEditorParams<Student>>,
      }),
    ),
    {
      field: "variant",
      headerName: i18n._(msg`Variant`),
      width: 100,
      editable: !frozen,
      ...defaultOptions,
      hide: !contest.hasVariants,
      cellEditorParams: {
        getValidationErrors: (params) => {
          if (params.value && !variants[params.value]) {
            return [i18n._(msg`Invalid variant`)];
          }
          return null;
        },
      } satisfies Partial<ICellEditorParams<Student>>,
    },
    {
      headerName: i18n._(msg`View test`),
      width: 100,
      cellRenderer: ({ data }: ICellRendererParams<Student>) => {
        if (data?.absent || data?.disabled || !data?.variantId) return;
        return (
          <a
            className="link link-info"
            href={`./students/${data.id}`}
            target="_blank"
            rel="noreferrer">
            {i18n._(msg`open`)}
          </a>
        );
      },
      sortable: false,
      hide: !contest.onlineSettings,
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
          return displayAnswer(data.answers[id]);
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
            const schema = variants[params.cellEditorParams.data.variantId!].schema;
            return validateAnswerValue(params.value, schema[id], i18n);
          },
        } satisfies Partial<ICellEditorParams<Student>>,
      };
    }),
    {
      field: "score",
      headerName: i18n._(msg`Points`),
      pinned: "right",
      width: 100,
      ...defaultOptions,
      hide: !canViewScore,
    },
    {
      field: "absent",
      headerName: i18n._(msg`Absent`),
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
            displayName: i18n._(msg`Select all`),
            predicate: () => true,
            numberOfInputs: 0,
          },
          {
            displayKey: "absent",
            displayName: i18n._(msg`Absent students`),
            predicate: (_filter: any[], absent: boolean) => absent,
            numberOfInputs: 0,
          },
          {
            displayKey: "present",
            displayName: i18n._(msg`Present students`),
            predicate: (_filter: any[], absent: boolean) => !absent,
            numberOfInputs: 0,
          },
        ] as IFilterOptionDef[],
      },
    },
    {
      field: "disabled",
      headerName: i18n._(msg`Delete`),
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
            displayName: i18n._(msg`Select all`),
            predicate: () => true,
            numberOfInputs: 0,
          },
          {
            displayKey: "disabled",
            displayName: i18n._(msg`Deleted students`),
            predicate: (_filter: any[], disabled: boolean) => disabled,
            numberOfInputs: 0,
          },
          {
            displayKey: "enabled",
            displayName: i18n._(msg`Students not deleted`),
            predicate: (_filter: any[], disabled: boolean) => !disabled,
            numberOfInputs: 0,
          },
        ] as IFilterOptionDef[],
      },
    },
  ];
}
