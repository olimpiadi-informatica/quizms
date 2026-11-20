# Languages

A contest can have its statements in several languages. Students choose the language from the navigation bar and can switch at any time during the contest, without losing their answers. Every language is graded the same way: there is a single set of correct answers for each variant.

## Configuration

List the languages in **both** `data/contests.toml` and `data/variants.toml`, with the same values. The first language is the default one:

```toml
[my-contest]
languages = ["it", "en"]
```

Languages are two-letter lowercase codes (`it`, `en`, `de`, ...). Contests without `languages` have a single language, `it`, and work exactly as before.

## Translating problems

The statement in the default language is always `question.md` (or `question.mdx`). Each translation is a file named `question.<lang>.md` in the same folder:

```
p-1-salto-ostacoli/
├── question.md        # default language (the first in `languages`)
├── question.en.md     # English
├── fig.asy            # shared by all languages
└── variants.py        # shared by all languages
```

A translation must have **the same answers** as the default statement:

- the same sub-questions (the same `---` separators);
- the same answer types;
- the same options, in the same order, with the same correct ones;
- the same values for open answers.

`quizms variants` checks this and fails if a translation is graded differently, for example:

```
✗ The en statement of variant demo/10 doesn't match the it statement at ["1.2"]["options"][0]["correct"].
```

::: warning WARNING
The check compares answers, not text. If a translation swaps two wrong options, the check passes, but the same stored answer refers to different text in the two languages. Keep the options in the same order.
:::

### Variants and images

Every language of a problem uses the same variant for a given student. Variants are defined in each file, so all translations must define **the same variants**, in the same order. The easiest way is to keep them in a shared file, imported by every translation:

```md
import variants from "./variants.py";
```

Images are imported by each file, so translations can share them (`![fig](fig.asy)`) or use a translated copy (`![fig](fig.en.asy)`).

### Missing translations

Every problem used by the contest must have a statement in every language: `quizms variants`, `quizms print` and `quizms firebase import` fail and list the missing files. Problem folders that are not used in `contest.mdx` are not checked.

The only exception is `quizms dev`: a missing translation shows the default language with a warning, so you can preview a contest while it is still being translated.

## Translating the contest page

Text in `contest.mdx` (section titles, explanations) can be translated with `<Locale>`:

```mdx
<Locale lang="it">
## Sezione 1: quiz
</Locale>
<Locale lang="en">
## Section 1: quizzes
</Locale>
```

`<Locale>` is only for text: `<Problem>` and `<Section>` cannot be inside it.

The contest header (`header` in `variants.toml`, e.g. `header.md`) is translated with `header.<lang>.md` files in the same folder.

## Building

`quizms variants` builds every language. For each variant it writes `statement.<lang>.txt`, plus `statement.txt` for the default language. `quizms print` writes `statement.<lang>.pdf`, plus `statement.pdf` for the default language.

Both commands accept `--languages` to build only some languages, overriding the configuration. The first one is the default language of that run:

```sh
quizms variants --languages=en
quizms print --languages=it,en
```

`quizms print` uses the statements built by `quizms variants`, so run both with the same languages.

## What is translated

QuizMS translates the fixed text that is part of the statements: question headings (`Domanda 1` / `Question 1`), the PDF footer (`Variante` / `Variant`), the fields printed on the PDF (`Codice prova` / `Test code`), the blank-page note of the teacher's PDF, and in [block programming](./blockly) problems the built-in blocks and the default toolbox categories. Italian and English are available; other languages use English.

Text written by the problem author is not translated automatically: custom blocks, custom toolboxes and visualizers can be translated by importing different files in each translation.

The rest of the interface (menus, buttons, messages) stays in Italian, and so do the values in the configuration files: contest names and the labels of the personal data fields (`user_data`).

## Firebase

- The student's choice is saved, so it is kept after reloading the page or changing device. Deploy the Firestore rules included in QuizMS (`firestore.rules`): with older rules, the choice is not saved.
- `quizms firebase import` checks that every language of each contest has its statements (and its PDFs, if they were generated) before uploading them.
- Teachers choose the language of the PDFs they download from the dashboard.
