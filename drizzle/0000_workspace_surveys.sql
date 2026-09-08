CREATE TABLE "pp_surveys" (
	"workspace_id" varchar(64) NOT NULL,
	"id" text NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" varchar(2000) NOT NULL,
	"eligibility" varchar(500) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pp_surveys_workspace_id_id_pk" PRIMARY KEY("workspace_id","id"),
	CONSTRAINT "pp_surveys_date_order" CHECK ("pp_surveys"."ends_at" > "pp_surveys"."starts_at"),
	CONSTRAINT "pp_surveys_title_length" CHECK (length(btrim("pp_surveys"."title")) >= 3),
	CONSTRAINT "pp_surveys_description_length" CHECK (length(btrim("pp_surveys"."description")) >= 10),
	CONSTRAINT "pp_surveys_eligibility_length" CHECK (length(btrim("pp_surveys"."eligibility")) >= 5)
);
--> statement-breakpoint
CREATE TABLE "pp_workspaces" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pp_surveys" ADD CONSTRAINT "pp_surveys_workspace_id_pp_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."pp_workspaces"("id") ON DELETE cascade ON UPDATE no action;