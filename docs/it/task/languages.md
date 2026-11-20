# Lingue

Una gara può avere i testi in più lingue. Gli studenti scelgono la lingua dalla barra di navigazione e possono cambiarla in qualsiasi momento durante la gara, senza perdere le risposte. Tutte le lingue vengono corrette allo stesso modo: per ogni variante c'è un solo insieme di risposte corrette.

## Configurazione

Elenca le lingue **sia** in `data/contests.toml` **sia** in `data/variants.toml`, con gli stessi valori. La prima lingua è quella predefinita:

```toml
[my-contest]
languages = ["it", "en"]
```

Le lingue sono codici di due lettere minuscole (`it`, `en`, `de`, ...). Le gare senza `languages` hanno una sola lingua, `it`, e funzionano esattamente come prima.

## Tradurre i problemi

Il testo nella lingua predefinita è sempre `question.md` (o `question.mdx`). Ogni traduzione è un file chiamato `question.<lingua>.md` nella stessa cartella:

```
p-1-salto-ostacoli/
├── question.md        # lingua predefinita (la prima in `languages`)
├── question.en.md     # inglese
├── fig.asy            # condiviso da tutte le lingue
└── variants.py        # condiviso da tutte le lingue
```

Una traduzione deve avere **le stesse risposte** del testo predefinito:

- le stesse sottodomande (gli stessi separatori `---`);
- gli stessi tipi di risposta;
- le stesse opzioni, nello stesso ordine, con le stesse corrette;
- gli stessi valori per le risposte aperte.

`quizms variants` lo controlla e fallisce se una traduzione viene corretta in modo diverso, per esempio:

```
✗ The en statement of variant demo/10 doesn't match the it statement at ["1.2"]["options"][0]["correct"].
```

::: warning ATTENZIONE
Il controllo confronta le risposte, non il testo. Se una traduzione scambia due opzioni sbagliate, il controllo passa, ma la stessa risposta salvata corrisponde a testi diversi nelle due lingue. Mantieni le opzioni nello stesso ordine.
:::

### Varianti e immagini

Tutte le lingue di un problema usano la stessa variante per un dato studente. Le varianti sono definite in ogni file, quindi tutte le traduzioni devono definire **le stesse varianti**, nello stesso ordine. Il modo più semplice è tenerle in un file condiviso, importato da ogni traduzione:

```md
import variants from "./variants.py";
```

Le immagini sono importate da ogni file, quindi le traduzioni possono condividerle (`![fig](fig.asy)`) o usarne una copia tradotta (`![fig](fig.en.asy)`).

### Traduzioni mancanti

Ogni problema usato dalla gara deve avere il testo in ogni lingua: `quizms variants`, `quizms print` e `quizms firebase import` falliscono ed elencano i file mancanti. Le cartelle dei problemi non usate in `contest.mdx` non vengono controllate.

L'unica eccezione è `quizms dev`: una traduzione mancante mostra la lingua predefinita con un avviso, così puoi vedere l'anteprima di una gara mentre è ancora in traduzione.

## Tradurre la pagina della gara

Il testo in `contest.mdx` (titoli delle sezioni, spiegazioni) si traduce con `<Locale>`:

```mdx
<Locale lang="it">
## Sezione 1: quiz
</Locale>
<Locale lang="en">
## Section 1: quizzes
</Locale>
```

`<Locale>` serve solo per il testo: `<Problem>` e `<Section>` non possono stare al suo interno.

L'intestazione della gara (`header` in `variants.toml`, per esempio `header.md`) si traduce con file `header.<lingua>.md` nella stessa cartella.

## Generare i testi

`quizms variants` genera tutte le lingue. Per ogni variante scrive `statement.<lingua>.txt`, più `statement.txt` per la lingua predefinita. `quizms print` scrive `statement.<lingua>.pdf`, più `statement.pdf` per la lingua predefinita.

Entrambi i comandi accettano `--languages` per generare solo alcune lingue, al posto di quelle configurate. La prima è la lingua predefinita di quell'esecuzione:

```sh
quizms variants --languages=en
quizms print --languages=it,en
```

`quizms print` usa i testi generati da `quizms variants`, quindi esegui entrambi con le stesse lingue.

## Cosa viene tradotto

QuizMS traduce il testo fisso che fa parte dei testi: i titoli delle domande (`Domanda 1` / `Question 1`), il piè di pagina dei PDF (`Variante` / `Variant`), i campi stampati sul PDF (`Codice prova` / `Test code`), la nota delle pagine vuote nel PDF dell'insegnante e, nei problemi di [codice a blocchi](./blockly), i blocchi predefiniti e le categorie della barra degli strumenti predefinita. Sono disponibili italiano e inglese; le altre lingue usano l'inglese.

Il testo scritto dall'autore del problema non viene tradotto automaticamente: blocchi personalizzati, barre degli strumenti personalizzate e visualizzatori si possono tradurre importando file diversi in ogni traduzione.

Il resto dell'interfaccia (menu, pulsanti, messaggi) resta in italiano, così come i valori nei file di configurazione: i nomi delle gare e le etichette dei dati personali (`user_data`).

## Firebase

- La scelta dello studente viene salvata, quindi resta anche dopo aver ricaricato la pagina o cambiato dispositivo. La scelta viene salvata tramite le Cloud Functions di QuizMS, quindi pubblicale dopo aver aggiornato QuizMS: con le funzioni precedenti la scelta non viene salvata.
- `quizms firebase import` controlla che ogni lingua di ogni gara abbia i suoi testi (e i suoi PDF, se sono stati generati) prima di caricarli.
- Gli insegnanti scelgono la lingua dei PDF da scaricare dalla dashboard.
