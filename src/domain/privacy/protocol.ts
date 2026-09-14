// Future integration contracts. No production implementation exists in this pass.
export type ParticipantProof = {
  surveyId: string;
  proofBytes: Uint8Array;
  publicInputs: Uint8Array;
};

export type SurveyNullifier = { surveyId: string; value: Uint8Array };

export interface ParticipationProtocol {
  verifyEligibility(proof: ParticipantProof): Promise<boolean>;
  // Must atomically verify survey binding and claim a nullifier on the ledger.
  // A local Set or browser identifier is not anonymous duplicate protection.
  claimParticipation(
    proof: ParticipantProof,
    nullifier: SurveyNullifier,
  ): Promise<"accepted" | "duplicate" | "invalid">;
}

export type PublicResponseEnvelope = {
  surveyId: string;
  commitment: string;
  nullifier: string;
};

export type PreparedResponse = {
  publicEnvelope: PublicResponseEnvelope;
  privateSecret: string;
  privateSalt: string;
};

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  return toHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}

export async function prepareResponseEnvelope(
  surveyId: string,
  response: string,
  privateSecret = toHex(crypto.getRandomValues(new Uint8Array(32))),
  privateSalt = toHex(crypto.getRandomValues(new Uint8Array(32))),
): Promise<PreparedResponse> {
  const normalized = response.trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(surveyId))
    throw new Error("Invalid survey identifier.");
  if (normalized.length < 2 || normalized.length > 2000)
    throw new Error("Response must be between 2 and 2,000 characters.");
  if (!/^[a-f0-9]{64}$/.test(privateSecret) || !/^[a-f0-9]{64}$/.test(privateSalt))
    throw new Error("Response secrets must be 32-byte lowercase hexadecimal values.");
  const nullifier = await sha256(
    `proof-pulse:nullifier:v1\0${surveyId}\0${privateSecret}`,
  );
  const commitment = await sha256(
    `proof-pulse:response:v1\0${surveyId}\0${nullifier}\0${normalized}\0${privateSalt}`,
  );
  return {
    publicEnvelope: { surveyId, commitment, nullifier },
    privateSecret,
    privateSalt,
  };
}
