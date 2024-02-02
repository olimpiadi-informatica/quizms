# Come sviluppare QuizMS

1. Scarica `quizms` e `quizms-example-contest`:

   ```
   git clone ssh://git@git.olinfo.it:10022/bortoz/quizms.git
   git clone ssh://git@git.olinfo.it:10022/bortoz/quizms-example-contest.git
   ```

2. Installa `quizms`:

   ```
   cd quizms
   yarn
   yarn build
   yarn link
   cd ..
   ```

3. Installa `quizms-example-contest`:

   ```
   cd quizms-example-contest
   yarn link @olinfo/quizms
   yarn
   ```

4. Avvia il server di sviluppo:
   ```
   yarn dev
   ```
