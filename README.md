# quizms

## development

Per testare il codice durante lo sviluppo:

- clonare `quizms` e `quizms-example-contest`

```sh
git clone ssh://git@git.olinfo.it:10022/bortoz/quizms.git
git clone ssh://git@git.olinfo.it:10022/bortoz/quizms-example-contest.git
```

- Dall'interno della cartella `quizms` eseguire

```sh
yarn install
yarn build
yarn link
```

Per applicare le modifiche automaticamente, eseguire `yarn watch` invece che `yarn build`

- Dall'interno della cartella `quizms-example-contest` eseguire

```sh
yarn link quizms
yarn install
```

- Infine, sempre dall'interno di `quizms-example-contest`, eseguire

```sh
node node_modules/quizms/bin/bin.js dev
```
