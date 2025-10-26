<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * FIX: Renombrar columnas para que coincidan con el código
     * - title → text (consistente con subtasks)
     * - position → sort_order (consistente con subtasks)
     */
    public function up(): void
    {
        Schema::table('custom_subtasks', function (Blueprint $table) {
            // Renombrar title a text
            $table->renameColumn('title', 'text');
            
            // Renombrar position a sort_order
            $table->renameColumn('position', 'sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('custom_subtasks', function (Blueprint $table) {
            // Revertir: text → title
            $table->renameColumn('text', 'title');
            
            // Revertir: sort_order → position
            $table->renameColumn('sort_order', 'position');
        });
    }
};

