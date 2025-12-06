import {
  apiHandler,
  studentUpdatedHandler,
  updateScoresHandler,
} from "@olinfo/quizms-firebase/functions";
import { setGlobalOptions } from "firebase-functions";
import { onDocumentWrittenWithAuthContext } from "firebase-functions/firestore";
import { onCall } from "firebase-functions/https";
import { onTaskDispatched } from "firebase-functions/tasks";

setGlobalOptions({ region: "QUIZMS_REGION" });

export const api = onCall({ cors: ["http://localhost:1234"] }, apiHandler);

export const submissions = onDocumentWrittenWithAuthContext(
  "participations/{participationId}/students/{studentId}",
  studentUpdatedHandler,
);

export const updateScores = onTaskDispatched({ timeoutSeconds: 540 }, updateScoresHandler);
