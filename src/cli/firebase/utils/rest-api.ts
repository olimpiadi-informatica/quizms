import type { App } from "firebase-admin/app";
import type { ApplicationDefaultCredential } from "firebase-admin/lib/app/credential-internal";

import { fatal } from "~/utils/logs";

export default async function restApi(
  app: App,
  service: string,
  version: `v${string}`,
  endpoint: string,
  body?: object,
) {
  const credential = app.options.credential as ApplicationDefaultCredential;
  const token = await credential?.getAccessToken();
  if (!token) {
    fatal("Failed to get access token from credential.");
  }

  const url = `https://${service}.googleapis.com/${version}/projects/${process.env.PROJECT_ID}${endpoint}`;
  const resp = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    body: body && JSON.stringify(body),
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data;
}
