CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"polyclinic_id" uuid NOT NULL,
	"encounter_date" date DEFAULT CURRENT_DATE NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"finalized_at" timestamp with time zone,
	"finalized_by" uuid,
	"amended_from_id" uuid,
	"amendment_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vital_signs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"systolic" integer,
	"diastolic" integer,
	"heart_rate" integer,
	"respiratory_rate" integer,
	"temperature" numeric(4, 1),
	"oxygen_saturation" integer,
	"weight" numeric(5, 2),
	"height" numeric(5, 2),
	"bmi" numeric(4, 1),
	"bmi_category" varchar(30),
	"waist_circumference" numeric(5, 2),
	"consciousness" varchar(30) DEFAULT 'Compos Mentis',
	"triage" varchar(20) DEFAULT 'HIJAU',
	"physical_exam_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vital_signs_encounter_id_unique" UNIQUE("encounter_id")
);
--> statement-breakpoint
CREATE TABLE "soap_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"subjective" text NOT NULL,
	"objective" text NOT NULL,
	"assessment" text,
	"plan" text,
	"prognosis" varchar(50) DEFAULT 'Bonam',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "soap_notes_encounter_id_unique" UNIQUE("encounter_id")
);
--> statement-breakpoint
CREATE TABLE "encounter_diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"icd10_code" varchar(20) NOT NULL,
	"icd10_name" varchar(255) NOT NULL,
	"diagnosis_type" varchar(20) DEFAULT 'PRIMARY' NOT NULL,
	"diagnosis_case" varchar(20) DEFAULT 'BARU' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"procedure_id" uuid,
	"procedure_code" varchar(30),
	"procedure_name" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"tariff" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encounter_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"referral_type" varchar(20) NOT NULL,
	"referral_number" varchar(50) NOT NULL,
	"target_polyclinic_id" uuid,
	"target_practitioner_id" uuid,
	"internal_consult_reason" text,
	"target_facility_name" varchar(255),
	"target_facility_code" varchar(50),
	"target_polyclinic_name" varchar(100),
	"target_polyclinic_code" varchar(50),
	"referral_reason" text,
	"initial_therapy" text,
	"transportation" varchar(50) DEFAULT 'Mandiri',
	"pcare_no_kunjungan" varchar(50),
	"pcare_no_rujukan" varchar(50),
	"pcare_tacc_code" varchar(10),
	"pcare_tacc_reason" text,
	"pcare_synced_at" timestamp with time zone,
	"pcare_raw_response" text,
	"status" varchar(20) DEFAULT 'ISSUED' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounter_referrals_encounter_id_unique" UNIQUE("encounter_id"),
	CONSTRAINT "encounter_referrals_referral_number_unique" UNIQUE("referral_number")
);
--> statement-breakpoint
CREATE TABLE "encounter_dispositions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"encounter_id" uuid NOT NULL,
	"disposition_type" varchar(50) DEFAULT 'PULANG_BEROBAT_JALAN' NOT NULL,
	"follow_up_date" date,
	"follow_up_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "encounter_dispositions_encounter_id_unique" UNIQUE("encounter_id")
);
--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_diagnoses" ADD CONSTRAINT "encounter_diagnoses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_procedures" ADD CONSTRAINT "encounter_procedures_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_procedures" ADD CONSTRAINT "encounter_procedures_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_referrals" ADD CONSTRAINT "encounter_referrals_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_referrals" ADD CONSTRAINT "encounter_referrals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_referrals" ADD CONSTRAINT "encounter_referrals_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_referrals" ADD CONSTRAINT "encounter_referrals_target_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("target_polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_referrals" ADD CONSTRAINT "encounter_referrals_target_practitioner_id_practitioners_id_fk" FOREIGN KEY ("target_practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounter_dispositions" ADD CONSTRAINT "encounter_dispositions_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;