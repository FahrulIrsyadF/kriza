CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50),
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(100),
	"phone" varchar(30),
	"email" varchar(100),
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "drug_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drug_id" uuid NOT NULL,
	"rate_type_code" varchar(30) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"margin_percent" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drug_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"expiry_date" date NOT NULL,
	"purchase_date" date DEFAULT CURRENT_DATE NOT NULL,
	"supplier_id" uuid,
	"supplier_name" varchar(255),
	"storage_location" varchar(50) DEFAULT 'GUDANG_FARMASI' NOT NULL,
	"purchase_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"initial_qty" integer NOT NULL,
	"current_qty" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "shift_stock_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_date" date DEFAULT CURRENT_DATE NOT NULL,
	"shift_type" varchar(20) NOT NULL,
	"shift_start_time" time,
	"shift_end_time" time,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"opened_by" uuid,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_stock_log_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_log_id" uuid NOT NULL,
	"drug_id" uuid NOT NULL,
	"stock_start" integer NOT NULL,
	"usage_shift" integer DEFAULT 0 NOT NULL,
	"usage_non_shift" integer DEFAULT 0 NOT NULL,
	"adjustment" integer DEFAULT 0 NOT NULL,
	"stock_end" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_number" varchar(50) NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"pharmacist_id" uuid,
	"dispensed_at" timestamp with time zone,
	"cancellation_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prescriptions_prescription_number_unique" UNIQUE("prescription_number")
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"drug_id" uuid NOT NULL,
	"drug_name" varchar(255) NOT NULL,
	"dosage_form" varchar(50),
	"quantity" integer NOT NULL,
	"unit" varchar(30) DEFAULT 'TABLET' NOT NULL,
	"signa" varchar(255) NOT NULL,
	"duration_days" integer,
	"dispensed_qty" integer DEFAULT 0 NOT NULL,
	"batch_id" uuid,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "drug_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"drug_id" uuid NOT NULL,
	"movement_type" varchar(40) NOT NULL,
	"quantity" integer NOT NULL,
	"quantity_before" integer NOT NULL,
	"quantity_after" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"shift_log_id" uuid,
	"prescription_item_id" uuid,
	"reason" text,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "stock_opnames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opname_date" date DEFAULT CURRENT_DATE NOT NULL,
	"period" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"finalized_by" uuid
);
--> statement-breakpoint
CREATE TABLE "stock_opname_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opname_id" uuid NOT NULL,
	"drug_id" uuid NOT NULL,
	"batch_id" uuid,
	"system_qty" integer NOT NULL,
	"physical_qty" integer NOT NULL,
	"selisih" integer DEFAULT 0 NOT NULL,
	"expiry_date" date,
	"expiry_notes" text,
	"adjustment_reason" text,
	"recorded_by" uuid
);
--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "dosage_form" varchar(50) DEFAULT 'TABLET' NOT NULL;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "default_markup_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "bpjs_drug_code" varchar(50);--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "default_signa" varchar(100);--> statement-breakpoint
ALTER TABLE "drugs" ADD COLUMN "manufacturer" varchar(100);--> statement-breakpoint
ALTER TABLE "drug_prices" ADD CONSTRAINT "drug_prices_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_batches" ADD CONSTRAINT "drug_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_stock_logs" ADD CONSTRAINT "shift_stock_logs_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_stock_logs" ADD CONSTRAINT "shift_stock_logs_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_stock_log_items" ADD CONSTRAINT "shift_stock_log_items_shift_log_id_shift_stock_logs_id_fk" FOREIGN KEY ("shift_log_id") REFERENCES "public"."shift_stock_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_stock_log_items" ADD CONSTRAINT "shift_stock_log_items_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_pharmacist_id_users_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_batch_id_drug_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."drug_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_stock_movements" ADD CONSTRAINT "drug_stock_movements_batch_id_drug_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."drug_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_stock_movements" ADD CONSTRAINT "drug_stock_movements_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_stock_movements" ADD CONSTRAINT "drug_stock_movements_shift_log_id_shift_stock_logs_id_fk" FOREIGN KEY ("shift_log_id") REFERENCES "public"."shift_stock_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_stock_movements" ADD CONSTRAINT "drug_stock_movements_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_stock_movements" ADD CONSTRAINT "drug_stock_movements_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_opname_id_stock_opnames_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_batch_id_drug_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."drug_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;