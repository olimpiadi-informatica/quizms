import { statementString } from "@olinfo/quizms/utils";
import type { utils } from "blockly/core";

/**
 * The default toolbox, with the category names in the statement language
 * (`undefined`: single-language contest, Italian).
 */
export const defaultToolbox = (language: string | undefined): utils.toolbox.ToolboxInfo => ({
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: statementString(language, "blocklyVariables"),
      categorystyle: "variable_category",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: statementString(language, "blocklyMath"),
      categorystyle: "math_category",
      contents: [
        {
          kind: "block",
          type: "math_number",
          fields: { NUM: 123 },
        },
        {
          kind: "block",
          type: "math_arithmetic",
          fields: {
            OP: "ADD",
          },
        },
        {
          kind: "block",
          type: "math_number_property",
          fields: { PROPERTY: "EVEN" },
        },
        {
          kind: "block",
          type: "math_on_list",
          fields: { OP: "SUM" },
        },
      ],
    },
    {
      kind: "category",
      name: statementString(language, "blocklyLogic"),
      categorystyle: "logic_category",
      contents: [
        {
          kind: "block",
          type: "logic_compare",
        },
        {
          kind: "block",
          type: "logic_operation",
        },
        {
          kind: "block",
          type: "logic_negate",
        },
        {
          kind: "block",
          type: "controls_if",
        },
        {
          kind: "block",
          type: "controls_if",
          extraState: {
            hasElse: "true",
          },
        },
      ],
    },
    {
      kind: "category",
      name: statementString(language, "blocklyLoops"),
      categorystyle: "loop_category",
      contents: [
        {
          kind: "block",
          type: "controls_repeat_ext",
          inputs: {
            TIMES: {
              block: {
                type: "math_number",
                fields: { NUM: 10 },
              },
            },
          },
        },
        {
          kind: "block",
          type: "controls_whileUntil",
        },
        {
          kind: "block",
          type: "controls_for",
          fields: {
            VAR: "i",
          },
          inputs: {
            FROM: {
              block: {
                type: "math_number",
                fields: { NUM: 1 },
              },
            },
            TO: {
              block: {
                type: "math_number",
                fields: { NUM: 10 },
              },
            },
            BY: {
              block: {
                type: "math_number",
                fields: { NUM: 1 },
              },
            },
          },
        },
        {
          kind: "block",
          type: "controls_forEach",
        },
      ],
    },
    {
      kind: "category",
      name: statementString(language, "blocklyLists"),
      categorystyle: "list_category",
      contents: [
        {
          kind: "block",
          type: "lists_create_empty",
        },
        {
          kind: "block",
          type: "lists_repeat",
          inputs: {
            NUM: {
              block: {
                type: "math_number",
                fields: { NUM: 5 },
              },
            },
          },
        },
        {
          kind: "block",
          type: "lists_length",
        },
        {
          kind: "block",
          type: "lists_getIndex",
          fields: {
            MODE: "GET",
            WHERE: "FROM_START",
          },
        },
        {
          kind: "block",
          type: "lists_setIndex",
          fields: {
            MODE: "SET",
            WHERE: "FROM_START",
          },
        },
      ],
    },
  ],
});

export const defaultInitialBlocks = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: "start",
        id: "start",
        x: 30,
        y: 30,
      },
    ],
  },
  variables: [],
};
