CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` integer NOT NULL,
	`session_epoch` integer DEFAULT 0 NOT NULL,
	`csrf_token` text NOT NULL,
	`user_agent` text,
	`ip` text,
	`remember_me` integer DEFAULT false NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_user` ON `admin_sessions` (`admin_user_id`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT 'Store Owner' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`last_login_ip` text,
	`password_changed_at` integer,
	`session_epoch` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_users_email` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`scopes` text DEFAULT '[]' NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_tokens_hash` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_type` text DEFAULT 'admin' NOT NULL,
	`actor_id` integer,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`ip` text,
	`user_agent` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`ip` text,
	`success` integer DEFAULT false NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_login_attempts_email` ON `login_attempts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_login_attempts_ip` ON `login_attempts` (`ip`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_password_reset_token` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`label` text,
	`first_name` text,
	`last_name` text,
	`company` text,
	`phone` text,
	`line1` text NOT NULL,
	`line2` text,
	`city` text NOT NULL,
	`province` text,
	`postal_code` text,
	`country` text DEFAULT 'PH' NOT NULL,
	`is_default_shipping` integer DEFAULT false NOT NULL,
	`is_default_billing` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_customer_addresses_customer` ON `customer_addresses` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` integer NOT NULL,
	`csrf_token` text NOT NULL,
	`user_agent` text,
	`ip` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_customer_sessions_customer` ON `customer_sessions` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`phone` text,
	`password_hash` text,
	`password_salt` text,
	`is_guest` integer DEFAULT true NOT NULL,
	`marketing_consent` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`tags` text,
	`note` text,
	`orders_count` integer DEFAULT 0 NOT NULL,
	`total_spent` integer DEFAULT 0 NOT NULL,
	`last_order_at` integer,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customers_email` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`image_asset_id` integer,
	`parent_id` integer,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_slug` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `collection_products` (
	`collection_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collection_products_pk` ON `collection_products` (`collection_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `idx_collection_products_product` ON `collection_products` (`product_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`image_asset_id` integer,
	`type` text DEFAULT 'manual' NOT NULL,
	`rules` text,
	`rules_match` text DEFAULT 'all' NOT NULL,
	`sort_order` text DEFAULT 'manual' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collections_slug` ON `collections` (`slug`);--> statement-breakpoint
CREATE TABLE `inventory_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`idempotency_key` text,
	`reference_type` text,
	`reference_id` text,
	`actor_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_adjustments_variant` ON `inventory_adjustments` (`variant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_adjustments_idem` ON `inventory_adjustments` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`on_hand` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 5 NOT NULL,
	`tracked` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_items_variant` ON `inventory_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `product_categories` (
	`product_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_product_categories_pk` ON `product_categories` (`product_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `idx_product_categories_category` ON `product_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`alt_text` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_product_images_product` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_option_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`option_id` integer NOT NULL,
	`value` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`option_id`) REFERENCES `product_options`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_product_option_values_option` ON `product_option_values` (`option_id`);--> statement-breakpoint
CREATE TABLE `product_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_product_options_product` ON `product_options` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`title` text DEFAULT 'Default' NOT NULL,
	`option_value_ids` text,
	`sku` text,
	`barcode` text,
	`price` integer,
	`compare_at_price` integer,
	`cost_per_item` integer,
	`weight_grams` integer,
	`image_asset_id` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_product_variants_product` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_product_variants_sku` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`compare_at_price` integer,
	`cost_per_item` integer,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`taxable` integer DEFAULT true NOT NULL,
	`sku` text,
	`barcode` text,
	`track_inventory` integer DEFAULT true NOT NULL,
	`continue_selling_oos` integer DEFAULT false NOT NULL,
	`low_stock_threshold` integer DEFAULT 5 NOT NULL,
	`requires_shipping` integer DEFAULT true NOT NULL,
	`weight_grams` integer,
	`length_mm` integer,
	`width_mm` integer,
	`height_mm` integer,
	`brand` text,
	`tags` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`has_variants` integer DEFAULT false NOT NULL,
	`featured_image_asset_id` integer,
	`seo_title` text,
	`seo_description` text,
	`og_image_asset_id` integer,
	`canonical_url` text,
	`rating_average` integer DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_slug` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_products_status` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `idx_products_featured` ON `products` (`is_featured`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`customer_id` integer,
	`order_id` integer,
	`author_name` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`body` text,
	`is_verified_purchase` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_reply` text,
	`admin_reply_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_product` ON `reviews` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_status` ON `reviews` (`status`);--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cart_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cart_items_cart` ON `cart_items` (`cart_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cart_items_unique` ON `cart_items` (`cart_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `carts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`customer_id` integer,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`discount_code` text,
	`status` text DEFAULT 'active' NOT NULL,
	`converted_order_id` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_carts_token` ON `carts` (`token`);--> statement-breakpoint
CREATE INDEX `idx_carts_customer` ON `carts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `checkout_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`checkout_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`variant_id` integer NOT NULL,
	`name` text NOT NULL,
	`variant_title` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`checkout_id`) REFERENCES `checkouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_checkout_items_checkout` ON `checkout_items` (`checkout_id`);--> statement-breakpoint
CREATE TABLE `checkouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`cart_id` integer,
	`customer_id` integer,
	`email` text,
	`phone` text,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`step` text DEFAULT 'contact' NOT NULL,
	`discount_code` text,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`shipping_total` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`grand_total` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`abandoned_at` integer,
	`recovered_at` integer,
	`recovery_email_sent_at` integer,
	`last_activity_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_checkouts_token` ON `checkouts` (`token`);--> statement-breakpoint
CREATE INDEX `idx_checkouts_abandoned` ON `checkouts` (`abandoned_at`);--> statement-breakpoint
CREATE TABLE `order_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`type` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`company` text,
	`phone` text,
	`line1` text,
	`line2` text,
	`city` text,
	`province` text,
	`postal_code` text,
	`country` text DEFAULT 'PH' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_order_addresses_order` ON `order_addresses` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`variant_id` integer,
	`name` text NOT NULL,
	`variant_title` text,
	`sku` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`total_price` integer DEFAULT 0 NOT NULL,
	`fulfilled_quantity` integer DEFAULT 0 NOT NULL,
	`refunded_quantity` integer DEFAULT 0 NOT NULL,
	`requires_shipping` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`body` text NOT NULL,
	`visibility` text DEFAULT 'internal' NOT NULL,
	`actor_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_order_notes_order` ON `order_notes` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`field` text NOT NULL,
	`from_value` text,
	`to_value` text NOT NULL,
	`note` text,
	`actor_type` text DEFAULT 'admin' NOT NULL,
	`actor_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_order_status_history_order` ON `order_status_history` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`customer_id` integer,
	`email` text NOT NULL,
	`phone` text,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`shipping_total` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`extra_charges_total` integer DEFAULT 0 NOT NULL,
	`grand_total` integer DEFAULT 0 NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`amount_refunded` integer DEFAULT 0 NOT NULL,
	`discount_code` text,
	`payment_method` text,
	`shipping_method_name` text,
	`customer_note` text,
	`internal_note` text,
	`metadata` text,
	`idempotency_key` text,
	`checkout_id` integer,
	`placed_at` integer,
	`cancelled_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_number` ON `orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_idempotency` ON `orders` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_created` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payment_id` integer,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`external_event_id` text,
	`payload` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_events_external` ON `payment_events` (`provider`,`external_event_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`provider` text NOT NULL,
	`method` text,
	`reference` text,
	`amount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`failure_reason` text,
	`gateway_response` text,
	`idempotency_key` text,
	`paid_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_payments_order` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_reference` ON `payments` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_idempotency` ON `payments` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`payment_id` integer,
	`amount` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'PHP' NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`restock` integer DEFAULT true NOT NULL,
	`reference` text,
	`actor_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_refunds_order` ON `refunds` (`order_id`);--> statement-breakpoint
CREATE TABLE `shipment_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shipment_id` integer NOT NULL,
	`status` text NOT NULL,
	`description` text,
	`location` text,
	`occurred_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_shipment_events_shipment` ON `shipment_events` (`shipment_id`);--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`courier` text,
	`service` text,
	`tracking_number` text,
	`tracking_url` text,
	`label_asset_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`shipped_at` integer,
	`estimated_delivery_at` integer,
	`delivered_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_shipments_order` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_shipments_tracking` ON `shipments` (`tracking_number`);--> statement-breakpoint
CREATE TABLE `shipping_methods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'flat_rate' NOT NULL,
	`rate` integer DEFAULT 0 NOT NULL,
	`estimated_days` text,
	`min_order` integer,
	`max_order` integer,
	`min_weight_grams` integer,
	`max_weight_grams` integer,
	`zone_id` integer,
	`provider` text DEFAULT 'manual' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_shipping_methods_zone` ON `shipping_methods` (`zone_id`);--> statement-breakpoint
CREATE TABLE `shipping_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`method_id` integer NOT NULL,
	`min_value` integer DEFAULT 0 NOT NULL,
	`max_value` integer,
	`rate` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`method_id`) REFERENCES `shipping_methods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_shipping_rates_method` ON `shipping_rates` (`method_id`);--> statement-breakpoint
CREATE TABLE `shipping_zones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`countries` text,
	`provinces` text,
	`postal_patterns` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers_discounts` (
	`discount_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customers_discounts_pk` ON `customers_discounts` (`discount_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `discount_redemptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discount_id` integer NOT NULL,
	`order_id` integer,
	`customer_id` integer,
	`amount` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_discount_redemptions_discount` ON `discount_redemptions` (`discount_id`);--> statement-breakpoint
CREATE INDEX `idx_discount_redemptions_customer` ON `discount_redemptions` (`customer_id`);--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`type` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`is_automatic` integer DEFAULT false NOT NULL,
	`min_purchase` integer,
	`min_quantity` integer,
	`first_order_only` integer DEFAULT false NOT NULL,
	`applies_to` text DEFAULT 'all' NOT NULL,
	`eligible_product_ids` text,
	`eligible_category_ids` text,
	`eligible_collection_ids` text,
	`usage_limit` integer,
	`per_customer_limit` integer,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`combines_with_product` integer DEFAULT false NOT NULL,
	`combines_with_shipping` integer DEFAULT false NOT NULL,
	`buy_quantity` integer,
	`get_quantity` integer,
	`starts_at` integer,
	`ends_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_discounts_code` ON `discounts` (`code`);--> statement-breakpoint
CREATE INDEX `idx_discounts_active` ON `discounts` (`is_active`);--> statement-breakpoint
CREATE TABLE `loyalty_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`lifetime_earned` integer DEFAULT 0 NOT NULL,
	`lifetime_redeemed` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_loyalty_accounts_customer` ON `loyalty_accounts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`order_id` integer,
	`note` text,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `loyalty_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_loyalty_transactions_account` ON `loyalty_transactions` (`account_id`);--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blog_categories_slug` ON `blog_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `blog_post_tags` (
	`post_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `blog_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blog_post_tags_pk` ON `blog_post_tags` (`post_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text,
	`overview` text,
	`body` text,
	`featured_image_asset_id` integer,
	`image_caption` text,
	`author` text,
	`category_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`read_time_minutes` integer,
	`seo_title` text,
	`seo_description` text,
	`og_image_asset_id` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `blog_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blog_posts_slug` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_blog_posts_status` ON `blog_posts` (`status`);--> statement-breakpoint
CREATE TABLE `blog_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blog_tags_slug` ON `blog_tags` (`slug`);--> statement-breakpoint
CREATE TABLE `homepage_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`settings` text,
	`draft_settings` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_homepage_sections_position` ON `homepage_sections` (`position`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`object_key` text NOT NULL,
	`url` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`folder` text DEFAULT 'uploads' NOT NULL,
	`ref_count` integer DEFAULT 0 NOT NULL,
	`uploaded_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_assets_key` ON `media_assets` (`object_key`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`parent_id` integer,
	`label` text NOT NULL,
	`link_type` text DEFAULT 'url' NOT NULL,
	`url` text,
	`ref_id` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_menu_items_menu` ON `menu_items` (`menu_id`);--> statement-breakpoint
CREATE TABLE `menus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`handle` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_menus_handle` ON `menus` (`handle`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`content` text,
	`template` text DEFAULT 'default' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`og_image_asset_id` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pages_slug` ON `pages` (`slug`);--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`is_connected` integer DEFAULT false NOT NULL,
	`config` text,
	`last_synced_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_integrations_key` ON `integrations` (`key`);--> statement-breakpoint
CREATE TABLE `notification_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_key` text,
	`channel` text DEFAULT 'email' NOT NULL,
	`recipient` text NOT NULL,
	`subject` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`error` text,
	`reference_type` text,
	`reference_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notification_logs_recipient` ON `notification_logs` (`recipient`);--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`subject` text,
	`body` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_notification_templates_key` ON `notification_templates` (`key`,`channel`);--> statement-breakpoint
CREATE TABLE `store_settings` (
	`group` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theme_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`webhook_id` integer NOT NULL,
	`event` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`response_code` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`payload` text,
	`last_attempt_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_webhook_deliveries_webhook` ON `webhook_deliveries` (`webhook_id`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`events` text NOT NULL,
	`signing_secret` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`path` text,
	`product_id` integer,
	`order_id` integer,
	`value` integer,
	`referrer` text,
	`source` text,
	`device` text,
	`country` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_events_type` ON `analytics_events` (`type`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_session` ON `analytics_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_created` ON `analytics_events` (`created_at`);