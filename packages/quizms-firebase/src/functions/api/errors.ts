import { TRPCError } from "@trpc/server";

/**
 * Errors returned by the API. The client shows them in the UI language, by `reason` (see
 * `src/web/common/api.ts`); the message is for older clients, which show it as is.
 */
const messages = {
  unknownUsername: "Username non esistente",
  wrongPassword: "Password non corretta",
  userDisabled: "Utenza non abilitata",
  invalidContest: "Gara non valida",
  contestNotOnline: "Gara non abilitata per prove online",
  contestNotStarted: "Gara non iniziata",
  contestEnded: "Gara già terminata",
  contestAlreadyStarted: "Gara già iniziata",
  invalidToken: "Codice prova non valido",
  alreadyParticipated: "Hai già partecipato a questa gara",
  invalidLogin: "Accesso non valido",
  invalidStudent: "Studente non valido",
  invalidLanguage: "Lingua non valida",
} as const;

export type ApiErrorReason = keyof typeof messages;

/** Cause of the errors created by `apiError`, read by the error formatter. */
export class ApiErrorCause extends Error {
  constructor(readonly reason: ApiErrorReason) {
    super(messages[reason]);
  }
}

export function apiError(code: TRPCError["code"], reason: ApiErrorReason) {
  return new TRPCError({ code, message: messages[reason], cause: new ApiErrorCause(reason) });
}
