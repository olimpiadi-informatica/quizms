# Come rilasciare una nuova versione

1. Genera un token di accesso da [qui](https://git.olinfo.it/user/settings/applications):
   - su "Repository and Organization Access" seleziona "Public only";
   - su "Select permissions" seleziona "Read and Write" per "package" e "No access" su tutto il resto.
2. Configurare il package registry:
   ```shell
   TOKEN=...  # token di accesso generato
   npm config set @olinfo:registry https://git.olinfo.it/api/packages/bortoz/npm/
   npm config set -- '//git.olinfo.it/api/packages/bortoz/npm/:_authToken' "$TOKEN"
   ```
3. Pubblica il package:
   ```shell
   npm publish
   ```
