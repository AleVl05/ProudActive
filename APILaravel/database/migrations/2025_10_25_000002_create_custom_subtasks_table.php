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
        Schema::create('custom_subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_instance_id')
                ->constrained('events')
                ->onDelete('cascade')
                ->onUpdate('cascade')
                ->comment('Referencia a la instancia concreta del evento');
            
            $table->string('text', 500)->comment('Texto de la subtarea personalizada');
            $table->text('description')->nullable()->comment('Descripción adicional de la subtarea');
            $table->integer('sort_order')->default(0)->comment('Orden de visualización');
            $table->boolean('completed')->default(false)->comment('Si la subtarea está completada');
            $table->timestamp('completed_at')->nullable()->comment('Timestamp de cuándo se completó');
            
            $table->timestamps();
            
            // Índices
            $table->index('event_instance_id', 'idx_custom_event_instance');
            $table->index(['event_instance_id', 'sort_order'], 'idx_custom_event_order');
            $table->index('completed', 'idx_custom_completed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('custom_subtasks');
    }
};

