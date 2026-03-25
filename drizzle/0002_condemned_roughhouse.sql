CREATE TABLE "page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"author" text NOT NULL,
	"featured_image" text,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_tenant_slug_uniq" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"s3_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"config_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "addons_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tenant_addon_configs" (
	"tenant_id" uuid NOT NULL,
	"addon_key" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "tenant_addon_configs_tenant_id_addon_key_pk" PRIMARY KEY("tenant_id","addon_key")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "enabled_addons" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_addon_configs" ADD CONSTRAINT "tenant_addon_configs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_addon_configs" ADD CONSTRAINT "tenant_addon_configs_addon_key_addons_key_fk" FOREIGN KEY ("addon_key") REFERENCES "public"."addons"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_versions_page_id_idx" ON "page_versions" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "blog_posts_tenant_id_idx" ON "blog_posts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "media_tenant_id_idx" ON "media" USING btree ("tenant_id");