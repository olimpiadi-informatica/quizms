import type { ToolboxInfo } from "blockly/core/utils/toolbox";

const defaultToolbox: ToolboxInfo = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Variabili",
      categorystyle: "variable_category",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "Matematica",
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
          type: "math_on_list",
          extraState: '<mutation op="SUM"></mutation>',
          fields: { OP: "SUM" },
        },
        {
          kind: "block",
          type: "math_modulo",
        },
        {
          kind: "block",
          type: "math_number_property",
          extraState: '<mutation divisor_input="false"></mutation>',
          fields: { PROPERTY: "EVEN" },
        },
      ],
    },
    {
      kind: "category",
      name: "Logica",
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
          type: "logic_boolean",
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
      name: "Cicli",
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
      name: "Liste",
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
          type: "lists_isEmpty",
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
};

export default defaultToolbox;
