# Come creare un contest su Firebase

### Prerequisiti

1. Installa [Firebase CLI](https://firebase.google.com/docs/cli).
   - Arch Linux: [firebase-tools](https://aur.archlinux.org/packages/firebase-tools/)
     o [firebase-tools-bin](https://aur.archlinux.org/packages/firebase-tools-bin/);
   - macOS:
     ```shell
     brew install firebase-cli
     ```
   - npm:
     ```shell
     npm install -g firebase-tools
     ```
   - [installazione manuale](https://firebase.google.com/docs/cli#install_the_firebase_cli).

### Creare un nuovo progetto su Firebase

1. Vai sulla [console firebase](https://console.firebase.google.com/) e clicca su _"Aggiungi progetto"_.
2. Una volta creato il progetto, nella home clicca sul pulsante con simbolo del codice per aggiungere un'app web.
3. Usa il nickname "web" e clicca su _"Registra l'app"_.
4. Copia l'oggetto di configurazione di firebase e incollalo nel file `firebase-config.js` del progetto.

### Configurare Firestore

1. Accedi alla console di firebase;
2. Vai su tutti i prodotti;
3. Vai su Could Firestore;
4. Clicca su _"Crea database"_;
5. Scegli la località `europe-west6` (Zurigo) e clicca su _"Avanti"_;
6. Seleziona _"modalità di produzione"_ e clicca su _"Avanti"_;

### Configurare Storage

1. Accedi alla console di firebase;
2. Vai su tutti i prodotti;
3. Vai su Storage;
4. Clicca su _"Inizia"_;
5. Seleziona _"modalità di produzione"_ e clicca su _"Avanti"_;
6. Seleziona `europe-west6` e clicca su _"Fine"_;

### Configurare autenticazione

1. Accedi alla console di firebase;
2. Vai su tutti i prodotti;
3. Vai su Authentication;
4. Clicca su _"Inizia"_;
5. Seleziona tra i provider nativi _"Email/password"_;
6. Abilita _"Email/password"_ e clicca su _"Salva"_;
7. Clicca su "Aggiungi un nuovo provider";
8. Seleziona tra i provider nativi _"Anonimo"_;
9. Abilita _"Anonimo"_ e clicca su _"Salva"_;
10. Vai nella tab _"Impostazioni"_ e nella sezione _"Azioni utente"_ disabilita _"Protezione enumerazione email"_;

### Configurare hosting

1. Accedi alla console di firebase;
2. Vai su tutti i prodotti;
3. Vai su Hosting;
4. Clicca su _"Inizia"_;
5. Ignora tutti i passaggi e clicca su _"Avanti"_ fino a quando non arrivi alla fine;
6. Per configurare il dominio, vai su _"Aggiungi dominio personalizzato"_ e segui le istruzioni, il dominio deve essere
   configurato **almeno 24 ore** prima dell'inizio della gara.

### Seleziona il piano a pagamento

1. Accedi alla console di firebase;
2. In basso a sinistra accanto alla scritta "Spark", clicca su _"Esegui l'upgrade"_;
3. Scegli il piano a consumo Blaze e configura il pagamento.

### Creare un account di servizio

1. Accedi alla console di firebase;
2. Vai sulle impostazioni del progetto;
3. Vai nella sezione _"Account di servizio"_;
4. Clicca su _"Genera nuova chiave privata"_;
5. Salva il file con il nome `serviceAccountKey.json` nella directory del progetto;
6. NON aggiungere il file a git, aggiungilo nel `.gitignore` qualora non fosse già presente.

### Completa la configurazione

1. Autenticati con Firebase:
   ```shell
   firebase login
   ```
2. Inizializza il progetto locale:
   ```shell
   npx quizms firebase init
   ```
3. Imposta il progetto di default:
   ```shell
   firebase use --add
   ```
4. Carica le regole di sicurezza e gli indici:
   ```shell
   firebase deploy --only firestore,storage
   ```
