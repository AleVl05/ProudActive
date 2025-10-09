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
        Schema::create('subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');
            $table->string('text', 500)->comment('Texto de la subtarea');
            $table->boolean('completed')->default(false)->comment('Si la subtarea está completada');
            $table->integer('sort_order')->default(0)->comment('Orden de visualización');
            $table->timestamps();
            
            // Índices
            $table->index(['event_id', 'sort_order']);
            $table->index('completed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subtasks');
    }
};
