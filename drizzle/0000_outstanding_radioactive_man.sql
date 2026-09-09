CREATE TABLE `quote_throttle` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quote_throttle_expiry_idx` ON `quote_throttle` (`expires_at`);--> statement-breakpoint
CREATE TABLE `quote_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`payload` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`vehicle` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_reference_unique` ON `quote_requests` (`reference`);--> statement-breakpoint
CREATE INDEX `quotes_created_idx` ON `quote_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `quotes_status_created_idx` ON `quote_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
