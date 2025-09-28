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
        Schema::create('recurrence_exceptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('event_id');
            $table->date('exception_date');
            $table->boolean('is_deleted')->default(false);
            $table->unsignedBigInteger('override_event_id')->nullable();
            $table->string('reason')->nullable();
            $table->timestamps();
            
            $table->foreign('event_id')->references('id')->on('events')->onDelete('cascade');
            $table->foreign('override_event_id')->references('id')->on('events')->onDelete('cascade');
            
            $table->unique(['event_id', 'exception_date']);
            $table->index(['event_id']);
            $table->index(['exception_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recurrence_exceptions');
    }
};