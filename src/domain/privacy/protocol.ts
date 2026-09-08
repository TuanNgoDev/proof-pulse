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
