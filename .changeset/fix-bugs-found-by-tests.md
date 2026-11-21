---
"@olinfo/quizms": patch
"@olinfo/quizms-mdx": patch
"@olinfo/quizms-firebase": patch
"@olinfo/quizms-training": patch
---

Fixed bugs found by the new test suite:

- Teachers could enter student data that doesn't match the field's pattern (e.g. a name with digits) in the students table and the CSV import: the pattern now has to match the whole value, as in the student form.
- The results table shows `-` for blank answers, and the "Mostra risultati" and "Ricomincia" buttons have an accessible name.
- Code blocks containing a backtick or ending with a backslash no longer break the statement compilation, and `${…}` in code blocks of languages other than pseudocode is no longer evaluated. In pseudocode, operators (e.g. `*` → `×`) are no longer replaced inside `{…}` expressions. Open answer solutions can contain backticks.
- An empty `:::answers{.open}` fails with "Missing or invalid answers" instead of a `TypeError`.
- Asymptote: arrays mixing integers and reals (e.g. `[1, 2.5]`) are declared as `real[]`, arrays mixing other types are rejected, and modules imported with `from X access Y;` or `import X as Y;` are watched.
- Blockly: variables named like a custom block are renamed instead of overwriting the block.
- Firebase: `quizms firebase export --submissions` works again (submissions now have an `id`), the score update no longer fails on absent or disabled students that had a score, and submissions of disabled students or of unauthenticated updates are no longer lost.
- Training mode shows the contest header in the selected language (`header.<lang>.md`).

`headerEntry` is now exported from `@olinfo/quizms/utils-node`.
