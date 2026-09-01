CREATE TABLE "polyclinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "polyclinics_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"code" varchar(30) NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(50),
	"sip" varchar(100),
	"specialization" varchar(100) DEFAULT 'Umum' NOT NULL,
	"phone" varchar(25),
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "practitioners_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"polyclinic_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"quota" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) DEFAULT 'Tindakan' NOT NULL,
	"polyclinic_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "procedures_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rate_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	CONSTRAINT "rate_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "service_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"procedure_id" uuid NOT NULL,
	"rate_type_id" uuid NOT NULL,
	"tariff" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "drug_units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "drugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"generic_name" varchar(255),
	"category" varchar(50) DEFAULT 'Obat Bebas' NOT NULL,
	"unit_id" uuid,
	"base_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"min_stock" integer DEFAULT 10 NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "drugs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "icd10_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"name_id" varchar(255),
	"is_terminal" boolean DEFAULT true NOT NULL,
	CONSTRAINT "icd10_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_rates" ADD CONSTRAINT "service_rates_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_rates" ADD CONSTRAINT "service_rates_rate_type_id_rate_types_id_fk" FOREIGN KEY ("rate_type_id") REFERENCES "public"."rate_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drugs" ADD CONSTRAINT "drugs_unit_id_drug_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."drug_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Indexes untuk performa pencarian master data
CREATE INDEX "idx_polyclinics_code" ON "polyclinics" ("code");--> statement-breakpoint
CREATE INDEX "idx_practitioners_code" ON "practitioners" ("code");--> statement-breakpoint
CREATE INDEX "idx_practitioners_is_active" ON "practitioners" ("is_active", "deleted_at");--> statement-breakpoint
CREATE INDEX "idx_schedules_practitioner_poly" ON "schedules" ("practitioner_id", "polyclinic_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_day_of_week" ON "schedules" ("day_of_week");--> statement-breakpoint
CREATE INDEX "idx_procedures_code" ON "procedures" ("code");--> statement-breakpoint
CREATE INDEX "idx_procedures_polyclinic" ON "procedures" ("polyclinic_id");--> statement-breakpoint
CREATE INDEX "idx_drugs_code" ON "drugs" ("code");--> statement-breakpoint
CREATE INDEX "idx_drugs_name" ON "drugs" ("name");--> statement-breakpoint
CREATE INDEX "idx_drugs_is_active" ON "drugs" ("is_active", "deleted_at");--> statement-breakpoint
CREATE INDEX "idx_icd10_code" ON "icd10_codes" ("code");--> statement-breakpoint
CREATE INDEX "idx_service_rates_proc_rate" ON "service_rates" ("procedure_id", "rate_type_id");