import { fatal } from "@olinfo/quizms/utils-node";
import type { App } from "firebase-admin/app";

export function restProjectApi(
  app: App,
  service: string,
  version: `v${string}`,
  endpoint: string,
  body?: object,
) {
  return restApi(app, service, version, app.options.projectId + endpoint, body);
}

export async function restApi(
  app: App,
  service: string,
  version: `v${string}`,
  endpoint: string,
  body?: object,
) {
  const credential = app.options.credential;
  const token = await credential?.getAccessToken();
  if (!token?.access_token) {
    fatal("Failed to get access token from credential.");
  }

  const url = `https://${service}.googleapis.com/${version}/projects/${endpoint}`;
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
