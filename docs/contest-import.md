# Come importare un contest su Firebase

## Creare un account di servizio

1. Accedi alla console di firebase;
2. Vai sulle impostazioni del progetto;
3. Vai nella sezione _"Account di servizio"_;
4. Clicca su _"Genera nuova chiave privata"_;
5. Salva il file con il nome `serviceAccountKey.json` nella directory del progetto;
6. NON aggiungere il file a git, aggiungilo nel `.gitignore` qualora non fosse già presente.

## Importare i dati

I dati del contest devono essere salvati dentro la directory `data` del progetto. I file possono essere in formato TOML,
YAML, CSV, JSON o JSONL.

### Importare le gare

I contests sono descritti dal file `data/contests.{toml,yaml,csv,json,jsonl}`. Il formato è il seguente:

| Campo                  | Descrizione                                                              | Tipo       | Note                                                                 |
| ---------------------- | ------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------- |
| `id`                   | ID della gara.                                                           | `string`   |                                                                      |
| `name`                 | Nome della gara.                                                         | `string`   |                                                                      |
| `long_name`            | Nome esteso della gara.                                                  | `string`   | Opzionale.                                                           |
| `secret`               | Segreto usato per generare le varianti. Non deve essere reso pubblico.   | `string`   |                                                                      |
| `entry`                | File MDX principale contenente i testi dei problemi.                     | `string`   | Tipicamente `contest/contest.mdx`.                                   |
| `shuffle_problems`     | Se i problemi dentro una sezioni vengono mescolati.                      | `boolean`  |                                                                      |
| `shuffle_answers`      | Se le risposte vengono mescolate.                                        | `boolean`  |                                                                      |
| `allow_restart`        | Se gli insegnanti possono far partire la gara più volte.                 | `boolean`  |                                                                      |
| `allow_import`         | Se gli insegnanti possono possono importare gli studenti da un CSV.      | `boolean`  |                                                                      |
| `has_variants`         | Se ci sono più varianti dei testi.                                       | `boolean`  |                                                                      |
| `has_online`           | Se la gara può essere svolta online.                                     | `boolean`  |                                                                      |
| `has_pdf`              | Se la gara può essere svolta in modalità cartacea.                       | `boolean`  |                                                                      |
| `contest_window_start` | Data di inizio della finestra di svolgimento della gara.                 | `date`     |                                                                      |
| `contest_window_end`   | Data di fine della finestra di svolgimento della gara.                   | `date`     |                                                                      |
| `duration`             | Durata della gara in minuti.                                             | `number`   | Deve essere minore o uguale a 100.                                   |
| `problem_ids`          | ID dei problemi.                                                         | `string[]` |                                                                      |
| `variant_ids`          | ID delle varianti online.                                                | `string[]` |                                                                      |
| `pdf_variant_ids`      | ID delle varianti cartacee.                                              | `string[]` |                                                                      |
| `pdf_per_school`       | Numero di varianti cartacee da assegnare ad ogni scuola.                 | `number`   |                                                                      |
| `statement_version`    | Versione dei testi.                                                      | `number`   | Deve essere incrementato ogni volta che i testi vengono reimportati. |
| `personal_information` | Informazioni personali richieste agli studenti durante la registrazione. | `object[]` |                                                                      |
| `instructions`         | Informazioni generali che vengono mostrare nella pagina dell'insegnante. | `string`   |                                                                      |

Le informazioni personali devono avere il seguente formato:

| Campo    | Descrizione                                                      | Tipo                            | Note                                                        |
| -------- | ---------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `name`   | Nome del campo.                                                  | `string`                        |                                                             |
| `label`  | Nome leggibile del campo.                                        | `string`                        |                                                             |
| `type`   | Tipo del campo.                                                  | `"text"`, `"number"` o `"date"` |                                                             |
| `size`   | Larghezza del campo nella tabella degli insegnanti.              | `"xs"`, `"sm"`, `"md"` o `"lg"` | Opzionale.                                                  |
| `min`    | Valore minimo del campo.                                         | `number` o `date`               | Richiesto per i campi data, opzionale per i campi numerici. |
| `max`    | Valore massimo del campo.                                        | `number` o `date`               | Richiesto per i campi data, opzionale per i campi numerici. |
| `pinned` | Se appuntare il campo a sinistra nella tabella degli insegnanti. | `boolean`                       | Opzionale.                                                  |

Un esempio di file TOML è il seguente:

```toml
[oii-scolastiche]
name = "OII - Scolastiche"
long_name = "Olimpiadi Italiane di Informatica 2023/2024 - Selezione scolastica"
secret = "FbpU9ertN5WlCngQNqOK"
entry = "contest/contest.mdx"
shuffle_problems = true
shuffle_answers = true
allow_restart = false
allow_import = true
has_variants = true
has_online = true
has_pdf = true
contest_window_start = 2023-12-14T08:00:00
contest_window_end = 2023-12-14T16:00:00
duration = 90
problem_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.1, 13.2, 14.1, 14.2, 15.1, 15.2, 16.1, 16.2]
variant_ids = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
pdf_variant_ids = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
pdf_per_school = 3
statement_version = 1
personal_information = [
    { name = "surname",      label = "Cognome",         type = "text",   pinned = true },
    { name = "name",         label = "Nome",            type = "text" },
    { name = "classYear",    label = "Classe",          type = "number", size = "xs", min = 1, max = 5 },
    { name = "classSection", label = "Sezione",         type = "text",   size = "xs" },
    { name = "birthDate",    label = "Data di nascita", type = "date",   min = 1990-01-01, max = 2013-12-31 },
]
instructions = """
Istruzioni per la gara:
 • queste sono le istruzioni per la gara.
"""
```

Per importare i contests usa il comando:

```shell
npx quizms firebase import --contests
```

### Importare le scuole e gli insegnanti

Le scuole e gli insegnanti sono descritti dal file `data/schools.{toml,yaml,csv,json,jsonl}`. Il formato è il seguente:

| Campo        | Descrizione                              | Tipo                       | Note                                                                                                                                                                |
| ------------ | ---------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | Codice meccanografico della scuola.      | `string`                   |                                                                                                                                                                     |
| `name`       | Nome della scuola.                       | `string`                   |                                                                                                                                                                     |
| `contestIds` | ID delle gare a cui la scuola partecipa. | `string` oppure `string[]` | È possibile specificare un [picomatch](https://github.com/micromatch/picomatch#globbing-features), ad esempio `"*"` indica che la scuola partecipa a tutte le gare. |
| `password`   | Password della scuola.                   | `string`                   |                                                                                                                                                                     |

Un esempio di file CSV è il seguente:

```csv
id,name,contestIds,password
PNTF01000A,ITST J.F.Kennedy,oii-scolastiche,OKYkIZ6xFHPqyFS8HdUk
BOIS01400R,ISS Francesco Alberghetti,oii-scolastiche,n6r2yEKwAxJxBUCad7eS
```

Per importare le scuole usa il comando:

```shell
npx quizms firebase import --schools --teachers
```

### Importare le varianti

Per importare le varianti usa i comandi:

```shell
npx quizms variants
npx quizms firebase import --variants --variant-mappings --statements
```

### Importare le prove cartacee

Per importare i PDF delle prove cartacee usa i comandi:

```shell
npx quizms print
npx quizms firebase import --pdfs
```

### Eseguire il deploy del sito

Per eseguire il deploy del sito usa i comandi:

```shell
export QUIZMS_TIME_SERVER="https://time1.olinfo.it"
firebase deploy --only hosting
```
