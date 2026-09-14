"use server";

import { cookies } from "next/headers";
import {
  loadWorkspaceSurveys,
  saveWorkspaceSurvey,
  changeWorkspaceSurvey,
  recordResponseCommitment,
} from "@/infrastructure/database/survey-repository";
import {
  newWorkspaceToken,
  workspaceKey,
} from "@/infrastructure/workspace-token";
import { parseSurveyInput } from "./survey-input";
import { parseResponseEnvelope } from "./survey-input";
import type { Survey } from "@/domain/survey/survey";

const cookieName = "proofpulse_workspace";
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function submitResponseAction(input: unknown) {
  try {
    const envelope = parseResponseEnvelope(input);
    const token = (await cookies()).get(cookieName)?.value;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      return { ok: false as const, error: "Open your survey workspace first." };
    return {
      ok: true as const,
      data: await recordResponseCommitment(workspaceKey(token), envelope),
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof RangeError
          ? error.message
          : "Response commitment could not be recorded. Retry before assuming it was accepted.",
    };
  }
}

export async function surveyLifecycleAction(
  id: string,
  operation: "edit" | "close" | "check",
  input?: unknown,
): Promise<Result<Survey>> {
  try {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      return { ok: false, error: "Open your survey workspace first." };
    let validated;
    if (operation === "edit") {
      try { validated = parseSurveyInput(input); }
      catch { return { ok: false, error: "Invalid public survey fields or dates." }; }
    } else validated = input;
    return { ok: true, data: await changeWorkspaceSurvey(workspaceKey(token), id, operation, validated) };
  } catch (error) {
    return { ok: false, error: error instanceof RangeError ? error.message : "Survey storage is unavailable. Retry before continuing." };
  }
}

export async function loadSurveysAction(): Promise<Result<Survey[]>> {
  try {
    const jar = await cookies();
    const existing = jar.get(cookieName)?.value;
    const token =
      existing && /^[A-Za-z0-9_-]{43}$/.test(existing)
        ? existing
        : newWorkspaceToken();
    const data = await loadWorkspaceSurveys(workspaceKey(token));
    if (token !== existing)
      jar.set(cookieName, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error:
        "Survey storage is unavailable. Please try again shortly. No local fallback has been saved.",
    };
  }
}

export async function createSurveyAction(
  input: unknown,
): Promise<Result<Survey>> {
  let validated;
  try {
    validated = parseSurveyInput(input);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid survey fields.",
    };
  }
  try {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token)
      return {
        ok: false,
        error: "Open your survey workspace before creating a survey.",
      };
    return {
      ok: true,
      data: await saveWorkspaceSurvey(workspaceKey(token), validated),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof RangeError
          ? "This browser workspace has reached its limit of 500 surveys."
          : "Survey could not be saved. Please retry; do not assume it was stored.",
    };
  }
}
