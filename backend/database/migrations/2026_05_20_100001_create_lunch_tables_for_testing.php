<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('weekly_menus')) {
            return;
        }

        Schema::create('weekly_menus', function (Blueprint $table) {
            $table->id();
            $table->string('weekday')->unique();
            $table->string('title');
            $table->string('image_url')->nullable();
            $table->timestamps();
        });

        Schema::create('lunch_days', function (Blueprint $table) {
            $table->id();
            $table->date('lunch_date')->unique();
            $table->foreignId('weekly_menu_id')->constrained('weekly_menus')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('lunch_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lunch_day_id')->constrained('lunch_days')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('opted_in');
            $table->timestamps();

            $table->unique(['lunch_day_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lunch_orders');
        Schema::dropIfExists('lunch_days');
        Schema::dropIfExists('weekly_menus');
    }
};
