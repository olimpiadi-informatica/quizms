# Formato dei problemi

Ogni problema è rappresentato da un file **Markdown**:

```md
Quanto fa 2 + 2?

- [ ] 2
- [ ] 3
- [x] 4
- [ ] 5

> La soluzione è 4.
```

Il file è composto da quattro parti:

- **l'intestazione**: viene generata automaticamente con il numero del problema, ad esempio `Domanda 1`, `Domanda 2`, ecc.;
- **il testo**: la descrizione di cosa chiede il problema;
- **le risposte**: la parte in cui l'utente sceglie la risposta corretta;
- **la soluzione**: la spiegazione di come si risolve il problema, mostrata dopo che la prova è finita.

::: tip
Le risposte e la soluzione possono essere definite in qualsiasi parte del testo, ma è consigliato metterle alla fine del problema.
:::

È anche possibile definire i problemi usando [MDX](https://mdxjs.com/) (Markdown con l'aggiunta di JavaScript) che permette di definire, attraverso JavaScript, parti interattive del problema, ad esempio l'editor di [codice a blocchi](./blockly).

## Testo del problema

Il testo è la parte principale del problema. Si può formattare in Markdown, la maggior parte delle [funzionalità di Markdown](https://www.markdownguide.org/basic-syntax/) sono supportate e alcune estensioni, tra cui:

- [codice con syntax highlighting](https://www.markdownguide.org/extended-syntax/#syntax-highlighting) (anche per pseudocodice);
- [immagini](./images);
- [tabelle](https://www.markdownguide.org/extended-syntax/#tables);
- [formule matematiche di LaTeX](https://en.wikibooks.org/wiki/LaTeX/Mathematics) (`$...$`).

::: warning ATTENZIONE
Le seguenti funzionalità **non** sono supportate:

- citazioni (blockquotes): questa sintassi è usata per indicare la soluzione;
- separatore orizzontale (`---`): questa sintassi è usata per separare i sottoproblemi;
- TODO list: questa sintassi è usata per definire le risposte.
:::

## Risposte

Le risposte possono essere di tre tipi:

- **risposta chiusa**, definite tramite una [TODO list](https://www.markdownguide.org/extended-syntax/#task-lists) in cui la risposta corretta è contrassegnata con una `x`:
  ```md
  - [ ] risposta 1
  - [x] risposta 2
  - [ ] risposta 3
  - [ ] risposta 4
  ```
  ::: tip
  È possibile indicare più risposte corrette, ad esempio nel caso di refusi nei testi, tuttavia l'utente può selezionare solo una risposta.
  :::

- **risposta aperta**, definite con la sintassi `?>`:
  ```md
  ?> risposta
  ```
  ::: warning
  Una risposta aperta può essere lunga al massimo 100 caratteri.
  :::
  
- [codice a blocchi](./blockly): l'utente può usare un editor integrato per implementare una soluzione usando la programmazione a blocchi.

## Soluzione

La soluzione è definita da una [citazione](https://www.markdownguide.org/basic-syntax/#blockquotes-1) e può essere formattata a sua volta con Markdown:

```md
> la
> **soluzione**
> al
> _problema_
```

Durante la gara la soluzione non è visibile all'utente. È possibile vedere la soluzione solo dopo aver finito la prova in modalità training.

## Sottoproblemi

È possibile specificare più sottoproblemi nello stesso file separandoli attraverso tre trattini `---`:

```md
Sottoproblema 1 ...

- [x] Sì
- [ ] No

---

Sottoproblema 2 ...

- [ ] Sì
- [x] No
```

Ogni sottoproblema ha il suo testo, le sue risposte, la sua soluzione e un'intestazione generata automaticamente con il numero del problema e del sottoproblema, ad esempio `Domanda 1.1`, `Domanda 1.2`, ecc.
