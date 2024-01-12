import { CustomBlock } from "./custom-block";

export const ioBlocks: CustomBlock[] = [
  {
    type: "start",
    message0: "inizia qui",
    nextStatement: null,
    colour: 20,
    tooltip: "L'esecuzione inizia da qui",
    helpUrl: "",
    maxInstances: 1,
    js: "",
  },
  {
    type: "exit",
    message0: "termina",
    previousStatement: null,
    colour: 20,
    tooltip: "L'esecuzione termina qui",
    helpUrl: "",
    js: "exit();\n",
  },
  {
    type: "read_int",
    message0: "leggi un numero",
    output: "Number",
    colour: 65,
    tooltip: "Leggi un numero intero dall'input",
    helpUrl: "",
    js: ["input.readInt()", "ORDER_FUNCTION_CALL"],
  },
  {
    type: "read_array_int",
    message0: "leggi una lista di lunghezza %1",
    args0: [
      {
        type: "input_value",
        name: "LENGTH",
        check: "Number",
      },
    ],
    output: "Array",
    colour: 65,
    tooltip: "Leggi una lista di numeri interi dall'input",
    helpUrl: "",
    js: ["input.readArrayInt(%0)", "ORDER_FUNCTION_CALL"],
  },
  {
    type: "write_any",
    message0: "stampa %1",
    args0: [
      {
        type: "input_value",
        name: "VAL",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 65,
    tooltip: "Stampa un valore",
    helpUrl: "",
    js: "output.writeAny(%0);\n",
  },
];
