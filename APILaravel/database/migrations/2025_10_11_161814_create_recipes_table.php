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
        Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('Propietario de la receta');
            $table->string('title')->default('Sin título')->comment('Nombre corto de la receta');
            $table->text('content')->nullable()->comment('Texto libre: preparación, pasos, observaciones');
            $table->json('ingredients')->nullable()->comment('Lista/estructura de ingredientes (ej: [{"name":"pan","qty":"2"}])');
            $table->boolean('is_favorite')->default(false)->comment('Marcar receta favorita');
            $table->enum('visibility', ['private', 'shared'])->default('private')->comment('Futuro: compartir');
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
            $table->index('is_favorite');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
