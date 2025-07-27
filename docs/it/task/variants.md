# Varianti

È possibile creare più varianti del problema, ogni utente riceverà una variante specifica e non potrà vedere le variante degli altri.

Una variante è definita da un oggetto che contiene le variabili da sostituire nel testo. Per definire le varianti bisogna dichiarare un array di oggetti, dove ogni elemento contiene le variabili di una variante.
::: warning ATTENZIONE
Il nome delle variabili **deve** iniziare con una lettera minuscola.
:::

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

L'utilizzo delle varianti nei file asymptote è parzialmente supportato. Per usarle bisogna definire le varianti nel formato [python](#python) e specificare il file con le varianti come paramento dell'immagine:

```md
![Immagine](immagine.asy?v=variants.py)
```
 Le varianti possono essere generate in diversi modi:

- [Front Matter](#front-matter);
- [JavaScript](#javascript);
- [Python](#python).

## Front Matter

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

## JavaScript

È possibile dichiarare le varianti esportando la variabile `variants` all'inizio del file, ciò permette di usare funzioni più complesse per generare le varianti.

```js
export function buildVariant(x, y) {
  return { x, y, sum: x + y };
}

export const variants = [buildVariant(4, 5), buildVariant(2, 6), buildVariant(3, 7)];

Testo del problema...
```

## Python

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

Testo del problema...
```
