import { escape as escapeHtml } from "lodash-es";
import { temporaryWriteSync } from "tempy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import yaml from "yaml";

import { parseRawSchema } from "./parse";

// `fatal` exits the process: make it throw instead, so that the test can observe it.
const fatal = vi.hoisted(() =>
  vi.fn((message: string): never => {
    throw new Error(`fatal: ${message}`);
  }),
);
vi.mock("@olinfo/quizms/utils-node", () => ({ fatal }));
vi.mock("tempy", () => ({ temporaryWriteSync: vi.fn(() => "/tmp/invalid-schema.yaml") }));

beforeEach(() => {
  vi.clearAllMocks();
});

const points = { pointsCorrect: 5, pointsBlank: 1, pointsWrong: 0 };

/** Serializes a raw schema like the one rendered by the schema components. */
const raw = (value: unknown) => JSON.stringify(value);

const problem = (id: number, originalId: number, subProblems: object[]) => ({
  id,
  originalId,
  ...points,
  subProblems,
});

const options = [
  { id: "A", originalId: "B", correct: false },
  { id: "B", originalId: "A", correct: true },
];

describe("parseRawSchema", () => {
  it("uses the problem id when there are no sub-problems", () => {
    const schema = parseRawSchema(
      raw([problem(3, 7, [{ subProblemId: null, type: "openNumber", correct: 42 }])]),
    );
    expect(schema).toEqual({
      "3": { ...points, originalId: "7", type: "openNumber", correct: [42] },
    });
  });

  it("appends the sub-problem id to both id and originalId", () => {
    const schema = parseRawSchema(
      raw([
        problem(2, 5, [
          { subProblemId: 1, type: "openNumber", correct: 1 },
          { subProblemId: 2, type: "openText", correct: "ABC" },
        ]),
      ]),
    );
    expect(Object.keys(schema)).toEqual(["2.1", "2.2"]);
    expect(schema["2.1"].originalId).toBe("5.1");
    expect(schema["2.2"].originalId).toBe("5.2");
  });

  it("copies the points of the problem in every sub-problem", () => {
    const schema = parseRawSchema(
      raw([
        {
          id: 1,
          originalId: 1,
          pointsCorrect: 3,
          pointsBlank: 0,
          pointsWrong: -1,
          subProblems: [
            { subProblemId: 1, type: "openNumber", correct: 1 },
            { subProblemId: 2, type: "openNumber", correct: 2 },
          ],
        },
      ]),
    );
    for (const id of ["1.1", "1.2"]) {
      expect(schema[id]).toMatchObject({ pointsCorrect: 3, pointsBlank: 0, pointsWrong: -1 });
    }
  });

  it("parses every problem type", () => {
    const schema = parseRawSchema(
      raw([
        problem(1, 1, [{ subProblemId: null, type: "openNumber", correct: -3.5 }]),
        problem(2, 2, [{ subProblemId: null, type: "openText", correct: "hello" }]),
        problem(3, 3, [{ subProblemId: null, type: "multipleChoice", options }]),
        problem(4, 4, [{ subProblemId: null, type: "multipleResponse", options }]),
        problem(5, 5, [{ subProblemId: null, type: "blockly", numTestcases: 4 }]),
      ]),
    );
    expect(schema).toEqual({
      "1": { ...points, originalId: "1", type: "openNumber", correct: [-3.5] },
      "2": { ...points, originalId: "2", type: "openText", correct: ["hello"] },
      "3": { ...points, originalId: "3", type: "multipleChoice", options },
      "4": { ...points, originalId: "4", type: "multipleResponse", options },
      "5": { ...points, originalId: "5", type: "blockly", numTestcases: 4 },
    });
  });

  it("does not allow sub-problems in blockly problems", () => {
    expect(() =>
      parseRawSchema(raw([problem(1, 1, [{ subProblemId: 1, type: "blockly", numTestcases: 1 }])])),
    ).toThrow("fatal: Invalid schema");
    expect(fatal).toHaveBeenCalledOnce();
  });

  it("accepts HTML-escaped input", () => {
    const value = [
      problem(1, 1, [{ subProblemId: null, type: "openText", correct: `<a & "b" 'c'>` }]),
    ];
    const escaped = escapeHtml(raw(value));
    expect(escaped).not.toContain('"');
    expect(parseRawSchema(escaped)["1"]).toMatchObject({ correct: [`<a & "b" 'c'>`] });
  });

  it("accepts YAML input and trailing commas", () => {
    // The schema components render a JSON-like list with trailing commas, which is valid YAML.
    const schema = parseRawSchema(
      `[ { "id": 1, "originalId": 1, "pointsCorrect": 5, "pointsBlank": 1, "pointsWrong": 0, "subProblems": [{ "subProblemId": null, "type": "openNumber", "correct": 7, }, ]},]`,
    );
    expect(schema["1"]).toMatchObject({ type: "openNumber", correct: [7] });
  });

  it.each([
    ["an empty schema", []],
    ["a problem without sub-problems", [problem(1, 1, [])]],
    ["an unknown type", [problem(1, 1, [{ subProblemId: null, type: "essay" }])]],
    [
      "an open number with a string answer",
      [problem(1, 1, [{ subProblemId: null, type: "openNumber", correct: "1" }])],
    ],
    [
      "a closed answer without options",
      [problem(1, 1, [{ subProblemId: null, type: "multipleChoice", options: [] }])],
    ],
    [
      "an unknown field",
      [problem(1, 1, [{ subProblemId: null, type: "openText", correct: "a", extra: 1 }])],
    ],
    ["a missing problem id", [{ originalId: 1, ...points, subProblems: [] }]],
  ])("rejects %s", (_, value) => {
    const input = raw(value);
    expect(() => parseRawSchema(input)).toThrow("fatal: Invalid schema");
    expect(fatal).toHaveBeenCalledOnce();
    expect(fatal.mock.calls[0][0]).toContain("Schema written to /tmp/invalid-schema.yaml");
    expect(temporaryWriteSync).toHaveBeenCalledWith(input, { extension: "yaml" });
  });

  it("rejects malformed YAML", () => {
    expect(() => parseRawSchema("[ { ")).toThrow("fatal: Invalid schema");
    expect(fatal).toHaveBeenCalledOnce();
  });

  it("writes the unescaped schema to the temporary file", () => {
    const value = raw([{ id: "x" }]);
    expect(() => parseRawSchema(escapeHtml(value))).toThrow();
    expect(temporaryWriteSync).toHaveBeenCalledWith(value, { extension: "yaml" });
  });

  it("round-trips through YAML", () => {
    // Sanity check of the fixtures: the parser must also accept the YAML serialization.
    const value = [problem(1, 1, [{ subProblemId: null, type: "openNumber", correct: 1 }])];
    expect(parseRawSchema(yaml.stringify(value))).toEqual(parseRawSchema(raw(value)));
  });
});
