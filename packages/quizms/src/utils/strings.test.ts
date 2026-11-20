import { describe, expect, it } from "vitest";

import { normalizeName, reactComponentCase, strip, titleCase } from "~/utils/strings";

describe("reactComponentCase", () => {
  it("converts names to PascalCase", () => {
    expect(reactComponentCase("my-problem")).toBe("MyProblem");
    expect(reactComponentCase("my_problem 2")).toBe("MyProblem2");
    expect(reactComponentCase("Already")).toBe("Already");
  });
});

describe("titleCase", () => {
  it("capitalises the first letter of each word", () => {
    expect(titleCase("mARIO rossi")).toBe("Mario Rossi");
    expect(titleCase("d'angelo-bianchi")).toBe("D'Angelo-Bianchi");
  });
});

describe("strip", () => {
  it("removes carriage returns and surrounding whitespace", () => {
    expect(strip("  a\r\nb\r\n  ")).toBe("a\nb");
  });
});

describe("normalizeName", () => {
  it("collapses whitespace and title-cases", () => {
    expect(normalizeName("maria   rosa\tBIANCHI")).toBe("Maria Rosa Bianchi");
  });
});
