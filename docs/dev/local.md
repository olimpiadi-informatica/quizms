# Develop QuizMS

1. Download and build `quizms`:

   ```sh
   git clone git@github.com:olimpiadi-informatica/quizms.git
   cd quizms
   pnpm install      # install dependencies across the monorepo
   pnpm -r build     # compile all packages
   ```

   You can use `pnpm -r watch` in a separate terminal to automatically recompile packages as you edit them.

2. Link into a project to test `quizms` (such as `quizms-demo` or a contest repo):

   In modern pnpm, use direct path linking from the consuming project directory:

   ```sh
   cd path/to/your-contest-project
   pnpm link ../quizms/packages/quizms
   # If testing mdx or other packages:
   pnpm link ../quizms/packages/quizms-mdx
   ```

   Alternatively, you can use [yalc](https://github.com/wclr/yalc) for isolated local testing:
   ```sh
   # In quizms/packages/quizms:
   npx yalc publish
   # In your contest project:
   npx yalc add @olinfo/quizms
   ```

3. Start the development server in your contest project:

   ```sh
   pnpm dev
   ```

4. Restoring dependencies when done:

   ```sh
   pnpm unlink @olinfo/quizms
   pnpm install --force
   ```