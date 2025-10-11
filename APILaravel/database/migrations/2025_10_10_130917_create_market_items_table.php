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
        Schema::create('market_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('ID del usuario propietario del mercado');
            $table->string('name')->comment('Nombre del ítem (pan, queso, etc.)');
            $table->boolean('checked')->default(false)->comment('Si el ítem fue marcado para eliminar');
            $table->timestamps();
            
            // Campos futuros para historial o estadísticas
            $table->json('historical_data')->nullable()->comment('Por si guardamos histórico de este ítem');
            $table->integer('popularity_count')->default(0)->comment('Por si guardamos cuántas veces se pidió este ítem');
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
            $table->index('checked');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_items');
    }
};
