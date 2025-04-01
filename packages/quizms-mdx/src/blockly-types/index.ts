import type { ToolboxInfo } from "blockly/core/utils/toolbox";

export type BlocklyType = number | string | boolean | undefined;

export type Context = {
  exit: (success: boolean, msg: string) => never;
  pause: () => Promise<void>;
};

export type CustomBlock<State> = {
  type: string;
  message0: string;
  previousStatement?: null;
  nextStatement?: null;
  colour: number;
  tooltip: string;
  maxInstances?: number;
  fn: (ctx: Context, state: State, ...args: any[]) => Promise<BlocklyType> | BlocklyType | void;
};

export type BlocklyTypeLiteral = "Number" | "String" | "Array" | "Boolean";

export type CustomBlockArg =
  | {
      type: "input_value";
      name: string;
      check: BlocklyTypeLiteral;
    }
  | {
      type: "field_dropdown";
      name: string;
      options: [string, string][];
    };

export type CustomBlockProcessed = CustomBlock<any> & {
  args0: CustomBlockArg[];
  output?: BlocklyTypeLiteral;
  js: string | [string, number];
  inputsInline: boolean;
  helpUrl: string;
};

export type VisualizerProps<State> = {
  state: State;
  variables: object;
  testcase: number;
  message?: string;
};

export type IframeToWorkspaceMessage =
  | { cmd: "init" }
  | { cmd: "ready" }
  | { cmd: "blocks"; blocks: object }
  | { cmd: "code"; code: string }
  | { cmd: "variables"; variableMappings: object }
  | { cmd: "svg"; svg: string }
  | { cmd: "error"; message: string };

export type WorkspaceToIframeMessage =
  | {
      cmd: "init";
      readonly: boolean;
      toolbox: ToolboxInfo;
      initialBlocks: object;
      customBlocks: CustomBlock<any>[];
    }
  | { cmd: "highlight"; highlightedBlock: string | undefined }
  | { cmd: "ready" }
  | { cmd: "error"; message: string };

export type TestcaseResult = { success: boolean; message: string };

export const __dummy = true;
