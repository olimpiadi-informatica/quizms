# Contributing to QuizMS
---

## 1. Monorepo Structure

QuizMS is structured as a **pnpm monorepo**:

| Package | Path | Description |
| :--- | :--- | :--- |
| `@olinfo/quizms` | `packages/quizms` | Core CLI, components, models, student/teacher UI, PDF printing. |
| `@olinfo/quizms-mdx` | `packages/quizms-mdx` | Problem statement parsing (remark, rehype, recma, Blockly integration). |
| `@olinfo/quizms-firebase` | `packages/quizms-firebase` | Firebase/Firestore backend integration and contest synchronization. |
| `@olinfo/quizms-training` | `packages/quizms-training` | Interactive training mode runtime. |
| `@olinfo/quizms-rest` | `packages/quizms-rest` | REST API backend support. |
| `@olinfo/quizms-docs` | `docs` | VitePress documentation site ([quizms.olinfo.it](https://quizms.olinfo.it)). |

---

## 2. Prerequisites

- **Node.js**: `v20` or later (LTS recommended)
- **pnpm**: `v9` or `v10` (`corepack enable pnpm` or `npm install -g pnpm`)

---

## 3. Getting Started

1. **Clone the repository:**
   ```bash
   git clone git@github.com:olimpiadi-informatica/quizms.git
   cd quizms
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Build all packages:**
   ```bash
   pnpm -r build
   ```

---

## 4. Code Quality & Linting

QuizMS uses [Biome](https://biomejs.dev/) for formatting and linting, and TypeScript for type safety:

- **Check code quality and types:**
  ```bash
  pnpm -r prebuild
  ```

- **Auto-format and auto-fix lints:**
  ```bash
  pnpm -r lint
  ```

### Automated tests

Tests use [Vitest](https://vitest.dev/) and live next to the code they test as `src/**/*.test.ts` (or `.test.tsx` for React components, which run in `happy-dom`). Some tests import other workspace packages from their `dist/`, so build first (`pnpm -r build`).

There are three suites:

| Suite | Command | Needs |
| :--- | :--- | :--- |
| Unit and component tests | `pnpm test` (`pnpm test:watch` to watch) | Nothing else |
| Firebase integration tests (`*.emulator.test.ts`): tRPC procedures, Cloud Functions handlers, Firestore and Storage rules | `pnpm test:emulator` | Java 21+ and the [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`) |
| End-to-end smoke tests (`packages/e2e`): runs the CLI and a headless browser against a fixture contest | `pnpm test:e2e` | Chromium for Playwright: `pnpm --filter @olinfo/quizms exec playwright install chromium` |

Each package with unit tests has its own `vitest.config.mjs`, which is picked up by the root `vitest.config.mjs`. The emulator tests always run against a `demo-` project, so they never touch a real Firebase project.

Tests marked with a `// BUG:` comment document a known bug and fail until it is fixed.

Before opening a pull request, make sure linting, tests and build pass.

---

## 5. Translations

The interface is translated with [Lingui](https://lingui.dev/) and gettext `.po` catalogs. Source strings are in **English**; each package has its catalogs in `packages/<package>/locales/<locale>.po`, configured in the root `lingui.config.ts`.

### Writing translatable text

- In React components, use `<Trans>` and `useLingui` from `@lingui/react/macro`:
  ```tsx
  const { t } = useLingui();
  return <Button aria-label={t`Close`}><Trans>Save the <b>answers</b></Trans></Button>;
  ```
- For text defined outside components (constants, column definitions), use `msg` from `@lingui/core/macro` and translate it where it is rendered with `i18n._(descriptor)` (`i18n` from `useLingui()`).
- The `t` macro from `@lingui/core/macro` uses a global instance that follows the page language: use it only outside React (models, CLI, API helpers), never in components.
- Use named variables in messages (`` t`Hello ${name}` ``, not `` t`Hello ${user.name}` ``), and write whole sentences: don't build sentences from translated fragments.
- Statement server components (`quizms-mdx/src/components/server`) must not use the translation runtime: put translated text in client components.
- Translatable values of the configuration (contest names, `user_data` labels, ...) are not catalog messages: read them with `useLocalize()` (or `localize(value, language)` outside React).

All packages share the runtime of `@olinfo/quizms/i18n`. Each package registers its catalog in `src/i18n.ts`, imported by its client entry.

### Updating the catalogs

After adding or changing messages:

```bash
pnpm i18n:extract
```

then fill in the empty `msgstr` entries of every non-English catalog (`locales/it.po`). The library builds fail if a translation is missing, and CI runs `pnpm i18n:check`, which fails if the committed catalogs are out of date or if the same message is translated differently in two packages (all catalogs share one instance, so give such messages a different text or a context).

### Blockly

Blockly's own messages are in `packages/quizms-mdx/locales/blockly/<locale>.po`, with the Blockly key as `msgctxt`. They are not managed by Lingui: `pnpm i18n:extract` also runs `pnpm --filter @olinfo/quizms-mdx blockly:po`, which adds the messages of a new Blockly version (with Blockly's own translation when it has one) and marks as `#, fuzzy` the translations whose English text changed. Review the fuzzy entries and remove the flag. QuizMS's own texts inside Blockly (toolbox categories, errors of the generated code) are the `QUIZMS_*` keys, defined in `packages/quizms-mdx/scripts/blockly-po.mjs`.

### Adding a language

1. Add the locale to `locales` in `lingui.config.ts`, to `uiLocales` in `packages/quizms/src/i18n/locales.ts` and to `locales` in `packages/quizms-mdx/scripts/blockly-po.mjs`, and add its Blockly catalog to `packages/quizms-mdx/src/blockly-editor/messages.ts`.
2. Run `pnpm i18n:extract` and translate every catalog of the new locale.
3. Map the locale to its AG Grid translation in `packages/quizms/src/web/components/ag-grid.tsx`.

Contest languages without a catalog show the interface in English.

---

## 6. Testing Changes Locally in a Contest Project

When developing features or fixing bugs in QuizMS, you usually want to test against a contest repository (such as `scolastiche`, `finali-fibonacci-2026`, or `quizms-demo`).

### Option A: Using `pnpm link <dir>`
In your contest project directory (e.g. `scolastiche` or `finali-fibonacci-2026`), run `pnpm link` with the path to the package directory:

```bash
# Link the local packages you are modifying
pnpm link ../quizms/packages/quizms
pnpm link ../quizms/packages/quizms-mdx
```

To unlink and restore dependencies from npm:
```bash
pnpm unlink @olinfo/quizms
# or reinstall project dependencies
pnpm install --force
```

### Option B: Using `yalc` (Recommended for reliable local testing)
[`yalc`](https://github.com/wclr/yalc) simulates publishing to an npm registry locally:
```bash
# In packages/quizms (after building):
npx yalc publish

# In your contest project:
npx yalc add @olinfo/quizms
```
When you make updates in QuizMS:
```bash
npx yalc push   # automatically updates all linked contest projects
```

---

## 7. Pull Request & Commit Guidelines

All changes must go through a Pull Request to `main`. Direct pushes to `main` are restricted.

### Conventional Commits for PR Titles

We enforce [Conventional Commits](https://www.conventionalcommits.org/) on **Pull Request Titles**. When a PR is squash-merged, its title becomes the commit message on `main`.

Format:
```text
<type>(<scope>): <short description>
```

#### Allowed Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Maintenance tasks, repo maintenance

#### Recommended Scopes
- `quizms`
- `mdx`
- `firebase`
- `training`
- `rest`
- `docs`
- `ci`
- `deps`

#### Examples
- `fix(mdx): prevent crash when question contains empty blocks`
- `feat(rest): add contestant export endpoint`
- `docs(intro): update getting started instructions for pnpm`
- `ci: add PR title verification workflow`

### Generating a Changeset

If your PR introduces a fix or feature to any package under `packages/`, please include a changeset:

```bash
pnpm changeset
```
Follow the interactive prompts to pick the package, select the bump type (`patch` or `minor`), and write a user-facing summary of the change. Commit the generated `.changeset/*.md` file as part of your PR.

---

## 8. Documentation

If your changes alter user-facing behavior, problem statement syntax, or configuration options, please update the corresponding pages in the `docs/` directory.

To run the documentation locally:
```bash
cd docs
pnpm dev
```
