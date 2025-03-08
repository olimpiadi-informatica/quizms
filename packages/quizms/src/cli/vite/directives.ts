import type { Node } from "acorn";
import { isString } from "lodash-es";
import MagicString from "magic-string";
import preserveDirectives from "rollup-preserve-directives";
import type { PluginOption } from "vite";

export default function directives(): PluginOption[] {
  // vite glob imports add some imports to the top of the files without
  // preserving directives, so we need to move them manually to the top
  const fixDirectives: PluginOption = {
    name: "quizms:directives",
    enforce: "post",
    transform(code) {
      if (code.includes("use client")) {
        const ast = this.parse(code);
        const body = ast.body;
        const s = new MagicString(code);
        for (const stm of body) {
          if (stm.type !== "ExpressionStatement" || "directive" in stm) continue;

          const expr = stm.expression;
          if (expr.type === "Literal" && isString(expr.value) && /^use \w+$/.test(expr.value)) {
            const node = stm as unknown as Node;
            s.move(node.start, node.end, 0);
          }
        }

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ hires: true }),
          };
        }
      }
    },
  };

  // the order matter!
  return [fixDirectives, preserveDirectives()];
}
