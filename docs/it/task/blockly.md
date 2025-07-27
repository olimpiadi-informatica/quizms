# Codice a blocchi

È possibile usare [blockly](https://developers.google.com/blockly) per creare problemi in cui bisogna rispondere con del codice a blocchi. Il testo del problema dovrà contenere un componente `Blockly`:

```jsx
import customBlocks from "./custom.blocks.yaml";
import initialBlocks from "./initial-blocks.json";
import testcases from "./testcases.py";
import visualizer from "./visualizer";

Testo del problema...

<Blockly
  customBlocks={customBlocks}
  initialBlocks={initialBlocks}
  testcases={testcases}
  visualizer={visualizer}
/>
```

Il componente `Blockly` deve avere le seguenti proprietà:

- `customBlocks`: i [blocchi personalizzati](#blocchi-personalizzati) del problema.
- `initialBlocks`: un JSON contenente i blocchi e le variabili presenti inizialmente nell'editor a blocchi del problema:
    ```json
    {
      "blocks": {
        "languageVersion": 0,
        "blocks": [...]
      },
      "variables": [...]
    }
    ```
  Può essere generato a mano ma è più conveniente generarlo usando il pulsante "Debug" durante lo sviluppo del problema.
- `testcases`: un array di oggetti contenenti le variabili del testcase. Può essere importato da un file Python o JSON o essere definito direttamente in JavaScript nel file del problema.
    ```json
    [
      { "N": 4, "A": [1, 2, 3, 4] },
      { "N": 5, "A": [5, 4, 3, 2, 1] },
      ...
    ]
    ```
- `visualizer`: un componente di React che visualizza lo stato del testcase:
    ```jsx
    function Visualizer({ variables, state }) {
      ...
    }
    ```
  La funzione riceve come parametri le variabili definite dall'utente e lo stato del testcase. Inizialmente lo stato corrisponde alle variabili del testcase e viene aggiornato durante l'esecuzione del codice a blocchi.

## Blocchi personalizzati

Ci sono due tipi di blocchi: i blocchi _statement_ e i blocchi _output_.

- gli _statement_ sono blocchi che eseguono un'azione senza restituire un valore. Possono essere connessi a un altro blocco sopra o sotto:

  ![Blocco statement](./statement.png)

- gli _output_ sono blocchi che restituiscono un valore e possono essere usati come parametri di altri blocchi:

  ![Blocco output](./output.png)

::: warning ATTENZIONE
I blocchi vanno definiti all'interno di un file YAML con estensione `.blocks.yaml`.
:::

Ogni blocco ha i seguenti campi:
- `type`: id del blocco.
- `message0`: testo mostrato nel blocco. Deve contenere i placeholder `%1`, `%2`, ... per gli argomenti del blocco.
- `args0`: lista degli [argomenti del blocco](#argomenti-del-blocco).
- `colour`: [colore del blocco](https://developers.google.com/blockly/guides/create-custom-blocks/block-colour#colour_formats). Può essere un numero tra 0 e 360 o una stringa RGB.
- `tooltip`: testo che appare quando si passa con il mouse sopra il blocco.
- `maxInstances`: numero massimo di blocchi consentiti di questo tipo. Se non specificato, il numero di blocchi è illimitato.
- `js`: una stringa contenente il codice JavaScript da eseguire quando il blocco viene eseguito. Il codice può contenere dei placeholder `%1`, `%2`, ... per gli argomenti che verranno sostituiti con il codice degli argomenti. Nei blocchi output, il codice deve essere un'unica espressione che restituisce un valore.
  ::: warning ATTENZIONE
  Il codice deve essere conforme alle specifiche JavaScript ES5, perciò la maggior parte delle funzionalità moderne di JavaScript non sono supportate.
  :::

Gli _statement_ possono avere i seguenti campi aggiuntivi:
- `previousStatement`: `null` se il blocco può essere collegato a un altro blocco sopra.
- `nextStatement`: `null` se il blocco può essere collegato a un altro blocco sotto.

Gli _output_ devono avere il seguenti campo aggiuntivo:
- `output`: tipo di output del blocco: `Number`, `String`, `Array` o `Boolean`.

::: details Esempio di un blocco statement

```yaml
- type: gira_ruota
  message0: gira la ruota
  previousStatement: null
  nextStatement: null
  colour: 20
  tooltip: Gira la ruota di uno spicchio
  js: state.angle = (state.angle + 45) % 360;
```

::: 

::: details Esempio di un blocco output

```yaml
- type: minimo
  message0: minimo tra %1 e %2
  args0:
    - type: input_value
      check: Number
    - type: input_value
      check: Number
  output: Number
  colour: 20
  tooltip: il valore minimo tra x e y
  js: Math.min(%1, %2)
```
:::

### Argomenti del blocco

Un argomento è rappresentato da un oggetto con il campo `type` che specifica il tipo dell'argomento, e ulteriori campi che dipendono dal tipo dell'argomento.

QuizMS supporta due tipi di argomenti:
- `field_dropdown`: un menu a tendina con valori predefiniti. Il campo `options` deve contenere la lista di opzioni del menu a tendina, ogni opzione è rappresentata da un array di due elementi: il testo mostrato e il codice JavaScript generato.
    ```yaml
    args0:
      - type: field_dropdown
        options:
          - [somma, SUM]
          - [differenza, DIFF]
          - [prodotto, PROD]
          - [divisione, DIV]
    ```
- `input_value`: un blocco output che può essere collegato a questo blocco.

  Il campo `check` specifica il tipo di blocco che può essere usato: `Number`, `String`, `Array` o `Boolean`. QuizMS aggiunge inoltre il tipo `Integer` che estende il tipo `Number` validando durante l'esecuzione che il valore sia un intero.

  È possibile anche specificare i campi `min` e `max` per validare durante l'esecuzione che il valore sia compreso tra i due estremi, i campi devono contenere del codice JavaScript. 
    ```yaml
    args0:
      - type: input_value
        check: Integer
        min: "1"
        max: state.N
    ```
