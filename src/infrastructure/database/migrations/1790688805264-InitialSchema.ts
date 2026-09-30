import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790688805264 implements MigrationInterface {
  name = 'InitialSchema1790688805264';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "otp_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "identifier_type" character varying(10) NOT NULL, "identifier_value" character varying(254) NOT NULL, "code_hash" character(64), "attempts" integer NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_9d0487965ac1837d57fec4d6a26" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_otp_codes_identifier" ON "otp_codes" ("identifier_type", "identifier_value") `,
    );
    await queryRunner.query(`CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'ADMIN')`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(16) NOT NULL, "password_hash" character varying(72) NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'CUSTOMER', CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") `);
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_refresh_tokens_user_id" ON "refresh_tokens" ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "description" text, "category" character varying(80) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_products_category_active" ON "products" ("category", "is_active") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_products_name" ON "products" ("name") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_variants" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "product_id" uuid NOT NULL, "name" character varying(80) NOT NULL, "sku" character varying(64) NOT NULL, "price_minor" integer NOT NULL, "is_available" boolean NOT NULL DEFAULT true, "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "ck_product_variants_price_non_negative" CHECK ("price_minor" >= 0), CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_product_variants_product_id" ON "product_variants" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_variants_product_name" ON "product_variants" ("product_id", "name") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_variants_sku" ON "product_variants" ("sku") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_carts_user_id" ON "carts" ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "cart_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "ck_cart_items_quantity" CHECK ("quantity" BETWEEN 1 AND 99), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_cart_items_variant_id" ON "cart_items" ("variant_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_cart_items_cart_variant" ON "cart_items" ("cart_id", "variant_id") `,
    );
    await queryRunner.query(`CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'PAID')`);
    await queryRunner.query(`CREATE TYPE "public"."payment_type" AS ENUM('CASH_ON_DELIVERY', 'CARD')`);
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "status" "public"."order_status" NOT NULL DEFAULT 'PENDING', "payment_type" "public"."payment_type" NOT NULL, "total_amount_minor" integer NOT NULL, "currency" character(3) NOT NULL, "idempotency_key" character varying(64) NOT NULL, "payment_reference" character varying(128), "paid_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "ck_orders_total_non_negative" CHECK ("total_amount_minor" >= 0), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_orders_status_created" ON "orders" ("status", "created_at") `);
    await queryRunner.query(`CREATE INDEX "ix_orders_user_created" ON "orders" ("user_id", "created_at") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_orders_user_idempotency_key" ON "orders" ("user_id", "idempotency_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "variant_id" uuid NOT NULL, "product_name" character varying(150) NOT NULL, "variant_name" character varying(80) NOT NULL, "unit_price_minor" integer NOT NULL, "quantity" integer NOT NULL, "line_total_minor" integer NOT NULL, CONSTRAINT "ck_order_items_quantity_positive" CHECK ("quantity" > 0), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "ix_order_items_order_id" ON "order_items" ("order_id") `);
    await queryRunner.query(
      `CREATE TABLE "background_jobs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(64) NOT NULL, "payload" jsonb NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "run_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE, "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "processed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c1f31731b1a02806c4aa631acb8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_background_jobs_due" ON "background_jobs" ("run_at") WHERE "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_6343513e20e2deab45edfce1316" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" ADD CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_30e89257a105eab7648a35c7fce" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_ede780fc2b865d1d1323e598038" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_ede780fc2b865d1d1323e598038"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_30e89257a105eab7648a35c7fce"`);
    await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`);
    await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea"`);
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_6343513e20e2deab45edfce1316"`,
    );
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
    await queryRunner.query(`DROP INDEX "public"."ix_background_jobs_due"`);
    await queryRunner.query(`DROP TABLE "background_jobs"`);
    await queryRunner.query(`DROP INDEX "public"."ix_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP INDEX "public"."uq_orders_user_idempotency_key"`);
    await queryRunner.query(`DROP INDEX "public"."ix_orders_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."ix_orders_status_created"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."payment_type"`);
    await queryRunner.query(`DROP TYPE "public"."order_status"`);
    await queryRunner.query(`DROP INDEX "public"."uq_cart_items_cart_variant"`);
    await queryRunner.query(`DROP INDEX "public"."ix_cart_items_variant_id"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP INDEX "public"."uq_carts_user_id"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_variants_sku"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_variants_product_name"`);
    await queryRunner.query(`DROP INDEX "public"."ix_product_variants_product_id"`);
    await queryRunner.query(`DROP TABLE "product_variants"`);
    await queryRunner.query(`DROP INDEX "public"."uq_products_name"`);
    await queryRunner.query(`DROP INDEX "public"."ix_products_category_active"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "public"."ix_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."uq_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."uq_users_phone"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP INDEX "public"."uq_otp_codes_identifier"`);
    await queryRunner.query(`DROP TABLE "otp_codes"`);
  }
}
