import { LanguageRegistration } from "shiki";

// https://macromates.com/manual/en/language_grammars
const srs: LanguageRegistration = {
  displayName: "Pseudocodice",
  name: "srs",
  scopeName: "source.srs",
  patterns: [
    { include: "#constant" },
    { include: "#entity" },
    { include: "#invalid" },
    { include: "#keywords" },
    { include: "#punctuation" },
    { include: "#storage" },
    { include: "#strings" },
    { include: "#support" },
  ],
  repository: {
    constant: {
      patterns: [
        {
          match: "\\b-?\\d+(\\.\\d+)?\\b",
          name: "constant.numeric",
        },
      ],
    },
    entity: {
      patterns: [
        {
          match: "(?<=function\\s+)\\w+(?=\\()",
          name: "entity.name.function",
        },
      ],
    },
    invalid: {
      patterns: [
        {
          match: "\\[\\?+]",
          name: "invalid.illegal",
        },
      ],
    },
    keywords: {
      patterns: [
        {
          match: "\\b(return|end|if|then|else|for|in|while|do)\\b",
          name: "keyword.control",
        },
        {
          match: "[<>]|\\b(mod|and|or|not)\\b",
          name: "keyword.operator",
        },
        {
          match: "[+/=×…←→≠≤≥-]",
          name: "keyword.operator", // TODO: scale up
        },
      ],
    },
    punctuation: {
      patterns: [
        {
          match: "[\\[\\]()]",
          name: "punctuation",
        },
      ],
    },
    storage: {
      patterns: [
        {
          match: "\\b(integer|variable|function)\\b",
          name: "storage.type",
        },
      ],
    },
    strings: {
      patterns: [
        {
          match: '"(?:\\\\.|[^\\\\"])*"',
          name: "string.quoted.double",
        },
      ],
    },
    support: {
      patterns: [
        {
          match: "\\b(max|min|output)\\b",
          name: "support.function",
        },
      ],
    },
    $self: {},
    $base: {},
  },
};

export default srs;
