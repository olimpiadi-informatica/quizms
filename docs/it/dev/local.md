# Sviluppare QuizMS

1. Scarica e compila `quizms`:

   ```sh
   git clone git@github.com:olimpiadi-informatica/quizms.git
   cd quizms
   pnpm install      # installa le dipendenze in tutto il monorepo
   pnpm -r build     # compila tutti i pacchetti
   ```

   Puoi usare `pnpm -r watch` in un terminale separato per ricompilare automaticamente le modifiche man mano che salvi i file.

2. Collega il pacchetto a un progetto su cui testare `quizms` (come `quizms-demo` o una gara):

   Con le versioni recenti di pnpm, usa il linking diretto specificando il percorso della cartella del pacchetto:

   ```sh
   cd percorso/della/tua-gara
   pnpm link ../quizms/packages/quizms
   # Se stai modificando anche mdx o altri pacchetti:
   pnpm link ../quizms/packages/quizms-mdx
   ```

   In alternativa, puoi usare [yalc](https://github.com/wclr/yalc) per un ambiente di test locale isolato:
   ```sh
   # In quizms/packages/quizms:
   npx yalc publish
   # Nel progetto della gara:
   npx yalc add @olinfo/quizms
   ```

3. Avvia il server di sviluppo nel progetto della gara:

   ```sh
   pnpm dev
   ```

4. Ripristinare le dipendenze al termine:

   ```sh
   pnpm unlink @olinfo/quizms
   pnpm install --force
   ```

