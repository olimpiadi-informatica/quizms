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

`quizms variants` builds every language. For each variant it writes `statement.<lang>.txt`. `quizms print` writes `statement.<lang>.pdf` for PDF variants only.

Both commands accept `--languages` to build only some languages, overriding the configuration. The first one is the default language of that run:

```sh
quizms variants --languages=en
quizms print --languages=it,en
```

`quizms print` uses the statements built by `quizms variants`, so run both with the same languages.

## Translating the configuration

Some texts of `contests.toml` are shown to students and teachers: the contest name (`name`) and long name (`long_name`), the `instructions` for teachers, and the `label` and `pattern_help` of the personal data fields (`user_data`). Each of them can be a single text, used in every language, or a table with the text in each language:

```toml
[my-contest]
languages = ["it", "en"]
name = { it = "Gara", en = "Contest" }
long_name = "Olimpiadi di Informatica"
user_data = [
    { name = "surname", label = { it = "Cognome", en = "Surname" }, type = "text" },
    { name = "name", label = { it = "Nome", en = "Name" }, type = "text" },
]
```

A table must have the text in the default language (the first one in `languages`) and only languages of the contest. A language missing from a table uses the default one.

`pattern_mismatch` is not translatable. Without `pattern_help`, a default message in the interface language is shown.

::: warning WARNING
Tables are only understood by recent versions of QuizMS: deploy the website and the Cloud Functions before running `quizms firebase import` with a configuration that uses them.
:::

## What is translated

The whole interface (menus, buttons, messages) is translated, and so is the fixed text that is part of the statements: question headings (`Domanda 1` / `Question 1`), the PDF footer (`Variante` / `Variant`), the fields printed on the PDF (`Codice prova` / `Test code`), the blank-page note of the teacher's PDF, and in [block programming](./blockly) problems the built-in blocks and the default toolbox categories. Italian and English are available; other languages use English.

The interface is in the statement language for students. On the other pages (login, teachers, administrators) it can be chosen from the navigation bar, among the languages of the contests.

Text written by the problem author is not translated automatically: custom blocks, custom toolboxes and visualizers can be translated by importing different files in each translation. The texts of the configuration are translated as described [above](#translating-the-configuration).

## Firebase

- The student's choice is saved, so it is kept after reloading the page or changing device. The choice is saved through the QuizMS Cloud Functions, so deploy them after updating QuizMS: with older functions, the choice is not saved.
- `quizms firebase import` checks that every language of each contest has its statements (and its PDFs, if they were generated) before uploading them.
- Teachers choose the language of the PDFs they download from the dashboard.
