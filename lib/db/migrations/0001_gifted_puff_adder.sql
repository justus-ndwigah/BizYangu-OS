ALTER TABLE "shop_settings" ALTER COLUMN "shop_name" SET DEFAULT 'My Shop';--> statement-breakpoint
ALTER TABLE "shop_settings" ALTER COLUMN "receipt_footer" SET DEFAULT 'Thank you for shopping with us!';--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "served_by_id" varchar;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "served_by_name" text;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_served_by_id_users_id_fk" FOREIGN KEY ("served_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;