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
        // Renombrar la tabla recipes a notes
        Schema::rename('recipes', 'notes');
        
        // Agregar los campos checklist y blocks
        Schema::table('notes', function (Blueprint $table) {
            $table->json('checklist')->nullable()->after('content')->comment('Lista de tareas/checklist (ej: [{"id":"1","text":"Tarea 1","completed":false}])');
            $table->json('blocks')->nullable()->after('checklist')->comment('Bloques intercalados de texto y checklist (ej: [{"id":"1","type":"text","content":"..."},{"id":"2","type":"checklist","items":[...]}])');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover los campos checklist y blocks
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn(['checklist', 'blocks']);
        });
        
        // Renombrar la tabla notes a recipes
        Schema::rename('notes', 'recipes');
    }
};

