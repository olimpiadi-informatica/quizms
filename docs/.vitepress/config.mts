import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
  defineConfig({
    title: "QuizMS",
    description: "Il framework per preparare le gare scolastiche",
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
          items: [{ text: "Cos'è QuizMS?", link: "/intro/intro" }],
        },
        {
          text: "Progetto",
          items: [{ text: "Creare il progetto", link: "/project/create" }],
        },
        {
          text: "Problemi",
          items: [
            { text: "Formato dei problemi", link: "/task/format" },
            { text: "Immagini", link: "/task/images" },
            { text: "Varianti", link: "/task/variants" },
            { text: "Codice a blocchi", link: "/task/blockly" },
          ],
        },
        {
          text: "Firebase",
          items: [
            { text: "Creare il progetto", link: "/firebase/setup" },
            { text: "Importare la gara", link: "/firebase/import" },
            { text: "Esportare i dati", link: "/firebase/export" },
          ],
        },
        {
          text: "Contribuire",
          items: [
            { text: "Sviluppo locale", link: "/dev/local" },
            { text: "Architettura", link: "/dev/architecture" },
          ],
        },
      ],
      socialLinks: [{ icon: "github", link: "https://github.com/olimpiadi-informatica/quizms" }],
    },
  }),
);
