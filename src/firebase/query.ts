import {
  CollectionReference,
  DocumentReference,
  Firestore,
  FirestoreDataConverter,
  Query,
  query as _query,
  collection,
  limit,
  orderBy,
  where,
} from "firebase/firestore";

type QueryOption<T> = {
  constraints?: { [P in keyof T]?: T[P] | T[P][] };
  orderBy?: keyof T & string;
  limit?: number;
};

export default function query<T>(
  db: Firestore | DocumentReference | CollectionReference,
  path: string,
  converter: FirestoreDataConverter<T>,
  options?: QueryOption<T>,
) {
  let q: Query<T> = collection(db as Firestore, path).withConverter(converter);
  for (const [k, v] of Object.entries(options?.constraints ?? {})) {
    q = _query(q, where(k, Array.isArray(v) ? "in" : "==", v));
  }

  if (options?.orderBy) q = _query(q, orderBy(options.orderBy));
  if (options?.limit) q = _query(q, limit(options.limit));

  return q;
}
