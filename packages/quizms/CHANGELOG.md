# @olinfo/quizms

## 5.2.1

### Patch Changes

- [#96](https://github.com/olimpiadi-informatica/quizms/pull/96) [`9e81a05`](https://github.com/olimpiadi-informatica/quizms/commit/9e81a05a3b7a5d13d3efac570e32a89c10a512d1) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed the students table and CSV export in the teacher portal ([#95](https://github.com/olimpiadi-informatica/quizms/issues/95)):
  
  - Answers are shown again in the students table and can be edited. The variant column shows the student's variant, and changing it recalculates the score with the new variant.
  - Numeric answers entered in the table are no longer always rejected as invalid, and answer tooltips show the answer instead of `[object Object]`.
  - Blockly answers are read-only in the table.
  - The CSV export contains the answers instead of `[object Object]`, in the same format accepted by the import.

## 5.2.0

### Minor Changes

- [#94](https://github.com/olimpiadi-informatica/quizms/pull/94) [`afdbc58`](https://github.com/olimpiadi-informatica/quizms/commit/afdbc58ac72fb0217717a89413648b51cf8845d1) Thanks [@Alenygam](https://github.com/Alenygam)! - The interface is translated in Italian and English, following the `languages` of the contests:
  
  - Students see the interface in the statement language. On the login, teacher and admin pages the language can be chosen from the navigation bar, among the languages of the contests; the choice is remembered in the browser (and can be set with `?lang=`). Languages without a translation use English.
  - Blockly (blocks, menus, toolbox categories, errors) is translated with the rest of the interface.
  - In `contests.toml`, `name`, `long_name`, `instructions` and the `label` and `pattern_help` of `user_data` can be tables with the text in each language, e.g. `name = { it = "Gara", en = "Contest" }`. Deploy the website and the Cloud Functions before importing a configuration that uses them. The admin page edits the instructions of multilingual contests in each language.
  - `pattern_help` has no default value in the configuration any more: without it, a default message in the interface language is shown.
  - API errors of the Cloud Functions are shown in the interface language: deploy the functions after updating.
  - Fixed statements not rendering when a client component of the statement bundle was exported with a name starting with `$`.
  
  `statementString` was removed from `@olinfo/quizms/utils`. The UI messages are in the new `@olinfo/quizms/i18n` entry; `UiLanguageProvider`, `useLocalize` and the language selectors are in `@olinfo/quizms/components`.

### Patch Changes

- [#91](https://github.com/olimpiadi-informatica/quizms/pull/91) [`358acd3`](https://github.com/olimpiadi-informatica/quizms/commit/358acd3f432265c5faf6c6817dbced3d3ee7ed08) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed bugs found by the new test suite:
  
  - Teachers could enter student data that doesn't match the field's pattern (e.g. a name with digits) in the students table and the CSV import: the pattern now has to match the whole value, as in the student form.
  - The results table shows `-` for blank answers, and the "Mostra risultati" and "Ricomincia" buttons have an accessible name.
  - Code blocks containing a backtick or ending with a backslash no longer break the statement compilation, and `${…}` in code blocks of languages other than pseudocode is no longer evaluated. In pseudocode, operators (e.g. `*` → `×`) are no longer replaced inside `{…}` expressions. Open answer solutions can contain backticks.
  - An empty `:::answers{.open}` fails with "Missing or invalid answers" instead of a `TypeError`.
  - Asymptote: arrays mixing integers and reals (e.g. `[1, 2.5]`) are declared as `real[]`, arrays mixing other types are rejected, and modules imported with `from X access Y;` or `import X as Y;` are watched.
  - Blockly: variables named like a custom block are renamed instead of overwriting the block.
  - Firebase: `quizms firebase export --submissions` works again (submissions now have an `id`), the score update no longer fails on absent or disabled students that had a score, and submissions of disabled students or of unauthenticated updates are no longer lost.
  - Training mode shows the contest header in the selected language (`header.<lang>.md`).
  
  `headerEntry` is now exported from `@olinfo/quizms/utils-node`.

## 5.1.0

### Minor Changes

- [#89](https://github.com/olimpiadi-informatica/quizms/pull/89) [`b55ddc5`](https://github.com/olimpiadi-informatica/quizms/commit/b55ddc5a33169c2c843f7b1b46abbecba484b7c0) Thanks [@Alenygam](https://github.com/Alenygam)! - Added multilingual statements. Configure `languages` (e.g. `["it", "en"]`, the first one is the default) in both the contests and the variants files, and translate each problem with a `question.<lang>.md` file next to `question.md`. Use `<Locale lang="en">…</Locale>` for translated text in `contest.mdx`, and `header.<lang>.md` next to `header.md` for the header.
  
  - `quizms variants` writes `statement.<lang>.txt` for every language (plus `statement.txt` for the default one), checks that every language has the same answers, and fails on missing translations. `quizms print` writes `statement.<lang>.pdf` (plus `statement.pdf`) with a translated footer. Both accept `--languages=<list>` to override the configured languages.
  - Students can switch language at any time from the navbar, without losing their answers. Firebase saves the choice on the student (`language`) through the new `studentSetLanguage` API function; the Firestore rules are unchanged; `quizms firebase import` checks that every language has its statements. Training mode keeps the choice in the page.
  - Teachers choose the language of the PDFs they download from the dashboard. `TeacherProvider`'s `getPdfStatements` receives the PDF file name as an optional third argument.
  - `quizms dev` adds the same language selector and falls back to the default language, with a warning, for missing translations. The variant picker keeps its selection when switching language.
  - Blockly's built-in blocks and the default toolbox categories follow the statement language (Italian or English).
  - Contests with a single language are unchanged. See the new "Languages" page of the documentation.
  
  Also fixed `quizms dev` returning 404 for pages with query parameters, and Blockly losing up to 5 seconds of unsaved blocks when the workspace unmounts.

### Patch Changes

- [#71](https://github.com/olimpiadi-informatica/quizms/pull/71) [`59c7b72`](https://github.com/olimpiadi-informatica/quizms/commit/59c7b72ad8c9c0fe96044b8e1df3f6e88b78074d) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed deleting or importing students failing when the score can't be computed (score was saved as undefined).

- [#69](https://github.com/olimpiadi-informatica/quizms/pull/69) [`fd23f6a`](https://github.com/olimpiadi-informatica/quizms/commit/fd23f6adb955ddcf4eb4a1661a21c635c482bee9) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed pdfVariants mandatory in schools, now defaults to []

## 5.0.4

### Patch Changes

- [#48](https://github.com/olimpiadi-informatica/quizms/pull/48) [`8af83a9`](https://github.com/olimpiadi-informatica/quizms/commit/8af83a93ae0cfdd3561dcb722e12ce4496ae452a) Thanks [@franfill1](https://github.com/franfill1)! - Define process.env.BASE_PATH in Vite builds
