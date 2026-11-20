# @olinfo/quizms-firebase

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

- [#71](https://github.com/olimpiadi-informatica/quizms/pull/71) [`59c7b72`](https://github.com/olimpiadi-informatica/quizms/commit/59c7b72ad8c9c0fe96044b8e1df3f6e88b78074d) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed parsing documents with pending server timestamps (updatedAt/createdAt read as null in local snapshots).

- [#57](https://github.com/olimpiadi-informatica/quizms/pull/57) [`026ece0`](https://github.com/olimpiadi-informatica/quizms/commit/026ece0b08926397e2081edc8d0bdd9fd8113098) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed some typos creating invalid schemas for users in the DB. Added the correct file extensions for copying the statements to Firebase Storage.

- [#70](https://github.com/olimpiadi-informatica/quizms/pull/70) [`8cff817`](https://github.com/olimpiadi-informatica/quizms/commit/8cff817b6b97364a8b89ad0a37441ac965d95d5f) Thanks [@Alenygam](https://github.com/Alenygam)! - Fixed not getting random pdf variants if pdfVariants is not set in school.
- Updated dependencies [[`b55ddc5`](https://github.com/olimpiadi-informatica/quizms/commit/b55ddc5a33169c2c843f7b1b46abbecba484b7c0), [`59c7b72`](https://github.com/olimpiadi-informatica/quizms/commit/59c7b72ad8c9c0fe96044b8e1df3f6e88b78074d), [`fd23f6a`](https://github.com/olimpiadi-informatica/quizms/commit/fd23f6adb955ddcf4eb4a1661a21c635c482bee9)]:
  - @olinfo/quizms@5.1.0
