CREATE TYPE "public"."brand_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."model_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."package_level" AS ENUM('basic', 'standard', 'premium');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."photographer_status" AS ENUM('pending', 'approved', 'rejected', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."portfolio_image_status" AS ENUM('pending_review', 'approved', 'rejected', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('photographer', 'customer', 'admin');--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image_url" text NOT NULL,
	"heading" varchar(200),
	"description" text,
	"link_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_featured_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" uuid,
	"title" varchar(200),
	"description" text,
	"image_url" text,
	"link_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"status" "service_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartphone_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"logo_url" text,
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smartphone_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" "model_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photographers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(150) NOT NULL,
	"slug" varchar(150) NOT NULL,
	"profile_photo_url" text,
	"logo_url" text,
	"banner_url" text,
	"about" text,
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"email" varchar(255),
	"instagram_url" text,
	"youtube_url" text,
	"website_url" text,
	"state_id" uuid,
	"city_id" uuid,
	"status" "photographer_status" DEFAULT 'pending' NOT NULL,
	"is_profile_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photographer_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photographer_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"level" "package_level" NOT NULL,
	"name" varchar(150) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"short_description" varchar(300),
	"inclusions" text,
	"detailed_description" text,
	"status" "package_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_price_positive" CHECK (price > 0)
);
--> statement-breakpoint
CREATE TABLE "package_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_images_sort_order_non_negative" CHECK (sort_order >= 0)
);
--> statement-breakpoint
CREATE TABLE "portfolio_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photographer_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" varchar(255),
	"status" "portfolio_image_status" DEFAULT 'pending_review' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_images_sort_order_non_negative" CHECK (sort_order >= 0)
);
--> statement-breakpoint
CREATE TABLE "service_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"photographer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(200),
	"review_text" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_reviews_rating_range" CHECK (rating >= 1 AND rating <= 5)
);
--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_featured_items" ADD CONSTRAINT "homepage_featured_items_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartphone_models" ADD CONSTRAINT "smartphone_models_brand_id_smartphone_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."smartphone_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographers" ADD CONSTRAINT "photographers_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographers" ADD CONSTRAINT "photographers_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_services" ADD CONSTRAINT "photographer_services_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_services" ADD CONSTRAINT "photographer_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_devices" ADD CONSTRAINT "photographer_devices_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photographer_devices" ADD CONSTRAINT "photographer_devices_model_id_smartphone_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."smartphone_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_segments" ADD CONSTRAINT "portfolio_segments_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_segment_id_portfolio_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."portfolio_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_photographer_id_photographers_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."photographers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_reviews" ADD CONSTRAINT "service_reviews_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_state_slug_unique" ON "cities" USING btree ("state_id","slug");--> statement-breakpoint
CREATE INDEX "cities_state_id_idx" ON "cities" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "cities_is_active_idx" ON "cities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "homepage_banners_is_active_idx" ON "homepage_banners" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "homepage_banners_sort_order_idx" ON "homepage_banners" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "homepage_featured_items_photographer_id_idx" ON "homepage_featured_items" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "homepage_featured_items_is_active_idx" ON "homepage_featured_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "homepage_featured_items_sort_order_idx" ON "homepage_featured_items" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "services_slug_unique" ON "services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "smartphone_brands_slug_unique" ON "smartphone_brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "smartphone_brands_status_idx" ON "smartphone_brands" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "smartphone_models_brand_slug_unique" ON "smartphone_models" USING btree ("brand_id","slug");--> statement-breakpoint
CREATE INDEX "smartphone_models_brand_id_idx" ON "smartphone_models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "smartphone_models_status_idx" ON "smartphone_models" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "states_slug_unique" ON "states" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "states_is_active_idx" ON "states" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "photographers_user_id_unique" ON "photographers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photographers_slug_unique" ON "photographers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "photographers_status_idx" ON "photographers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photographers_state_id_idx" ON "photographers" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "photographers_city_id_idx" ON "photographers" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photographer_services_photographer_service_unique" ON "photographer_services" USING btree ("photographer_id","service_id");--> statement-breakpoint
CREATE INDEX "photographer_services_photographer_id_idx" ON "photographer_services" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "photographer_services_service_id_idx" ON "photographer_services" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photographer_devices_photographer_model_unique" ON "photographer_devices" USING btree ("photographer_id","model_id");--> statement-breakpoint
CREATE INDEX "photographer_devices_photographer_id_idx" ON "photographer_devices" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "photographer_devices_model_id_idx" ON "photographer_devices" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_photographer_service_level_unique" ON "packages" USING btree ("photographer_id","service_id","level");--> statement-breakpoint
CREATE INDEX "packages_photographer_id_idx" ON "packages" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "packages_service_id_idx" ON "packages" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "packages_status_idx" ON "packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "packages_level_idx" ON "packages" USING btree ("level");--> statement-breakpoint
CREATE INDEX "package_images_package_id_idx" ON "package_images" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "package_images_sort_order_idx" ON "package_images" USING btree ("package_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_segments_photographer_slug_unique" ON "portfolio_segments" USING btree ("photographer_id","slug");--> statement-breakpoint
CREATE INDEX "portfolio_segments_photographer_id_idx" ON "portfolio_segments" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "portfolio_images_segment_id_idx" ON "portfolio_images" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "portfolio_images_status_idx" ON "portfolio_images" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portfolio_images_sort_order_idx" ON "portfolio_images" USING btree ("segment_id","sort_order");--> statement-breakpoint
CREATE INDEX "service_reviews_reviewer_user_id_idx" ON "service_reviews" USING btree ("reviewer_user_id");--> statement-breakpoint
CREATE INDEX "service_reviews_photographer_id_idx" ON "service_reviews" USING btree ("photographer_id");--> statement-breakpoint
CREATE INDEX "service_reviews_service_id_idx" ON "service_reviews" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "service_reviews_status_idx" ON "service_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_reviews_photographer_service_idx" ON "service_reviews" USING btree ("photographer_id","service_id");