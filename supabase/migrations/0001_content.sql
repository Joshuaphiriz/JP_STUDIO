CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint,
	"width" integer,
	"height" integer,
	"duration_sec" integer,
	"alt_text" text,
	"tags" text[],
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"social_account_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"caption_override" text,
	"media_ids_override" uuid[],
	"first_comment_override" text,
	"options" jsonb,
	"status" "post_status" DEFAULT 'scheduled' NOT NULL,
	"external_post_id" text,
	"permalink" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_posts_post_account_uq" UNIQUE("post_id","social_account_id")
);
--> statement-breakpoint
CREATE TABLE "post_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"edited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"media_ids" uuid[] DEFAULT '{}' NOT NULL,
	"first_comment" text,
	"category" text,
	"tags" text[],
	"internal_notes" text,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_name" text,
	"queue_id" uuid,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "queues_ws_name_uq" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"queue_id" uuid,
	"social_account_id" uuid,
	"weekday" integer NOT NULL,
	"minute_of_day" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_posts" ADD CONSTRAINT "platform_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_posts" ADD CONSTRAINT "platform_posts_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_versions" ADD CONSTRAINT "post_versions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_versions" ADD CONSTRAINT "post_versions_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queues" ADD CONSTRAINT "queues_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_queue_id_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_ws_idx" ON "media_assets" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_posts_status_idx" ON "platform_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "post_versions_post_idx" ON "post_versions" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_ws_status_idx" ON "posts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "posts_ws_scheduled_idx" ON "posts" USING btree ("workspace_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "time_slots_ws_idx" ON "time_slots" USING btree ("workspace_id");