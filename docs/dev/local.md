# Sviluppare QuizMS

1. Scarica e compila `quizms`:

   ```sh
   $ git clone git@github.com:olimpiadi-informatica/quizms.git
   $ pushd quizms
   $ yarn           # installa le dipendenze
   $ yarn build     # compila il progetto, puoi usare `yarn watch` per ricompilare automaticamente
   $ yarn link      # crea un symlink a quizms
   $ popd
   ```

1. Scarica un progetto su cui testare `quizms`:

   ```sh
   $ git clone ...
   $ pushd ...
   $ yarn           # installa le dipendenze
   $ yarn link @olinfo/quizms   # installa la versione locale di quizms
   ```

1. Avvia il server di sviluppo:
   ```sh
   $ yarn dev
   ```
