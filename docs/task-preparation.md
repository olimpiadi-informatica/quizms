# Come preparare problemi per quizms

Un problema è rappresentato da un file Markdown oppure [MDX](https://mdxjs.com/), ovvero Markdown con l'aggiunta di JavaScript. Durante lo sviluppo è possibile usare l'hot-reload che aggiorna i problemi in tempo reale nel browser dopo ogni modifica a uno qualsiasi dei file che compongono il problema.

## Formato del file

Il file è composto da tre parti:

- il testo del problema;
- le risposte;
- la soluzione.

Il testo del problema è formattato con Markdown, è possibile usare la maggior parte delle funzionalità di Markdown, tra cui:

- [immagini](#immagini);
- formule matematiche di LaTeX;
- codice con syntax highlighting (anche per pseudocodice);
- [diagrammi di Mermaid](https://mermaid.js.org/).

Le risposte possono essere di due tipi.

- Risposta chiusa, definite mediante una [task list](https://www.markdownguide.org/extended-syntax/#task-lists) dove la risposta corretta è contrassegnata con una `x`:
  ```md
  - [ ] risposta 1
  - [x] risposta 2
  - [ ] risposta 3
  - [ ] risposta 3
  ```
- Risposta aperta, definite mediante la sintassi `?>`:
  ```md
  ?> risposta
  ```

La soluzione è definita mediante da un blocco [blockquote](https://www.markdownguide.org/basic-syntax/#blockquotes-1) e può essere formattata con Markdown:

```md
> la
> **soluzione**
> al
> _problema_
```

È possibile specificare più sottoproblemi nello stesso file sperandoli attraverso tre trattini `---`:

```md
Problema 1

---

Problema 2
```

### Immagini

Per aggiungere un'immagine è sufficiente usare la normale sintassi di Markdown:

```md
![descrizione](immagine.jpg)
```

È possibile anche aggiungere delle immagini con asymptote:

```md
![descrizione](immagine.asy)
```

Le immagini possono essere ridimensionate aggiungendo dei parametri dopo il nome del file:

```md
![descrizione](immagine.jpg?s=2)
```

I parametri che possono essere usati sono:

- `w`: cambia la larghezza dell'immagine mantenendo le proporzioni;
- `h`: cambia l'altezza dell'immagine mantenendo le proporzioni;
- `s`: moltiplica la larghezza e l'altezza dell'immagine per il valore specificato.

### Varianti

Per definire le varianti bisogna dichiarare un array di oggetti, dove ogni oggetto contiene le variabili da sostituire nel problema. Le varianti possono essere definite in diversi modi:

- [Front Matter](#front-matter);
- [JavaScript](#javascript);
- [Python](#python);

Il nome delle variabili **deve** iniziare con una lettera minuscola.

Per sostituire le variabili nel testo bisogna specificare il nome della variabile tra parentesi graffe:

```md
Il valore di `x` è {x}.
```

È possibile inoltre usare delle espressioni più complesse:

```md
Il valore di `x+y` è {x+y}.
```

Per utilizzare le variabili nelle formule di LaTeX bisogna utilizzare il comando `\js`:

```LaTeX
$x + y = \js{x+y}$
```

Si possono utilizzare le varianti anche all'interno dei file asymptote, per farlo bisogna definire l'immagine specificando il file con le varianti, il file deve essere definito nel formato [python](#python).

```md
![Immagine](immagine.asy?v=variants.py)
```

All'interno del file asymptote si possono utilizzare le variabili definite dalla variante.

#### Front Matter

È possibile dichiarare le varianti usando Front Matter, definendo un blocco YAML all'inizio del file, delimitato da tre trattini `---`.

```md
---
variants:
  - x: 2
  - x: 3
  - x: 4
---

Testo del problema...
```

L'array con le varianti deve chiamarsi `variants`.

#### JavaScript

È possibile dichiarare le varianti esportando la variabile `variants` all'inizio del file, ciò permette di usare funzioni più complesse per generare le varianti.

```js
export function buildVariant(x, y) {
  return { x, y, sum: x + y };
}

export const variants = [buildVariant(4, 5), buildVariant(2, 6), buildVariant(3, 7)];
```

#### Python

È possibile dichiarare le varianti in un file python, il file deve stampare un JSON con l'array delle varianti su standard output.

```py
import json

variants = [
    dict(x=4, y=5),
    dict(x=2, y=6),
    dict(x=3, y=7),
]

print(json.dumps(variants))
```

Successivamente bisogna importare il file python nel problema:

```js
import variants from "./variants.py";
```
