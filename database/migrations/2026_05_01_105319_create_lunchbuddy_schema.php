<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * LunchBuddy domain schema (PostgreSQL enums, tables, triggers, seed).
     *
     * Skips automatically when the default connection is not `pgsql` so SQLite
     * test runs (`phpunit.xml`) continue to work.
     *
     * If `users` already exists (e.g. Laravel Fortify), `CREATE TABLE IF NOT EXISTS users`
     * is skipped; add `role`, `auto_enroll_lunch`, and `deleted_at` in a follow-up migration
     * if the app should match this schema.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared($this->pgsqlSchemaSql());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
DROP TABLE IF EXISTS lunch_orders CASCADE;
DROP TABLE IF EXISTS lunch_days CASCADE;
DROP TABLE IF EXISTS monthly_expenses CASCADE;
DROP TABLE IF EXISTS off_days CASCADE;
DROP TABLE IF EXISTS weekly_menus CASCADE;
SQL);

        if (Schema::hasTable('users')) {
            DB::unprepared('DROP TRIGGER IF EXISTS set_timestamp_users ON users;');
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'auto_enroll_lunch')) {
            DB::unprepared('DROP TABLE IF EXISTS users CASCADE;');
        }

        DB::unprepared(<<<'SQL'
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TYPE IF EXISTS lunch_status CASCADE;
DROP TYPE IF EXISTS weekday_enum CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
SQL);
    }

    private function pgsqlSchemaSql(): string
    {
        return <<<'SQL'
SET search_path TO public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin','chef','user');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weekday_enum') THEN
    CREATE TYPE weekday_enum AS ENUM ('mon','tue','wed','thu','fri');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lunch_status') THEN
    CREATE TYPE lunch_status AS ENUM ('opted_in','opted_out');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role user_role NOT NULL DEFAULT 'user',
  auto_enroll_lunch BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS weekly_menus (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  weekday weekday_enum NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS off_days (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  off_date DATE NOT NULL UNIQUE,
  reason VARCHAR(255),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lunch_days (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lunch_date DATE NOT NULL UNIQUE,
  weekly_menu_id BIGINT NOT NULL,
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_lunch_days_menu
    FOREIGN KEY (weekly_menu_id)
    REFERENCES weekly_menus(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lunch_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lunch_day_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,

  status lunch_status NOT NULL DEFAULT 'opted_in',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_lunch_orders_day
    FOREIGN KEY (lunch_day_id)
    REFERENCES lunch_days(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_lunch_orders_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_lunch_day_user UNIQUE (lunch_day_id, user_id)
);

CREATE TABLE IF NOT EXISTS monthly_expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expense_date DATE NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  notes TEXT,

  created_by BIGINT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_monthly_expenses_user
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_weekly_menus ON weekly_menus;
CREATE TRIGGER set_timestamp_weekly_menus
BEFORE UPDATE ON weekly_menus
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_off_days ON off_days;
CREATE TRIGGER set_timestamp_off_days
BEFORE UPDATE ON off_days
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_lunch_days ON lunch_days;
CREATE TRIGGER set_timestamp_lunch_days
BEFORE UPDATE ON lunch_days
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_lunch_orders ON lunch_orders;
CREATE TRIGGER set_timestamp_lunch_orders
BEFORE UPDATE ON lunch_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_monthly_expenses ON monthly_expenses;
CREATE TRIGGER set_timestamp_monthly_expenses
BEFORE UPDATE ON monthly_expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lunch_orders_user_id
ON lunch_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_lunch_orders_day_id
ON lunch_orders(lunch_day_id);

CREATE INDEX IF NOT EXISTS idx_lunch_days_menu_id
ON lunch_days(weekly_menu_id);

CREATE INDEX IF NOT EXISTS idx_expenses_date
ON monthly_expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_expenses_user
ON monthly_expenses(created_by);

INSERT INTO weekly_menus (weekday, title)
VALUES
('mon', 'Chicken Curry Rice'),
('tue', 'Shahi Paneer Rice'),
('wed', 'Red Bean Rice Curd'),
('thu', 'Aloo Phinksha Tingmo'),
('fri', 'Egg Chowmein')
ON CONFLICT (weekday)
DO UPDATE SET title = EXCLUDED.title;
SQL;
    }
};
