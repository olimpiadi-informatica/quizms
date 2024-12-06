# Importare la gara

I dati del contest devono essere salvati dentro la directory `data` del progetto. I file possono essere in formato TOML,
YAML, CSV, JSON o JSONL.

Se non l'hai già fatto, [accedi a Google Cloud](./setup#completa-la-configurazione).

## Importare le gare

I contests sono descritti dal file `data/contests.{toml,yaml,csv,json,jsonl}`. Il formato è il seguente, i campi possono essere sia in formato camelCase che snake_case:

| Campo                  | Descrizione                                                                          | Tipo       | Note                                                                 |
|------------------------|--------------------------------------------------------------------------------------|------------|----------------------------------------------------------------------|
| `id`                   | ID della gara.                                                                       | `string`   |                                                                      |
| `name`                 | Nome della gara.                                                                     | `string`   |                                                                      |
| `long_name`            | Nome esteso della gara.                                                              | `string`   | Opzionale.                                                           |
| `problem_ids`          | ID dei problemi.                                                                     | `string[]` |                                                                      |
| `user_data`            | Informazioni personali richieste agli studenti durante la registrazione.             | `object[]` |                                                                      |
| `has_variants`         | Se ci sono più varianti dei testi.                                                   | `boolean`  |                                                                      |
| `has_online`           | Se la gara può essere svolta online.                                                 | `boolean`  |                                                                      |
| `has_pdf`              | Se la gara può essere svolta in modalità cartacea.                                   | `boolean`  |                                                                      |
| `statement_version`    | Versione dei testi.                                                                  | `number`   | Deve essere incrementato ogni volta che i testi vengono reimportati. |
| `allow_student_import` | Se gli insegnanti possono possono importare gli studenti da un CSV.                  | `boolean`  | Opzionale.                                                           |
| `allow_student_edit`   |                                                                                      | `boolean`  | Opzionale.                                                           |
| `allow_answer_edit`    |                                                                                      | `boolean`  | Opzionale.                                                           |
| `instructions`         | Informazioni generali in Markdown che vengono mostrare nella pagina dell'insegnante. | `string`   | Opzionale.                                                           |

Se `has_online` è `true`, i seguenti campi sono richiesti:

| Campo                  | Descrizione                                              | Tipo       | Note |
|------------------------|----------------------------------------------------------|------------|------|
| `contest_window_start` | Data di inizio della finestra di svolgimento della gara. | `date`     |      |
| `contest_window_end`   | Data di fine della finestra di svolgimento della gara.   | `date`     |      |
| `duration`             | Durata della gara in minuti.                             | `number`   |      |
| `allow_restart`        | Se gli insegnanti possono far partire la gara più volte. | `boolean`  |      |

Le informazioni personali nel campo `user_data` devono avere il seguente formato:

| Campo    | Descrizione                                                      | Tipo                            | Note                                                        |
|----------|------------------------------------------------------------------|---------------------------------|-------------------------------------------------------------|
| `name`   | Nome del campo.                                                  | `string`                        |                                                             |
| `label`  | Nome leggibile del campo.                                        | `string`                        |                                                             |
| `type`   | Tipo del campo.                                                  | `"text"`, `"number"` o `"date"` |                                                             |
| `size`   | Larghezza del campo nella tabella degli insegnanti.              | `"xs"`, `"sm"`, `"md"` o `"lg"` | Opzionale.                                                  |
| `min`    | Valore minimo del campo.                                         | `number` o `date`               | Richiesto per i campi data, opzionale per i campi numerici. |
| `max`    | Valore massimo del campo.                                        | `number` o `date`               | Richiesto per i campi data, opzionale per i campi numerici. |
| `pinned` | Se appuntare il campo a sinistra nella tabella degli insegnanti. | `boolean`                       | Opzionale.                                                  |


::: details Esempio di file

::: code-group

```toml [TOML]
[oii-scolastiche]
name = "OII - Scolastiche"
long_name = "Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica"
problem_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2]
user_data = [
    { name = "surname",      label = "Cognome",         type = "text",   pinned = true },
    { name = "name",         label = "Nome",            type = "text" },
    { name = "classYear",    label = "Classe",          type = "number", size = "xs", min = 1, max = 5 },
    { name = "classSection", label = "Sezione",         type = "text",   size = "xs" },
    { name = "birthDate",    label = "Data di nascita", type = "date",   min = 1990-01-01, max = 2013-12-31 },
]
has_variants = true
has_online = true
has_pdf = true
statement_version = 1
allow_student_import = true
allow_student_edit = true
allow_answer_edit = true
contest_window_start = 2023-12-14T08:00:00
contest_window_end = 2023-12-14T16:00:00
duration = 90
allow_restart = true
instructions = """
Istruzioni per la gara:
- queste sono le istruzioni per la gara.
"""
```

```yaml [YAML]
oii-scolastiche:
  name: OII - Scolastiche
  long_name: Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica
  problem_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2]
  user_data:
    - name: surname
      label: Cognome
      type: text
      pinned: true
    - name: name
      label: Nome
      type: text
    - name: classYear
      label: Classe
      type: number
      size: xs
      min: 1
      max: 5
    - name: classSection
      label: Sezione
      type: text
      size: xs
    - name: birthDate
      label: Data di nascita
      type: date
      min: 1990-01-01
      max: 2013-12-31
  has_variants: true
  has_online: true
  has_pdf: true
  statement_version: 1
  allow_student_import: true
  allow_student_edit: true
  allow_answer_edit: true
  contest_window_start: 2023-12-14T08:00:00
  contest_window_end: 2023-12-14T16:00:00
  duration: 90
  allow_restart: true
  instructions: |
    Istruzioni per la gara:
    - queste sono le istruzioni per la gara.
```

```json [JSON]
{
  "oii-scolastiche": {
    "name": "OII - Scolastiche",
    "long_name": "Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica",
    "problem_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2],
    "user_data": [
      {
        "name": "surname",
        "label": "Cognome",
        "type": "text",
        "pinned": true
      },
      {
        "name": "name",
        "label": "Nome",
        "type": "text"
      },
      {
        "name": "classYear",
        "label": "Classe",
        "type": "number",
        "size": "xs",
        "min": 1,
        "max": 5
      },
      {
        "name": "classSection",
        "label": "Sezione",
        "type": "text",
        "size": "xs"
      },
      {
        "name": "birthDate",
        "label": "Data di nascita",
        "type": "date",
        "min": "1990-01-01",
        "max": "2013-12-31"
      }
    ],
    "has_variants": true,
    "has_online": true,
    "has_pdf": true,
    "statement_version": 1,
    "allow_student_import": true,
    "allow_student_edit": true,
    "allow_answer_edit": true,
    "contest_window_start": "2023-12-14T08:00:00",
    "contest_window_end": "2023-12-14T16:00:00",
    "duration": 90,
    "allow_restart": true,
    "instructions": "Istruzioni per la gara:\n - queste sono le istruzioni per la gara.\n"
  }
}
```

:::

Per importare i contests usa il comando:

```sh
$ npx quizms firebase import --contests
```

## Importare le scuole e gli insegnanti

Le scuole e gli insegnanti sono descritti dal file `data/schools.{toml,yaml,csv,json,jsonl}`. Il formato è il seguente:

| Campo          | Descrizione                              | Tipo                       | Note                                                                                                                                                                |
|----------------|------------------------------------------|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`           | Codice meccanografico della scuola.      | `string`                   |                                                                                                                                                                     |
| `name`         | Nome della scuola.                       | `string`                   |                                                                                                                                                                     |
| `contest_ids`  | ID delle gare a cui la scuola partecipa. | `string` oppure `string[]` | È possibile specificare un [picomatch](https://github.com/micromatch/picomatch#globbing-features), ad esempio `"*"` indica che la scuola partecipa a tutte le gare. |
| `password`     | Password della scuola.                   | `string`                   |                                                                                                                                                                     |
| `pdf_variants` | Varianti cartacee assegnate alla scuola. | `string[]`                 | Opzionale.                                                                                                                                                          |

::: details Esempio di file

::: code-group

```csv [CSV]
id,name,contest_ids,password
PNTF01000A,ITST J.F.Kennedy,oii-scolastiche,OKYkIZ6xFHPqyFS8HdUk
BOIS01400R,IIS Francesco Alberghetti,oii-scolastiche,n6r2yEKwAxJxBUCad7eS
```

```yaml [YAML]
PNTF01000A:
  name: ITST J.F.Kennedy
  contest_ids: [oii-scolastiche]
  password: OKYkIZ6xFHPqyFS8HdUk
BOIS01400R:
  name: IIS Francesco Alberghetti
  contest_ids: [oii-scolastiche]
  password: n6r2yEKwAxJxBUCad7eS
```

```json [JSON]
{
  "PNTF01000A": {
    "id":,
    "name": "ITST J.F.Kennedy",
    "contest_ids": ["oii-scolastiche"],
    "password": "OKYkIZ6xFHPqyFS8HdUk"
  },
  "BOIS01400R": {
    "id": "BOIS01400R",
    "name": "IIS Francesco Alberghetti",
    "contest_ids": ["oii-scolastiche"],
    "password": "n6r2yEKwAxJxBUCad7eS"
  }
}
```

:::

Per importare le scuole usa il comando:

```sh
$ npx quizms firebase import --schools --teachers
```

## Importare le varianti

Le configurazioni per generare le varianti devono essere salvate in un file `data/variants.{toml,yaml,csv,json,jsonl}` con il seguente formato:

| Campo                  | Descrizione                                                              | Tipo       | Note                                                                 |
|------------------------|--------------------------------------------------------------------------|------------|----------------------------------------------------------------------|
| `id`                   | ID della gara.                                                           | `string`   |                                                                      |
| `secret`               | Segreto usato per generare le varianti. Non deve essere reso pubblico.   | `string`   |                                                                      |
| `entry`                | File MDX principale contenente i testi dei problemi.                     | `string`   | Tipicamente `contest/contest.mdx`.                                   |
| `shuffle_problems`     | Se i problemi dentro una sezioni vengono mescolati.                      | `boolean`  |                                                                      |
| `shuffle_answers`      | Se le risposte vengono mescolate.                                        | `boolean`  |                                                                      |
| `variant_ids`          | ID delle varianti online.                                                | `string[]` |                                                                      |
| `pdf_variant_ids`      | ID delle varianti cartacee.                                              | `string[]` |                                                                      |
| `pdf_per_school`       | Numero di varianti cartacee da assegnare ad ogni scuola.                 | `number`   |                                                                      |

::: details Esempio di file

::: code-group
    
```toml [TOML]
[oii-scolastiche]
secret = "FbpU9ertN5WlCngQNqOK"
entry = "contest/contest.mdx"
shuffle_problems = true
shuffle_answers = true
variant_ids = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
pdf_variant_ids = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
pdf_per_school = 3
```

```yaml [YAML]
oii-scolastiche:
  secret: FbpU9ertN5WlCngQNqOK
  entry: contest/contest.mdx
  shuffle_problems: true
  shuffle_answers: true
  variant_ids: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  pdf_variant_ids: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
  pdf_per_school: 3
```
    
```json [JSON]
{
  "oii-scolastiche": {
    "secret": "FbpU9ertN5WlCngQNqOK",
    "entry": "contest/contest.mdx",
    "shuffle_problems": true,
    "shuffle_answers": true,
    "variant_ids": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    "pdf_variant_ids": [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    "pdf_per_school": 3
  }
}
```

:::

Per generare le varianti usa il seguente comando:

```sh
$ npx quizms variants
```

::: tip

Puoi anche generare le varianti manualmente, in tal caso ogni variante deve essere definita in un file JSON chiamato `variants/$ID/schema.json` con il seguente formato:

| Campo       | Descrizione                                  | Tipo     | Note |
|-------------|----------------------------------------------|----------|------|
| `id`        | ID della variante.                           | `string` |      |
| `contestId` | ID del contest a cui appartiene la variante. | `string` |      |
| `schema`    | Lo schema delle domande.                     | `object` |      |

Lo schema è un oggetto contente, per ogni domanda, un oggetto con il seguente formato:

| Campo            | Descrizione                         | Tipo                              | Note       |
|------------------|-------------------------------------|-----------------------------------|------------|
| `type`           | Tipo di domanda.                    | `"text"`, `"number"` o `"points"` |            |
| `originalId`     | ID della domanda prima del shuffle. | `string`                          | Opzionale. |
| `optionsCorrect` | Risposte corrette.                  | `string[]`                        | Opzionale. |
| `optionsBlank`   | Risposte in bianco.                 | `string[]`                        | Opzionale. |
| `optionsWrong`   | Risposte non corrette.              | `string[]`                        | Opzionale. |
| `pointsCorrect`  | Punti per risposta corretta.        | `number`                          | Opzionale. |
| `pointsBlank`    | Punti per risposta in bianco.       | `number`                          | Opzionale. |
| `pointsWrong`    | Punti per risposta sbagliata.       | `number`                          | Opzionale. |

Se le opzioni o i punti non sono specificati, il punteggio degli studenti non verrà calcolato.

::: details Esempio di variante

```json
{
  "id": "10",
  "contestId": "oii-scolastiche",
  "schema": {
    "1": {
      "type": "text",
      "optionsCorrect": ["A"],
      "optionsBlank": ["-"],
      "optionsWrong": ["B","C","D","E"],
      "pointsCorrect": 5,
      "pointsBlank": 1,
      "pointsWrong": 0
    },
    "2": {
      "type": "text",
      "optionsCorrect": ["B"],
      "optionsBlank": ["-"],
      "optionsWrong": ["A","C","D","E"],
      "pointsCorrect": 5,
      "pointsBlank": 1,
      "pointsWrong": 0
    }
  }
}
```

:::

Per importare le varianti usa il comando:

```sh
$ npx quizms firebase import --variants --variant-mappings --statements
```

## Importare le prove cartacee

Per importare i PDF delle prove cartacee usa i comandi:

```sh
$ npx quizms print
$ npx quizms firebase import --pdfs
```

## Eseguire il deploy del sito

Per eseguire il deploy del sito usa i comandi:

```sh
$ firebase deploy --only hosting
```
