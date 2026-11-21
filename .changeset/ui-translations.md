---
"@olinfo/quizms": minor
"@olinfo/quizms-mdx": minor
"@olinfo/quizms-firebase": minor
"@olinfo/quizms-training": minor
---

The interface is translated in Italian and English, following the `languages` of the contests:

- Students see the interface in the statement language. On the login, teacher and admin pages the language can be chosen from the navigation bar, among the languages of the contests; the choice is remembered in the browser (and can be set with `?lang=`). Languages without a translation use English.
- Blockly (blocks, menus, toolbox categories, errors) is translated with the rest of the interface.
- In `contests.toml`, `name`, `long_name`, `instructions` and the `label` and `pattern_help` of `user_data` can be tables with the text in each language, e.g. `name = { it = "Gara", en = "Contest" }`. Deploy the website and the Cloud Functions before importing a configuration that uses them. The admin page edits the instructions of multilingual contests in each language.
- `pattern_help` has no default value in the configuration any more: without it, a default message in the interface language is shown.
- API errors of the Cloud Functions are shown in the interface language: deploy the functions after updating.
- Fixed statements not rendering when a client component of the statement bundle was exported with a name starting with `$`.

`statementString` was removed from `@olinfo/quizms/utils`. The UI messages are in the new `@olinfo/quizms/i18n` entry; `UiLanguageProvider`, `useLocalize` and the language selectors are in `@olinfo/quizms/components`.
