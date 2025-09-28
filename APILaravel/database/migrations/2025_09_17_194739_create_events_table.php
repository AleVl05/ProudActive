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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->unsignedBigInteger('calendar_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('category_id')->nullable();
            
            // Para series recurrentes
            $table->unsignedBigInteger('series_id')->nullable();
            $table->datetime('original_start_utc')->nullable();
            
            // Información básica del evento
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            
            // Fechas y horarios (siempre en UTC)
            $table->datetime('start_utc');
            $table->datetime('end_utc');
            $table->boolean('all_day')->default(false);
            $table->string('timezone', 64)->default('UTC');
            
            // Apariencia
            $table->string('color', 7)->nullable();
            $table->string('text_color', 7)->default('#FFFFFF');
            $table->string('border_color', 7)->nullable();
            
            // Recurrencia
            $table->boolean('is_recurring')->default(false);
            $table->json('recurrence_rule')->nullable();
            $table->date('recurrence_end_date')->nullable();
            
            // Control de versiones
            $table->integer('version')->default(1);
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('calendar_id')->references('id')->on('calendars')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('event_categories')->onDelete('set null');
            $table->foreign('series_id')->references('id')->on('events')->onDelete('cascade');
            
            // Índices para performance
            $table->index(['calendar_id']);
            $table->index(['user_id']);
            $table->index(['start_utc']);
            $table->index(['end_utc']);
            $table->index(['start_utc', 'end_utc']);
            $table->index(['is_recurring']);
            $table->index(['deleted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};