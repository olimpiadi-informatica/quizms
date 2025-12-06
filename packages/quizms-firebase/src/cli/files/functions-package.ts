import packageJson from "~/../package.json";

export default {
  name: "functions",
  description: "Cloud Functions",
  private: true,
  main: "index.js",
  type: "module",
  dependencies: {
    "@olinfo/quizms-firebase": packageJson.version,
    "firebase-functions": packageJson.dependencies["firebase-functions"],
  },
};
