CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" varchar(30) NOT NULL,
	"patient_id" uuid NOT NULL,
	"polyclinic_id" uuid NOT NULL,
	"practitioner_id" uuid,
	"schedule_id" uuid,
	"registration_date" date DEFAULT CURRENT_DATE NOT NULL,
	"visit_type" varchar(20) DEFAULT 'LAMA' NOT NULL,
	"registration_source" varchar(30) DEFAULT 'LANGSUNG' NOT NULL,
	"mjkn_booking_code" varchar(100),
	"mjkn_appointment_date" date,
	"mjkn_appointment_time" varchar(10),
	"mjkn_queue_number" varchar(20),
	"mjkn_raw_payload" text,
	"payment_method" varchar(50) DEFAULT 'UMUM' NOT NULL,
	"bpjs_card_number" varchar(50),
	"insurance_name" varchar(100),
	"insurance_policy_number" varchar(50),
	"referral_number" varchar(50),
	"referral_from" varchar(255),
	"complaint" text,
	"vital_signs_notes" text,
	"notes" text,
	"status" varchar(30) DEFAULT 'MENUNGGU' NOT NULL,
	"estimated_time" varchar(10),
	"referred_to_polyclinic_id" uuid,
	"referred_to_practitioner_id" uuid,
	"registered_by" uuid,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"polyclinic_id" uuid NOT NULL,
	"queue_number" varchar(20) NOT NULL,
	"queue_sequence" integer NOT NULL,
	"queue_date" date DEFAULT CURRENT_DATE NOT NULL,
	"queue_source" varchar(30) DEFAULT 'LANGSUNG' NOT NULL,
	"status" varchar(30) DEFAULT 'MENUNGGU' NOT NULL,
	"called_counter" integer DEFAULT 0 NOT NULL,
	"called_at" timestamp with time zone,
	"served_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queues_registration_id_unique" UNIQUE("registration_id")
);
--> statement-breakpoint
CREATE TABLE "queue_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_id" uuid NOT NULL,
	"counter_name" varchar(50),
	"called_by" uuid,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_referred_to_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("referred_to_polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_referred_to_practitioner_id_practitioners_id_fk" FOREIGN KEY ("referred_to_practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_registered_by_users_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_polyclinic_id_polyclinics_id_fk" FOREIGN KEY ("polyclinic_id") REFERENCES "public"."polyclinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_calls" ADD CONSTRAINT "queue_calls_queue_id_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_calls" ADD CONSTRAINT "queue_calls_called_by_users_id_fk" FOREIGN KEY ("called_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;