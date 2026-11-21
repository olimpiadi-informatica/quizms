import { describe, expect, it } from "vitest";

import {
  type Contest,
  contestSchema,
  formatUserData,
  getNormalizedUserData,
  parseUserData,
  userDataMatch,
  validateUserData,
} from "~/models/contest";

const baseContest = {
  id: "test",
  name: "Test",
  longName: "Test contest",
  problemIds: [1, 2, 3],
  userData: [
    { name: "surname", label: "Cognome", type: "text" },
    { name: "name", label: "Nome", type: "text" },
    {
      name: "birthDate",
      label: "Data di nascita",
      type: "date",
      min: "2000-01-01",
      max: "2020-12-31",
    },
    { name: "classYear", label: "Classe", type: "number", min: 1, max: 5 },
    { name: "notes", label: "Note", type: "text", excludeFromUniqueCheck: true },
  ],
  matchingRules: [{ fields: ["surname", "name"] }, { fields: ["birthDate"] }],
  hasVariants: true,
  hasOffline: false,
  scoreVisibility: "never",
};

const contest: Contest = contestSchema.parse(baseContest);
const field = (name: string) => contest.userData.find((f) => f.name === name)!;

const student = (userData: Record<string, string | number | Date>) => ({ userData });

describe("contestSchema", () => {
  it("applies defaults", () => {
    expect(contest.problemIds).toEqual(["1", "2", "3"]);
    expect(contest.languages).toEqual(["it"]);
    expect(contest.onlineSettings).toBeNull();
    expect(contest.allowStudentImport).toBe(true);
    expect(contest.matchingRules.map((r) => r.required)).toEqual([2, 1]);
    expect(field("surname")).toMatchObject({ pattern: "[\\-'\\s\\p{Alpha}]+", title: false });
    expect(field("birthDate")).toMatchObject({ min: new Date("2000-01-01") });
  });

  it("requires name and surname fields", () => {
    const result = contestSchema.safeParse({
      ...baseContest,
      userData: [{ name: "surname", label: "Cognome", type: "text" }],
      matchingRules: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("Must contain a name field");
  });

  it("rejects matching rules that reference unknown fields", () => {
    const result = contestSchema.safeParse({
      ...baseContest,
      matchingRules: [{ fields: ["surname", "school"] }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        message: "Value 'school' is not in userData",
        path: ["matchingRules", 0, 1],
      }),
    ]);
  });

  it("validates language codes", () => {
    expect(contestSchema.safeParse({ ...baseContest, languages: ["it", "en"] }).success).toBe(true);
    expect(contestSchema.safeParse({ ...baseContest, languages: ["ita"] }).success).toBe(false);
    expect(contestSchema.safeParse({ ...baseContest, languages: [] }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(contestSchema.safeParse({ ...baseContest, unknown: 1 }).success).toBe(false);
  });
});

describe("parseUserData", () => {
  it("returns undefined for empty values", () => {
    expect(parseUserData(undefined, field("name"))).toBeUndefined();
    expect(parseUserData("", field("name"))).toBeUndefined();
  });

  it("normalises whitespace and apostrophes in text fields", () => {
    expect(parseUserData("  Maria \t Rosa  ", field("name"))).toBe("Maria Rosa");
    expect(parseUserData("D’Angelo", field("surname"))).toBe("D'Angelo");
    expect(parseUserData("D`Angelo", field("surname"))).toBe("D'Angelo");
  });

  it("parses numbers", () => {
    expect(parseUserData("3", field("classYear"))).toBe(3);
    expect(parseUserData("abc", field("classYear"))).toBeNaN();
  });

  it("parses dates with a format as UTC midnight", () => {
    // Both dates are chosen to test both standard time and daylight saving time.
    for (const [input, expected] of [
      ["03/01/2010", "2010-01-03T00:00:00.000Z"],
      ["03/07/2010", "2010-07-03T00:00:00.000Z"],
    ]) {
      const date = parseUserData(input, field("birthDate"), { dateFormat: "dd/MM/yyyy" });
      expect((date as Date).toISOString()).toBe(expected);
    }
  });
});

describe("validateUserData", () => {
  it("accepts missing values", () => {
    expect(validateUserData(undefined, field("name"))).toBeNull();
  });

  it("accepts text that matches the pattern", () => {
    expect(validateUserData("Maria Rosa", field("name"))).toBeNull();
    expect(validateUserData("D'Angelo-Àlvarez", field("surname"))).toBeNull();
  });

  it("rejects text with characters outside the pattern", () => {
    expect(validateUserData("Mario2", field("name"))?.[0]).toContain(
      'Il campo "nome" contiene caratteri non validi.',
    );
    expect(validateUserData("Ã¨Â©", field("name"))?.[0]).toContain("codifica sia UTF-8");
    expect(validateUserData("Mario!", field("name"))?.[0]).not.toContain("UTF-8");
  });

  it("rejects text without any valid character", () => {
    expect(validateUserData("123", field("name"))?.[0]).toContain("caratteri non validi");
    expect(validateUserData("¨©", field("name"))?.[0]).toContain("codifica sia UTF-8");
    expect(validateUserData("1!", field("name"))?.[0]).not.toContain("UTF-8");
  });

  it("limits text fields to 256 characters", () => {
    expect(validateUserData("a".repeat(256), field("name"))).toBeNull();
    expect(validateUserData("a".repeat(257), field("name"))?.[0]).toContain("256 caratteri");
  });

  it("validates number fields", () => {
    expect(validateUserData(3, field("classYear"))).toBeNull();
    expect(validateUserData(2.5, field("classYear"))?.[0]).toContain("numero intero");
    expect(validateUserData(0, field("classYear"))?.[0]).toContain("maggiore o uguale a 1");
    expect(validateUserData(6, field("classYear"))?.[0]).toContain("minore o uguale a 5");
  });

  it("validates date fields against min and max", () => {
    expect(validateUserData(new Date("2010-05-03"), field("birthDate"))).toBeNull();
    expect(validateUserData(new Date("1999-12-31"), field("birthDate"))?.[0]).toContain(
      "data successiva",
    );
    expect(validateUserData(new Date("2021-01-01"), field("birthDate"))?.[0]).toContain(
      "data precedente",
    );
  });
});

describe("formatUserData", () => {
  it("returns an empty string for missing values", () => {
    expect(formatUserData(undefined, field("name"))).toBe("");
    expect(formatUserData(student({}), field("name"))).toBe("");
  });

  it("formats text, numbers and dates", () => {
    const date = new Date("2010-05-03");
    const s = student({ name: "Mario", classYear: 3, birthDate: date });
    expect(formatUserData(s, field("name"))).toBe("Mario");
    expect(formatUserData(s, field("classYear"))).toBe("3");
    // The date is formatted in the runtime locale, so compare with Intl directly.
    expect(formatUserData(s, field("birthDate"))).toBe(
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date),
    );
  });
});

describe("getNormalizedUserData", () => {
  const mario = student({
    surname: "Rossi",
    name: "Mario",
    birthDate: new Date("2010-05-03"),
    classYear: 3,
    notes: "first",
  });

  it("ignores case, accents, symbols and excluded fields", () => {
    const other = student({
      surname: "ROSSÌ",
      name: "Ma-rio",
      birthDate: new Date("2010-05-03"),
      classYear: 3,
      notes: "second",
    });
    expect(getNormalizedUserData(contest, other)).toBe(getNormalizedUserData(contest, mario));
  });

  it("does not depend on the order of the fields", () => {
    const swapped = student({ ...mario.userData, surname: "Mario", name: "Rossi" });
    expect(getNormalizedUserData(contest, swapped)).toBe(getNormalizedUserData(contest, mario));
  });

  it("distinguishes different students", () => {
    const other = student({ ...mario.userData, classYear: 4 });
    expect(getNormalizedUserData(contest, other)).not.toBe(getNormalizedUserData(contest, mario));
  });
});

describe("userDataMatch", () => {
  const birthDate = new Date("2010-05-03");
  const mario = student({ surname: "Rossi", name: "Mario", birthDate });

  it("matches students that satisfy every rule, ignoring case", () => {
    expect(
      userDataMatch(contest, mario, student({ surname: "ROSSI", name: "mario", birthDate })),
    ).toBe(true);
  });

  it("ignores field order in unordered rules", () => {
    expect(
      userDataMatch(contest, mario, student({ surname: "Mario", name: "Rossi", birthDate })),
    ).toBe(true);
  });

  it("fails when any rule does not match", () => {
    expect(
      userDataMatch(
        contest,
        mario,
        student({ surname: "Rossi", name: "Mario", birthDate: new Date("2010-05-04") }),
      ),
    ).toBe(false);
    expect(
      userDataMatch(contest, mario, student({ surname: "Rossi", name: "Luigi", birthDate })),
    ).toBe(false);
  });

  it("respects ordered rules and partial requirements", () => {
    const partial = contestSchema.parse({
      ...baseContest,
      matchingRules: [{ fields: ["surname", "name", "birthDate"], ordered: true, required: 2 }],
    });
    const swapped = student({ surname: "Mario", name: "Rossi", birthDate });
    const oneWrong = student({ surname: "Rossi", name: "Luigi", birthDate });
    expect(userDataMatch(partial, mario, swapped)).toBe(false);
    expect(userDataMatch(partial, mario, oneWrong)).toBe(true);
  });
});
