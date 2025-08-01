---
search: false
---

# TODO

La documentazione sulla creazione di un progetto è attualmente in fase di sviluppo.
Tuttavia, è possibile provare a copiare e modificare il seguente progetto demo:

> [https://github.com/olimpiadi-informatica/quizms-demo](https://github.com/olimpiadi-informatica/quizms-demo)

In particolare, il progetto contiene un file `header.md` con informazioni generali che vengono mostrate agli utenti anche prima dell'inizio della prova, e la struttura della prova stessa è definita nel file `contest.mdx`, che può contenere:
- sezioni (ad esempio, `## Sezione X`) per raggruppare le domande;
- testo Markdown arbitrario;
- comandi per l'importazione delle domande, scritti come:
```
<Problem points={[5, 1, 0]}><P1Task /></Problem>
```
che fa include la domanda nella cartella `p-1-task`, valutata assegnando 5 punti per una risposta corretta, 1 punto per una risposta mancante e 0 punti per una risposta errata.