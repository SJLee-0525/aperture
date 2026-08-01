type RestValue = Record<string, unknown>;
type RestDocument = { name: string; fields?: Record<string, RestValue> };

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const REVALIDATE_SECONDS = 3600;

const documentsUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const decodeValue = (value: RestValue | undefined): unknown => {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue as string;
  if ("booleanValue" in value) return value.booleanValue as boolean;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue as number;
  if ("timestampValue" in value) return value.timestampValue as string;
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, RestValue> }).fields ?? {};
    return decodeFields(fields);
  }
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: RestValue[] }).values ?? [];
    return values.map(decodeValue);
  }
  return null;
};

const decodeFields = (fields: Record<string, RestValue>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));

const toDate = (value: unknown): Date => {
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date(0);
};

const publishedOrderedQuery = (collectionId: string) => ({
  from: [{ collectionId }],
  where: {
    fieldFilter: {
      field: { fieldPath: "published" },
      op: "EQUAL",
      value: { booleanValue: true },
    },
  },
  orderBy: [{ field: { fieldPath: "order" }, direction: "ASCENDING" }],
});

const projectedPublishedOrderedQuery = (collectionId: string, fieldPaths: string[]) => ({
  ...publishedOrderedQuery(collectionId),
  select: { fields: fieldPaths.map((fieldPath) => ({ fieldPath })) },
});

const runQuery = async (
  structuredQuery: Record<string, unknown>,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> => {
  const response = await fetch(`${documentsUrl()}:runQuery?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!response.ok) throw new Error(`Firestore runQuery 실패 (${response.status})`);

  const rows = (await response.json()) as Array<{ document?: RestDocument }>;
  return rows
    .filter((row): row is { document: RestDocument } => Boolean(row.document))
    .map(({ document }) => ({
      id: document.name.split("/").pop() ?? "",
      data: decodeFields(document.fields ?? {}),
    }));
};

const fetchDocument = async (
  collectionId: string,
  documentId: string,
  label: string,
): Promise<Record<string, unknown> | null> => {
  const response = await fetch(`${documentsUrl()}/${collectionId}/${documentId}?key=${API_KEY}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore ${label} 읽기 실패 (${response.status})`);

  const document = (await response.json()) as RestDocument;
  return decodeFields(document.fields ?? {});
};

export { fetchDocument, projectedPublishedOrderedQuery, publishedOrderedQuery, runQuery, toDate };
