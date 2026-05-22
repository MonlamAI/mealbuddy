<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_bills', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('month');
            $table->unsignedSmallInteger('year');
            $table->decimal('total_bill', 12, 2);
            $table->unsignedInteger('total_plates');
            $table->decimal('plate_cost', 12, 4);
            $table->string('bill_image')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('finalized');
            $table->timestamps();

            $table->unique(['month', 'year']);
            $table->index(['year', 'month']);
        });

        Schema::create('user_monthly_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_bill_id')->constrained('monthly_bills')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('joined_count')->default(0);
            $table->decimal('amount_due', 12, 2)->default(0);
            $table->string('payment_status')->default('unpaid');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['monthly_bill_id', 'user_id']);
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_monthly_bills');
        Schema::dropIfExists('monthly_bills');
    }
};
