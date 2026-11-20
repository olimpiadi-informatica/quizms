import { describe, expect, it } from "vitest";

import {
  contestStatementFile,
  localizedFileName,
  parseLanguages,
  statementString,
  statementStringLanguages,
} from "~/utils/languages";

describe("parseLanguages", () => {
  it("parses a comma-separated list, trimming whitespace", () => {
    expect(parseLanguages("it")).toEqual(["it"]);
    expect(parseLanguages("it, en ,fr")).toEqual(["it", "en", "fr"]);
  });

  it("rejects empty lists", () => {
    expect(() => parseLanguages("")).toThrow("cannot be empty");
    expect(() => parseLanguages(" , ")).toThrow("cannot be empty");
  });

  it("rejects malformed codes", () => {
    expect(() => parseLanguages("ita")).toThrow("Invalid language code `ita`");
    expect(() => parseLanguages("IT")).toThrow("Invalid language code `IT`");
    expect(() => parseLanguages("it,")).toThrow("Invalid language code ``");
  });

  it("rejects duplicates", () => {
    expect(() => parseLanguages("it,en,it")).toThrow("Duplicate language code `it`");
  });
});

describe("statementString", () => {
  it("uses Italian when no language is given", () => {
    expect(statementString(undefined, "question")).toBe("Domanda");
  });

  it("uses the requested language", () => {
    expect(statementString("it", "question")).toBe("Domanda");
    expect(statementString("en", "question")).toBe("Question");
  });

  it("falls back to English for unknown languages", () => {
    expect(statementString("fr", "variant")).toBe("Variant");
  });

  it("lists the languages with a dictionary", () => {
    expect(statementStringLanguages).toEqual(["it", "en"]);
  });
});

describe("contestStatementFile", () => {
  it("uses a single file for single-language contests", () => {
    expect(contestStatementFile(undefined, "it")).toBe("statement.txt");
    expect(contestStatementFile(["it"], "it")).toBe("statement.txt");
    expect(contestStatementFile(["it"], "it", "pdf")).toBe("statement.pdf");
  });

  it("uses one file per language for multilingual contests", () => {
    expect(contestStatementFile(["it", "en"], "en")).toBe("statement.en.txt");
    expect(contestStatementFile(["it", "en"], "it", "pdf")).toBe("statement.it.pdf");
  });
});

describe("localizedFileName", () => {
  it("inserts the language before the extension", () => {
    expect(localizedFileName("header.md", "en")).toBe("header.en.md");
    expect(localizedFileName("dir/header.md", "en")).toBe("dir/header.en.md");
  });

  it("only treats the last extension as the extension", () => {
    expect(localizedFileName("contest.config.yaml", "en")).toBe("contest.config.en.yaml");
  });

  it("appends the language to files without an extension", () => {
    expect(localizedFileName("README", "en")).toBe("README.en");
    expect(localizedFileName("dir.d/README", "en")).toBe("dir.d/README.en");
  });
});
