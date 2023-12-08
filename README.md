# quizms

## development

Per testare il codice durante lo sviluppo:

- clonare il contest da testare (si farà riferimento a `CONTEST` come il nome della cartella in cui si trova)
- clonare `quizms`

```sh
git clone ssh://git@git.olinfo.it:10022/bortoz/quizms.git
```

- Dall'interno della cartella `quizms` eseguire

```sh
yarn install
npx playwright install
yarn build
yarn link
```

Per applicare le modifiche automaticamente, eseguire `yarn watch` invece che `yarn build`

- Dall'interno della cartella `CONTEST` eseguire

```sh
yarn link quizms
yarn install
```

- Infine, sempre dall'interno di `CONTEST`, eseguire

```sh
yarn dev
```
