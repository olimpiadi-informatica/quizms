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

Before opening a pull request, make sure both linting and build pass.

---

## 5. Testing Changes Locally in a Contest Project

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

## 6. Pull Request & Commit Guidelines

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

---

## 7. Documentation

If your changes alter user-facing behavior, problem statement syntax, or configuration options, please update the corresponding pages in the `docs/` directory.

To run the documentation locally:
```bash
cd docs
pnpm dev
```
