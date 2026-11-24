import { describe, expect, it } from "vitest";

import { i18n } from "~/i18n";
import type { Student, Variant } from "~/models";
import { makeContest, makeStudent, schema } from "~/web/test-utils";

import { columnDefinition } from "./col-def";

const variants: Record<string, Variant> = {
  "101": {
    id: "101",
    contestId: "demo",
    isOnline: true,
    isPdf: true,
    schema,
  },
};

describe("columnDefinition", () => {
  const contest = makeContest({
    problemIds: ["1", "2", "10", "3"],
    hasVariants: true,
    allowAnswerEdit: true,
  });

  it("defines variantId column with field 'variantId'", () => {
    const cols = columnDefinition(contest, variants, true, false, i18n, "it");
    const variantCol = cols.find((c) => c.field === "variantId");
    expect(variantCol).toBeDefined();

    const getValidationErrors = (variantCol?.cellEditorParams as any)?.getValidationErrors;
    expect(getValidationErrors({ value: "101" })).toBeNull();
    expect(getValidationErrors({ value: "invalid" })).toEqual(["Invalid variant"]);
    expect(getValidationErrors({ value: "" })).toBeNull();

    const valueParser = (variantCol as any)?.valueParser;
    expect(valueParser({ newValue: "101" })).toBe("101");
    expect(valueParser({ newValue: "  101  " })).toBe("101");
    expect(valueParser({ newValue: "" })).toBeUndefined();
    expect(valueParser({ newValue: "   " })).toBeUndefined();
    expect(valueParser({ newValue: undefined })).toBeUndefined();
  });

  describe("problem answer columns", () => {
    it("renders displayAnswer in valueGetter", () => {
      const cols = columnDefinition(contest, variants, true, false, i18n, "it");
      const col10 = cols.find((c) => c.field === "answers[10]");
      expect(col10).toBeDefined();

      const student = makeStudent({
        variantId: "101",
        answers: { "10": { type: "openNumber", value: 42 } },
      });
      const valueGetter = col10?.valueGetter as any;
      expect(valueGetter({ data: student })).toBe("42");

      const studentAbsent = makeStudent({
        variantId: "101",
        absent: true,
        answers: { "10": { type: "openNumber", value: 42 } },
      });
      expect(valueGetter({ data: studentAbsent })).toBe("");

      const studentNoAnswer = makeStudent({
        variantId: "101",
        answers: {},
      });
      expect(valueGetter({ data: studentNoAnswer })).toBe("");
    });

    it("parses answer string to Answer object in valueParser", () => {
      const cols = columnDefinition(contest, variants, true, false, i18n, "it");

      const col10 = cols.find((c) => c.field === "answers[10]");
      const valueParser10 = col10?.valueParser as any;
      expect(
        valueParser10({
          newValue: "42",
          data: { variantId: "101" },
        }),
      ).toEqual({ type: "openNumber", value: 42 });

      const col1 = cols.find((c) => c.field === "answers[1]");
      const valueParser1 = col1?.valueParser as any;
      expect(
        valueParser1({
          newValue: "a",
          data: { variantId: "101" },
        }),
      ).toEqual({ type: "multipleChoice", value: "A" });

      const col2 = cols.find((c) => c.field === "answers[2]");
      const valueParser2 = col2?.valueParser as any;
      expect(
        valueParser2({
          newValue: "ac",
          data: { variantId: "101" },
        }),
      ).toEqual({ type: "multipleResponse", value: ["A", "C"] });

      expect(
        valueParser10({
          newValue: "",
          data: { variantId: "101" },
        }),
      ).toBeUndefined();
    });

    describe("cellEditorParams.getValidationErrors", () => {
      it("validates openNumber correctly without flagging valid numbers as invalid", () => {
        const cols = columnDefinition(contest, variants, true, false, i18n, "it");
        const col10 = cols.find((c) => c.field === "answers[10]");
        const getValidationErrors = (col10?.cellEditorParams as any)?.getValidationErrors;
        const cellParams = { cellEditorParams: { data: { variantId: "101" } as Student } };

        // Valid integer strings should return null (no validation error, not red)
        expect(getValidationErrors({ value: "42", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: " 42 ", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "-10", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: undefined, ...cellParams })).toBeNull();

        // When valueParser has already parsed the value into an Answer object (AG Grid runtime)
        expect(
          getValidationErrors({
            value: { type: "openNumber", value: 42 },
            ...cellParams,
          }),
        ).toBeNull();
        expect(
          getValidationErrors({
            value: { type: "openNumber", value: Number.NaN },
            ...cellParams,
          }),
        ).toEqual(["The answer must be an integer"]);

        // Non-integers or invalid number strings should return errors
        expect(getValidationErrors({ value: "abc", ...cellParams })).toEqual([
          "The answer must be an integer",
        ]);
        expect(getValidationErrors({ value: "3.14", ...cellParams })).toEqual([
          "The answer must be an integer",
        ]);
      });

      it("validates multipleChoice correctly", () => {
        const cols = columnDefinition(contest, variants, true, false, i18n, "it");
        const col1 = cols.find((c) => c.field === "answers[1]");
        const getValidationErrors = (col1?.cellEditorParams as any)?.getValidationErrors;
        const cellParams = { cellEditorParams: { data: { variantId: "101" } as Student } };

        // Valid options (strings)
        expect(getValidationErrors({ value: "A", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "a", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "B", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "", ...cellParams })).toBeNull();

        // When valueParser has already parsed into an Answer object (AG Grid runtime)
        expect(
          getValidationErrors({
            value: { type: "multipleChoice", value: "A" },
            ...cellParams,
          }),
        ).toBeNull();
        expect(
          getValidationErrors({
            value: { type: "multipleChoice", value: "a" },
            ...cellParams,
          }),
        ).toBeNull();
        expect(
          getValidationErrors({
            value: { type: "multipleChoice", value: "Z" },
            ...cellParams,
          }),
        ).toEqual(["Invalid option: Z"]);

        // Invalid option
        expect(getValidationErrors({ value: "Z", ...cellParams })).toEqual(["Invalid option: Z"]);
      });

      it("validates multipleResponse correctly", () => {
        const cols = columnDefinition(contest, variants, true, false, i18n, "it");
        const col2 = cols.find((c) => c.field === "answers[2]");
        const getValidationErrors = (col2?.cellEditorParams as any)?.getValidationErrors;
        const cellParams = { cellEditorParams: { data: { variantId: "101" } as Student } };

        // Valid responses (options are A, B, C)
        expect(getValidationErrors({ value: "AC", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "ac", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "A", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "", ...cellParams })).toBeNull();

        // When valueParser has already parsed into an Answer object (AG Grid runtime)
        expect(
          getValidationErrors({
            value: { type: "multipleResponse", value: ["A", "C"] },
            ...cellParams,
          }),
        ).toBeNull();
        expect(
          getValidationErrors({
            value: { type: "multipleResponse", value: ["a", "c"] },
            ...cellParams,
          }),
        ).toBeNull();
        expect(
          getValidationErrors({
            value: { type: "multipleResponse", value: ["A", "A"] },
            ...cellParams,
          }),
        ).toEqual(["Repeated options: AA"]);
        expect(
          getValidationErrors({
            value: { type: "multipleResponse", value: ["A", "X"] },
            ...cellParams,
          }),
        ).toEqual(["Invalid options: X"]);

        // Repeated options
        expect(getValidationErrors({ value: "AA", ...cellParams })).toEqual([
          "Repeated options: AA",
        ]);

        // Invalid option
        expect(getValidationErrors({ value: "AX", ...cellParams })).toEqual(["Invalid options: X"]);
      });

      it("falls back to default variant if variantId is not set (e.g. no variants contest)", () => {
        const noVariantsContest = makeContest({
          problemIds: ["10"],
          hasVariants: false,
          allowAnswerEdit: true,
        });
        const cols = columnDefinition(noVariantsContest, variants, true, false, i18n, "it");
        const col10 = cols.find((c) => c.field === "answers[10]");
        const getValidationErrors = (col10?.cellEditorParams as any)?.getValidationErrors;
        const cellParams = { cellEditorParams: { data: {} as Student } };

        expect(getValidationErrors({ value: "42", ...cellParams })).toBeNull();
        expect(getValidationErrors({ value: "abc", ...cellParams })).toEqual([
          "The answer must be an integer",
        ]);
      });
    });
  });

  describe("status column", () => {
    const onlineContest = makeContest({
      ...contest,
      onlineSettings: {
        contestWindow: { start: new Date(0), end: new Date(8.64e15) },
        duration: 60,
        allowRestart: false,
      },
    });
    const hour = 3_600_000;
    const ongoing = () => ({
      start: new Date(Date.now() - hour),
      end: new Date(Date.now() + hour),
    });

    it("is hidden for offline contests", () => {
      const cols = columnDefinition(contest, variants, true, false, i18n, "it");
      expect(cols.find((c) => c.colId === "status")?.hide).toBe(true);
    });

    it("gives the phase of the student, also when the table is frozen", () => {
      const cols = columnDefinition(onlineContest, variants, true, true, i18n, "it");
      const col = cols.find((c) => c.colId === "status");
      expect(col?.hide).toBe(false);

      const valueGetter = col?.valueGetter as any;
      expect(valueGetter({ data: makeStudent({ participationWindow: undefined }) })).toBe("");
      expect(valueGetter({ data: makeStudent({ participationWindow: ongoing() }) })).toBe(
        "ongoing",
      );
      expect(
        valueGetter({
          data: makeStudent({ participationWindow: ongoing(), status: "submitted" }),
        }),
      ).toBe("submitted");
    });
  });
});
