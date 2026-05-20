<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Skips when not PostgreSQL: `weekly_menus` is created only in
     * `create_lunchbuddy_schema`, which does not run on SQLite (see phpunit.xml).
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::table('weekly_menus', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::table('weekly_menus', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });
    }
};
