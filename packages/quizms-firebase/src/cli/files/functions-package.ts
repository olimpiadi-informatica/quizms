import packageJson from "~/../package.json";

export default {
  name: "functions",
  description: "Cloud Functions",
  private: true,
  main: "index.js",
  type: "module",
  dependencies: {
    "@olinfo/quizms-firebase": packageJson.version,
    // Pin the same `firebase-admin` used by quizms-firebase, so that `firebase-functions` does not
    // resolve its peer dependency to a different copy.
    "firebase-admin": packageJson.dependencies["firebase-admin"],
    "firebase-functions": packageJson.dependencies["firebase-functions"],
  },
};
