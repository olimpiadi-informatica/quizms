# Formato dei problemi

Un problema è rappresentato da un file **Markdown** oppure [MDX](https://mdxjs.com/), ovvero Markdown con l'aggiunta di JavaScript.

```md
Quanto fa 2 + 2?

- [ ] 2
- [ ] 3
- [x] 4
- [ ] 5

> La soluzione è 4.
```

Il file è composto da tre parti:

- il testo del problema;
- le risposte;
- la soluzione.

## Testo del problema

Il testo del problema è formattato con Markdown, è possibile usare la maggior parte delle funzionalità di Markdown, tra cui:

- [immagini](./images);
- formule matematiche di LaTeX (`$...$`);
- codice con syntax highlighting (anche per pseudocodice).

## Risposte

Le risposte possono essere di tre tipi:

- risposta chiusa, definite mediante una [task list](https://www.markdownguide.org/extended-syntax/#task-lists) dove la risposta corretta è contrassegnata con una `x`:
  ```md
  - [ ] risposta 1
  - [x] risposta 2
  - [ ] risposta 3
  - [ ] risposta 3
  ```
- risposta aperta, definite mediante la sintassi `?>`:
  ```md
  ?> risposta
  ```
  
- [codice a blocchi](./blockly).

## Soluzione

La soluzione è definita mediante da un blocco [blockquote](https://www.markdownguide.org/basic-syntax/#blockquotes-1) e può essere formattata con Markdown:

```md
> la
> **soluzione**
> al
> _problema_
```

## Sottoproblemi

È possibile specificare più sottoproblemi nello stesso file sperandoli attraverso tre trattini `---`:

```md
Problema 1

---

Problema 2
```
