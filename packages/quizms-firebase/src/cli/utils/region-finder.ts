import { validate } from "@olinfo/quizms/utils";
import { intersection, sortBy } from "lodash-es";
import z from "zod";

const productEnabled = [
  "Cloud Firestore",
  "Cloud Run functions",
  "Cloud Storage for Firebase",
  "Cloud Tasks",
];

export async function getGcpRegions() {
  const [regions, products, geoip] = await Promise.all([
    api("https://cloud.withgoogle.com/region-picker/data/regions.json", regionsSchema),
    api("https://cloud.withgoogle.com/region-picker/data/products.json", productsSchema),
    api("https://api.seeip.org/geoip", geoipSchema),
  ]);

  const availableRegions = intersection(
    ...productEnabled.map((p) =>
      Object.entries(products[p])
        .filter(([_, available]) => available)
        .map(([region]) => region),
    ),
  );

  return sortBy(
    availableRegions.map((region) => ({ region, ...regions[region] })),
    (region) => haversineDistance(geoip, region),
  );
}

async function api<T>(url: string, schema: z.core.$ZodType<T>) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Request failed");
  return validate(schema, await resp.json());
}

const regionsSchema = z.record(
  z.string(),
  z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
);

const productsSchema = z.record(z.string(), z.record(z.string(), z.boolean()));

const geoipSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

const R = 6371e3;
const toRad = Math.PI / 180;

export function haversineDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
): number {
  const lat1Rad = coord1.latitude * toRad;
  const lng1Rad = coord1.longitude * toRad;
  const lat2Rad = coord2.latitude * toRad;
  const lng2Rad = coord2.longitude * toRad;

  const deltaLat = lat2Rad - lat1Rad;
  const deltaLon = lng2Rad - lng1Rad;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
