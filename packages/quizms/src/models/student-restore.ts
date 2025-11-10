import z from "zod";

export const studentRestoreSchema = z.object({
  id: z.string(), // uid identificativo della sessione
  studentId: z.string(), // identificativo dello studente a cui ci si vuole loggare
  participationId: z.string(), // identificativo della partecipazione
  token: z.string(),
  name: z.string(), // nome dello studente
  surname: z.string(), // cognome dello studente
});

export type StudentRestore = z.infer<typeof studentRestoreSchema>;
