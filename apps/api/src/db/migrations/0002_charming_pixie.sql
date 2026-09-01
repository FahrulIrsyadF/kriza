CREATE TABLE "provinsi" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kabupaten" (
	"id" integer PRIMARY KEY NOT NULL,
	"provinsi_id" integer,
	"name" varchar(100) NOT NULL,
	"is_city" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "kecamatan" (
	"id" integer PRIMARY KEY NOT NULL,
	"kabupaten_id" integer,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kelurahan" (
	"id" integer PRIMARY KEY NOT NULL,
	"kecamatan_id" integer,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_record_number" varchar(30) NOT NULL,
	"name" varchar(255) NOT NULL,
	"identity_type" varchar(30) DEFAULT 'KTP' NOT NULL,
	"identity_number" varchar(50),
	"gender" varchar(20) NOT NULL,
	"birth_place" varchar(100),
	"birth_date" date NOT NULL,
	"blood_type" varchar(10) DEFAULT '-',
	"rhesus" varchar(5) DEFAULT '+',
	"address" text,
	"residence_address" text,
	"provinsi_id" integer,
	"kabupaten_id" integer,
	"kecamatan_id" integer,
	"kelurahan_id" integer,
	"education" varchar(50),
	"occupation" varchar(100),
	"nationality" varchar(30) DEFAULT 'WNI' NOT NULL,
	"religion" varchar(50),
	"ethnicity" varchar(50) DEFAULT 'JAWA',
	"marital_status" varchar(50) DEFAULT 'BELUM MENIKAH',
	"phone" varchar(30),
	"parent_name" varchar(255),
	"language" varchar(50) DEFAULT 'INDONESIA',
	"insurance_type" varchar(50) DEFAULT 'UMUM' NOT NULL,
	"bpjs_number" varchar(50),
	"no_kk" varchar(50),
	"ihs_number" varchar(50),
	"allergies_notes" text,
	"chronic_diseases_notes" text,
	"is_deceased" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "patients_medical_record_number_unique" UNIQUE("medical_record_number")
);
--> statement-breakpoint
CREATE TABLE "patient_allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"allergen_type" varchar(50) DEFAULT 'Obat' NOT NULL,
	"allergen_name" varchar(255) NOT NULL,
	"severity" varchar(30) DEFAULT 'Sedang' NOT NULL,
	"reaction" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kabupaten" ADD CONSTRAINT "kabupaten_provinsi_id_provinsi_id_fk" FOREIGN KEY ("provinsi_id") REFERENCES "public"."provinsi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kecamatan" ADD CONSTRAINT "kecamatan_kabupaten_id_kabupaten_id_fk" FOREIGN KEY ("kabupaten_id") REFERENCES "public"."kabupaten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelurahan" ADD CONSTRAINT "kelurahan_kecamatan_id_kecamatan_id_fk" FOREIGN KEY ("kecamatan_id") REFERENCES "public"."kecamatan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_provinsi_id_provinsi_id_fk" FOREIGN KEY ("provinsi_id") REFERENCES "public"."provinsi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_kabupaten_id_kabupaten_id_fk" FOREIGN KEY ("kabupaten_id") REFERENCES "public"."kabupaten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_kecamatan_id_kecamatan_id_fk" FOREIGN KEY ("kecamatan_id") REFERENCES "public"."kecamatan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_kelurahan_id_kelurahan_id_fk" FOREIGN KEY ("kelurahan_id") REFERENCES "public"."kelurahan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_emergency_contacts" ADD CONSTRAINT "patient_emergency_contacts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Indexes untuk performa pencarian pasien & query wilayah
CREATE INDEX "idx_patients_mrn" ON "patients" ("medical_record_number");--> statement-breakpoint
CREATE INDEX "idx_patients_name" ON "patients" ("name");--> statement-breakpoint
CREATE INDEX "idx_patients_identity" ON "patients" ("identity_number");--> statement-breakpoint
CREATE INDEX "idx_patients_phone" ON "patients" ("phone");--> statement-breakpoint
CREATE INDEX "idx_patients_birth_date" ON "patients" ("birth_date");--> statement-breakpoint
CREATE INDEX "idx_patients_bpjs" ON "patients" ("bpjs_number");--> statement-breakpoint
CREATE INDEX "idx_patients_ihs" ON "patients" ("ihs_number");--> statement-breakpoint
CREATE INDEX "idx_patients_active_del" ON "patients" ("is_active", "deleted_at");--> statement-breakpoint
CREATE INDEX "idx_kabupaten_provinsi" ON "kabupaten" ("provinsi_id");--> statement-breakpoint
CREATE INDEX "idx_kecamatan_kabupaten" ON "kecamatan" ("kabupaten_id");--> statement-breakpoint
CREATE INDEX "idx_kelurahan_kecamatan" ON "kelurahan" ("kecamatan_id");--> statement-breakpoint
CREATE INDEX "idx_allergies_patient" ON "patient_allergies" ("patient_id");