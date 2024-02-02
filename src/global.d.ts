declare module "@blockly/disable-top-blocks" {
  export const DisableTopBlocks: any;
}

declare module "js-interpreter" {
  export default class Interpreter {
    constructor(code: string, initFn?: (interpreter: Interpreter, globalObject: any) => void);

    createNativeFunction(fn: (...args: any[]) => any): any;

    nativeToPseudo(value: any): any;

    setProperty(object: any, name: string, value: any): void;

    step(): boolean;

    globalScope: { object: { properties: Record<string, any> } };
  }
}

declare module "react-syntax-highlighter/dist/esm/highlight" {
  import { ComponentType } from "react";
  import { SyntaxHighlighterProps } from "react-syntax-highlighter";

  export default function BasicSyntaxHighlighter(
    astGenerator: any,
    style: any,
  ): ComponentType<SyntaxHighlighterProps>;
}

declare module "*.rules" {
  const path: string;
  export default path;
}

declare module "virtual:*" {
  export default any;
}
