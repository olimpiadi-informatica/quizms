import {
  query as _query,
  type CollectionReference,
  collection,
  collectionGroup,
  type DocumentReference,
  type DocumentSnapshot,
  documentId,
  type Firestore,
  type FirestoreDataConverter,
  limit,
  orderBy,
  type Query,
  startAfter,
  where,
} from "firebase/firestore";

export type Constraints<T> = { [P in keyof T]?: T[P] | T[P][] };
export type ArrayConstraints<T> = {
  [P in keyof T]?: T[P] extends (infer E)[] ? E | E[] : never;
};

export type QueryOption<T> = {
  constraints?: Constraints<T>;
  arrayConstraints?: ArrayConstraints<T>;
  orderBy?: (keyof T & string) | [keyof T & string, "asc" | "desc"];
  limit?: number;
  startAfter?: T | DocumentSnapshot<T>;
  group?: boolean;
};

export default function query<T>(
  db: Firestore | DocumentReference | CollectionReference,
  path: string,
  converter: FirestoreDataConverter<T>,
  options?: QueryOption<T>,
) {
  let q: Query<T> = (options?.group ? collectionGroup : collection)(
    db as Firestore,
    path,
  ).withConverter(converter);
  for (const [k, v] of Object.entries(options?.constraints ?? {})) {
    q = _query(q, where(k === "id" ? documentId() : k, Array.isArray(v) ? "in" : "==", v));
  }
  for (const [k, v] of Object.entries(options?.arrayConstraints ?? {})) {
    q = _query(
      q,
      where(
        k === "id" ? documentId() : k,
        Array.isArray(v) ? "array-contains-any" : "array-contains",
        v,
      ),
    );
  }

  if (options?.orderBy) {
    q = Array.isArray(options.orderBy)
      ? _query(q, orderBy(...options.orderBy))
      : _query(q, orderBy(options.orderBy));
  }
  if (options?.limit) q = _query(q, limit(options.limit));
  if (options?.startAfter) q = _query(q, startAfter(options.startAfter));

  return q;
}
