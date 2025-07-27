# Immagine

Per aggiungere un'immagine è sufficiente usare la classica sintassi di Markdown:

```md
![descrizione](immagine.jpg)
```

È possibile anche generare delle immagini con [asymptote](https://asymptote.sourceforge.io/), il codice viene compilato automaticamente e convertito in un'immagine vettoriale:

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

::: tip
`w` e `h` possono essere usati insieme, in questo caso l'immagine viene ridimensionata senza mantenere le proporzioni.
:::
