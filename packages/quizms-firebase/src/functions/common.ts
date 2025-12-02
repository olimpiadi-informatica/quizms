import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { CallableRequest } from "firebase-functions/https";

export type EndpointSuccess<Res> = { success: true; data: Res };
export type EndpointError = { success: false; errorCode: string; error: string };

export type Endpoint<Req, Res = any> = (
  request: CallableRequest<Req>,
  data: Req,
) => Promise<EndpointSuccess<Res> | EndpointError>;

initializeApp();
export const db = getFirestore();
export const auth = getAuth();
