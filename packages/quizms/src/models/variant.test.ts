import { describe, expect, it } from "vitest";

import type { Student } from "~/models/student";
import {
  type Answer,
  calcProblemPoints,
  calcScore,
  displayAnswer,
  type Problem,
  parseAnswer,
  type Schema,
  unshuffleAnswer,
  validateAnswerValue,
} from "~/models/variant";

const points = { pointsCorrect: 5, pointsBlank: 1, pointsWrong: 0, originalId: "1" };

const openNumber: Problem<"openNumber"> = { ...points, type: "openNumber", correct: [42, 43] };
const openText: Problem<"openText"> = { ...points, type: "openText", correct: ["ABC"] };
const multipleChoice: Problem<"multipleChoice"> = {
  ...points,
  type: "multipleChoice",
  options: [
    { id: "A", originalId: "C", correct: false },
    { id: "B", originalId: "A", correct: true },
    { id: "C", originalId: "B", correct: false },
  ],
};
const multipleResponse: Problem<"multipleResponse"> = {
  ...points,
  type: "multipleResponse",
  options: [
    { id: "A", originalId: "B", correct: true },
    { id: "B", originalId: "C", correct: false },
    { id: "C", originalId: "A", correct: true },
  ],
};
const blockly: Problem<"blockly"> = { ...points, type: "blockly", numTestcases: 3 };

const blocklyAnswer = (results: boolean[]): Answer<"blockly"> => ({
  type: "blockly",
  value: { results, metadata: {} },
});

describe("calcProblemPoints", () => {
  it("gives blank points when there is no answer", () => {
    for (const problem of [openNumber, openText, multipleChoice, multipleResponse, blockly]) {
      expect(calcProblemPoints(problem)).toBe(points.pointsBlank);
      expect(calcProblemPoints(problem, { type: problem.type } as Answer)).toBe(points.pointsBlank);
    }
  });

  it("gives blank points when the answer type does not match the problem", () => {
    expect(calcProblemPoints(openNumber, { type: "openText", value: "42" })).toBe(
      points.pointsBlank,
    );
  });

  it("scores openNumber against any of the correct values", () => {
    expect(calcProblemPoints(openNumber, { type: "openNumber", value: 42 })).toBe(5);
    expect(calcProblemPoints(openNumber, { type: "openNumber", value: 43 })).toBe(5);
    expect(calcProblemPoints(openNumber, { type: "openNumber", value: 0 })).toBe(0);
  });

  it("scores openText, treating the empty string as blank", () => {
    expect(calcProblemPoints(openText, { type: "openText", value: "ABC" })).toBe(5);
    expect(calcProblemPoints(openText, { type: "openText", value: "abc" })).toBe(0);
    expect(calcProblemPoints(openText, { type: "openText", value: "" })).toBe(1);
  });

  it("scores multipleChoice using the shuffled option ids", () => {
    expect(calcProblemPoints(multipleChoice, { type: "multipleChoice", value: "B" })).toBe(5);
    expect(calcProblemPoints(multipleChoice, { type: "multipleChoice", value: "A" })).toBe(0);
    expect(calcProblemPoints(multipleChoice, { type: "multipleChoice", value: "Z" })).toBe(0);
  });

  it("scores multipleResponse as correct only for the exact set, in any order", () => {
    const mr = (value: string[]): Answer => ({ type: "multipleResponse", value });
    expect(calcProblemPoints(multipleResponse, mr(["A", "C"]))).toBe(5);
    expect(calcProblemPoints(multipleResponse, mr(["C", "A"]))).toBe(5);
    expect(calcProblemPoints(multipleResponse, mr(["A"]))).toBe(0);
    expect(calcProblemPoints(multipleResponse, mr(["A", "B", "C"]))).toBe(0);
    expect(calcProblemPoints(multipleResponse, mr([]))).toBe(1);
  });

  it("sums blockly points per testcase", () => {
    const problem = { ...blockly, pointsWrong: -1 };
    expect(calcProblemPoints(problem, blocklyAnswer([true, true, true]))).toBe(15);
    expect(calcProblemPoints(problem, blocklyAnswer([true, false, true]))).toBe(9);
    expect(calcProblemPoints(problem, blocklyAnswer([]))).toBe(0);
  });
});

describe("calcScore", () => {
  const schema: Schema = { "1": openNumber, "2": multipleChoice, "3": openText };
  const student = (overrides: Partial<Student> = {}): Student => ({
    id: "s",
    answers: {
      "1": { type: "openNumber", value: 42 },
      "2": { type: "multipleChoice", value: "A" },
    },
    ...overrides,
  });

  it("sums the points of every problem in the schema", () => {
    // correct (5) + wrong (0) + blank (1)
    expect(calcScore(student(), schema)).toBe(6);
  });

  it("ignores answers to problems that are not in the schema", () => {
    const s = student({ answers: { "99": { type: "openNumber", value: 1 } } });
    expect(calcScore(s, schema)).toBe(3);
  });

  it("gives blank points when the student has no answers", () => {
    expect(calcScore(student({ answers: undefined }), schema)).toBe(3);
  });

  it("returns undefined for absent or disabled students, or without a schema", () => {
    expect(calcScore(student({ absent: true }), schema)).toBeUndefined();
    expect(calcScore(student({ disabled: true }), schema)).toBeUndefined();
    expect(calcScore(student())).toBeUndefined();
  });
});

describe("parseAnswer", () => {
  it("returns undefined for blank input", () => {
    expect(parseAnswer("", openNumber)).toBeUndefined();
    expect(parseAnswer("   ", openText)).toBeUndefined();
  });

  it("trims and uppercases the answer", () => {
    expect(parseAnswer(" 42 ", openNumber)).toEqual({ type: "openNumber", value: 42 });
    expect(parseAnswer(" abc ", openText)).toEqual({ type: "openText", value: "ABC" });
    expect(parseAnswer("b", multipleChoice)).toEqual({ type: "multipleChoice", value: "B" });
    expect(parseAnswer("ac", multipleResponse)).toEqual({
      type: "multipleResponse",
      value: ["A", "C"],
    });
  });

  it("throws for blockly problems", () => {
    expect(() => parseAnswer("x", blockly)).toThrow("Unsupported problem type");
  });

  it("round-trips through displayAnswer", () => {
    for (const [input, problem] of [
      ["42", openNumber],
      ["ABC", openText],
      ["B", multipleChoice],
      ["AC", multipleResponse],
    ] as const) {
      expect(displayAnswer(parseAnswer(input, problem))).toBe(input);
    }
  });
});

describe("displayAnswer", () => {
  it("returns an empty string for missing answers", () => {
    expect(displayAnswer()).toBe("");
    expect(displayAnswer({ type: "openNumber" })).toBe("");
  });

  it("renders blockly results as check marks", () => {
    expect(displayAnswer(blocklyAnswer([true, false]))).toBe("✅❌");
  });
});

describe("validateAnswerValue", () => {
  it("accepts empty answers", () => {
    expect(validateAnswerValue(undefined, openNumber)).toBeNull();
    expect(validateAnswerValue("", openText)).toBeNull();
  });

  it("requires integers for openNumber", () => {
    expect(validateAnswerValue(3, openNumber)).toBeNull();
    expect(validateAnswerValue(3.5, openNumber)).toHaveLength(1);
    expect(validateAnswerValue(Number.NaN, openNumber)).toHaveLength(1);
  });

  it("limits openText to 256 characters", () => {
    expect(validateAnswerValue("x".repeat(256), openText)).toBeNull();
    expect(validateAnswerValue("x".repeat(257), openText)).toHaveLength(1);
  });

  it("rejects unknown multipleChoice options", () => {
    expect(validateAnswerValue("A", multipleChoice)).toBeNull();
    expect(validateAnswerValue("D", multipleChoice)).toEqual(["Opzione non valida: D"]);
  });

  it("rejects unknown or repeated multipleResponse options", () => {
    expect(validateAnswerValue(["A", "B"], multipleResponse)).toBeNull();
    expect(validateAnswerValue(["A", "X", "Y"], multipleResponse)).toEqual([
      "Opzioni non valide: XY",
    ]);
    expect(validateAnswerValue(["A", "A"], multipleResponse)).toEqual(["Opzioni ripetute: AA"]);
  });
});

describe("unshuffleAnswer", () => {
  it("maps shuffled option ids back to the original ids", () => {
    expect(unshuffleAnswer(multipleChoice, "B")).toBe("A");
    expect(unshuffleAnswer(multipleResponse, ["A", "C"])).toEqual(["B", "A"]);
  });

  it("maps unknown options to the empty string", () => {
    expect(unshuffleAnswer(multipleChoice, "Z")).toBe("");
  });

  it("leaves other problem types unchanged", () => {
    expect(unshuffleAnswer(openNumber, 42)).toBe(42);
    expect(unshuffleAnswer(openText, "ABC")).toBe("ABC");
    const value = { results: [true], metadata: {} };
    expect(unshuffleAnswer(blockly, value)).toBe(value);
  });
});
