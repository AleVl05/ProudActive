<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_instance_statuses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('event_id')->nullable();
            $table->unsignedBigInteger('series_id')->nullable();
            $table->date('instance_date')->nullable();
            $table->unsignedInteger('subtasks_total')->default(0);
            $table->unsignedInteger('subtasks_completed')->default(0);
            $table->enum('status', ['none', 'partial', 'done'])->default('none');
            $table->timestamps();

            $table->unique('event_id');
            $table->unique(['series_id', 'instance_date']);
            $table->index('series_id');
            $table->index('instance_date');

            $table->foreign('event_id')->references('id')->on('events')->onDelete('cascade');
            $table->foreign('series_id')->references('id')->on('events')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_instance_statuses');
    }
};
