import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "QuizMS",
    themeConfig: {
      socialLinks: [{ icon: "github", link: "https://github.com/olimpiadi-informatica/quizms" }],
    },
    locales: {
      root: {
        label: "English",
        lang: "en",
        description: "The framework for computer science quizzes",
        themeConfig: {
          editLink: {
            pattern: "https://github.com/olimpiadi-informatica/quizms/edit/main/docs/:path",
            text: "Edit this page on GitHub",
          },
          outline: {
            label: "Contents",
            level: [2, 3],
          },
          search: {
            provider: "local",
          },
          sidebar: [
            {
              text: "Introduction",
              items: [{ text: "What is QuizMS?", link: "/intro/intro" }],
            },
            {
              text: "Project",
              items: [{ text: "Create the project", link: "/project/create" }],
            },
            {
              text: "Problems",
              items: [
                { text: "Problem format", link: "/task/format" },
                { text: "Images", link: "/task/images" },
                { text: "Variants", link: "/task/variants" },
                { text: "Block programming", link: "/task/blockly" },
              ],
            },
            {
              text: "Firebase",
              items: [
                { text: "Create the project", link: "/firebase/setup" },
                { text: "Import the contest", link: "/firebase/import" },
                { text: "Export the data", link: "/firebase/export" },
              ],
            },
            {
              text: "Contribute",
              items: [
                { text: "Local development", link: "/dev/local" },
                { text: "Architecture", link: "/dev/architecture" },
              ],
            },
          ],
        },
      },
      it: {
        label: "Italiano",
        lang: "it",
        description: "Il framework per quiz di informatica",
        themeConfig: {
          docFooter: {
            prev: "Pagina precedente",
            next: "Pagina Successiva",
          },
          editLink: {
            pattern: "https://github.com/olimpiadi-informatica/quizms/edit/main/docs/:path",
            text: "Modifica questa pagina su GitHub",
          },
          lastUpdated: {
            text: "Ultima modifica",
          },
          outline: {
            label: "Contenuti",
            level: [2, 3],
          },
          search: {
            provider: "local",
            options: {
              translations: {
                button: {
                  buttonText: "Cerca",
                  buttonAriaLabel: "Cerca",
                },
                modal: {
                  displayDetails: "Mostra dettagli",
                  resetButtonTitle: "Reset",
                  backButtonTitle: "Indietro",
                  noResultsText: "Nessun risultato",
                  footer: {
                    selectText: "Seleziona",
                    selectKeyAriaLabel: "Seleziona",
                    navigateText: "Naviga",
                    navigateUpKeyAriaLabel: "Naviga su",
                    navigateDownKeyAriaLabel: "Naviga giù",
                    closeText: "Chiudi",
                    closeKeyAriaLabel: "Chiudi",
                  },
                },
              },
            },
          },
          sidebar: [
            {
              text: "Introduzione",
              items: [{ text: "Cos'è QuizMS?", link: "/it/intro/intro" }],
            },
            {
              text: "Progetto",
              items: [{ text: "Creare il progetto", link: "/it/project/create" }],
            },
            {
              text: "Problemi",
              items: [
                { text: "Formato dei problemi", link: "/it/task/format" },
                { text: "Immagini", link: "/it/task/images" },
                { text: "Varianti", link: "/it/task/variants" },
                { text: "Codice a blocchi", link: "/it/task/blockly" },
              ],
            },
            {
              text: "Firebase",
              items: [
                { text: "Creare il progetto", link: "/it/firebase/setup" },
                { text: "Importare la gara", link: "/it/firebase/import" },
                { text: "Esportare i dati", link: "/it/firebase/export" },
              ],
            },
            {
              text: "Contribuire",
              items: [
                { text: "Sviluppo locale", link: "/it/dev/local" },
                { text: "Architettura", link: "/it/dev/architecture" },
              ],
            },
          ],
        },
      },
    },
  }),
);
