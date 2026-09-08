import { createHash, randomBytes } from "node:crypto";

export function newWorkspaceToken() {
  return randomBytes(32).toString("base64url");
}
export function workspaceKey(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error("Invalid browser workspace.");
  return createHash("sha256").update(token).digest("hex");
}
