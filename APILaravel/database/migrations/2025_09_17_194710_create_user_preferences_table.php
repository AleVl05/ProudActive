<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->primary();
            $table->integer('time_interval_minutes')->default(30);
            $table->integer('start_hour')->default(6);
            $table->integer('end_hour')->default(22);
            $table->enum('default_view', ['day', 'week', 'month'])->default('week');
            $table->enum('week_starts_on', ['monday', 'sunday'])->default('monday');
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};