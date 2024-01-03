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
2. Autenticati con Firebase:
   ```shell
   firebase login
   ```
3. Imposta il progetto di default:
   ```shell
   firebase use --add
   ```

### Creare un nuovo progetto su Firebase

TODO

### Configurare Firestore

TODO

### Configurare Storage

1. Accedi alla console di firebase;
2. Vai su tutti i prodotti;
3. Vai su Storage;
4. Clicca su _"Inizia"_;
5. Seleziona _"modalità di produzione"_ e clicca su _"Avanti"_;
6. Seleziona `eur3` e clicca su _"Fine"_;

### Configurare autenticazione

TODO

### Configurare hosting

1. Accedi alla console di firebase;
2. Vai su tutti i prodotti;
3. Vai su hosting;
4. Clicca su _"Inizia"_;
5. Ignora tutti i passaggi e clicca su _"Avanti"_ fino a quando non arrivi alla fine;
6. Per configurare il dominio, vai su _"Aggiungi dominio personalizzato"_ e segui le istruzioni, il dominio deve essere
   configurato **almeno 24 ore** prima dell'inizio della gara.

### Creare un account di servizio

1. Accedi alla console di firebase;
2. Vai sulle impostazioni del progetto;
3. Vai nella sezione _"Account di servizio"_;
4. Clicca su _"Genera nuova chiave privata"_;
5. Salva il file con il nome `serviceAccountKey.json` nella directory del progetto;
6. NON aggiungere il file a git, aggiungilo nel `.gitignore` qualora non fosse già presente.

### Completa la configurazione

1. Inizializza il progetto locale:
   ```shell
   npx quizms firebase init
   ```
2. Carica le regole di sicurezza e gli indici:
   ```shell
   firebase deploy --only firestore
   firebase deploy --only storage
   ```
