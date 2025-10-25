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
        Schema::create('subtask_instances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subtask_id')
                ->constrained('subtasks')
                ->onDelete('restrict')
                ->onUpdate('cascade')
                ->comment('Referencia a la subtarea plantilla del maestro');
            
            $table->foreignId('event_instance_id')
                ->constrained('events')
                ->onDelete('cascade')
                ->onUpdate('cascade')
                ->comment('Referencia a la instancia concreta del evento');
            
            $table->boolean('completed')->default(false)->comment('Si la subtarea está completada en esta instancia');
            $table->timestamp('completed_at')->nullable()->comment('Timestamp de cuándo se completó');
            $table->boolean('overridden')->default(false)->comment('Si la instancia modificó el contenido de la subtarea');
            $table->text('notes')->nullable()->comment('Notas adicionales para esta instancia');
            
            $table->timestamps();
            
            // Índices
            $table->unique(['subtask_id', 'event_instance_id'], 'ux_subtask_instance');
            $table->index('event_instance_id', 'idx_event_instance');
            $table->index('subtask_id', 'idx_subtask_id');
            $table->index('completed', 'idx_completed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subtask_instances');
    }
};

