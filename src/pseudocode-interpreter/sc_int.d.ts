/* tslint:disable */

/* eslint-disable */
/**
 * @param {string} code
 * @param {string} base_code
 * @param {string} fn_name
 * @param {number} id
 * @param {number} indent
 * @param {boolean} emit_html
 * @returns {string}
 */
export function format_snippet(
  code: string,
  base_code: string,
  fn_name: string,
  id: number,
  indent: number,
  emit_html: boolean
): string;

/**
 * @param {string} code
 * @param {number} indent
 * @param {boolean} emit_html
 * @returns {string}
 */
export function format_code(code: string, indent: number, emit_html: boolean): string;

/**
 * @param {string} code
 * @param {string} fn_name
 * @param {BigInt64Array} args
 * @returns {Array<any>}
 */
export function eval_from_js(code: string, fn_name: string, args: BigInt64Array): Array<any>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly format_snippet: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number,
    i: number,
    j: number
  ) => void;
  readonly format_code: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly eval_from_js: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number
  ) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {SyncInitInput} module
 *
 * @returns {InitOutput}
 */
export function initSync(module: SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {InitInput | Promise<InitInput>} module_or_path
 *
 * @returns {Promise<InitOutput>}
 */
export default function init(module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
