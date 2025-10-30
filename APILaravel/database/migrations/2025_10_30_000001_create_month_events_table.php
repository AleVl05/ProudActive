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
        Schema::create('month_events', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->unsignedBigInteger('calendar_id');
            $table->unsignedBigInteger('user_id');

            // Información básica del evento mensual
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();

            // Rango por días (todo el día)
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('all_day')->default(true);
            $table->string('timezone', 64)->default('UTC');

            // Apariencia
            $table->string('color', 7)->nullable();
            $table->string('text_color', 7)->default('#FFFFFF');
            $table->string('border_color', 7)->nullable();

            // Control de versiones
            $table->integer('version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('calendar_id')->references('id')->on('calendars')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Índices
            $table->index('calendar_id');
            $table->index('user_id');
            $table->index('start_date');
            $table->index('end_date');
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('month_events');
    }
};

