export function Blockly({ testcases }: { testcases: any[] }) {
  return [`"type": "blockly", `, `"numTestcases": ${testcases.length}, `];
}
