CREATE TABLE "pp_response_commitments" (
	"workspace_id" varchar(64) NOT NULL,
	"survey_id" text NOT NULL,
	"id" varchar(64) NOT NULL,
	"commitment" varchar(64) NOT NULL,
	"nullifier" varchar(64) NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pp_response_commitments_workspace_id_id_pk" PRIMARY KEY("workspace_id","id"),
	CONSTRAINT "pp_response_commitments_nullifier" UNIQUE("workspace_id","survey_id","nullifier"),
	CONSTRAINT "pp_response_commitments_value" UNIQUE("workspace_id","survey_id","commitment"),
	CONSTRAINT "pp_response_commitments_hex" CHECK ("pp_response_commitments"."commitment" ~ '^[a-f0-9]{64}$' AND "pp_response_commitments"."nullifier" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "pp_response_commitments" ADD CONSTRAINT "pp_response_commitments_workspace_id_pp_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."pp_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pp_response_commitments" ADD CONSTRAINT "pp_response_commitments_workspace_id_survey_id_pp_surveys_workspace_id_id_fk" FOREIGN KEY ("workspace_id","survey_id") REFERENCES "public"."pp_surveys"("workspace_id","id") ON DELETE cascade ON UPDATE no action;