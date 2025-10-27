<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * FIX CRÍTICO: Cambiar event_instance_id de BIGINT a VARCHAR(255) en custom_subtasks
     * 
     * PROBLEMA: Las instancias virtuales tienen IDs formato "684_2025-10-22" (string)
     * pero la columna solo acepta INTEGER, causando fallo al crear custom subtasks
     * 
     * SOLUCIÓN: Cambiar a VARCHAR para soportar tanto IDs numéricos (overrides)
     * como IDs compuestos (instancias virtuales)
     */
    public function up(): void
    {
        // 1) Si existe FK sobre event_instance_id, dropearla (detectamos su nombre)
        $fk = DB::select("
            SELECT constraint_name
            FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
              AND table_name = 'custom_subtasks'
              AND column_name = 'event_instance_id'
              AND referenced_table_name = 'events'
            LIMIT 1
        ");

        if (!empty($fk)) {
            $constraintName = $fk[0]->constraint_name;
            Schema::table('custom_subtasks', function (Blueprint $table) use ($constraintName) {
                $table->dropForeign($constraintName);
            });
        }

        // 2) Si existe índice idx_custom_event_instance, dropearlo
        $idx = DB::select("
            SELECT INDEX_NAME
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'custom_subtasks'
              AND INDEX_NAME = 'idx_custom_event_instance'
            LIMIT 1
        ");

        if (!empty($idx)) {
            Schema::table('custom_subtasks', function (Blueprint $table) {
                $table->dropIndex('idx_custom_event_instance');
            });
        }

        // 3) Cambiar columna a VARCHAR(255)
        Schema::table('custom_subtasks', function (Blueprint $table) {
            $table->string('event_instance_id', 255)->change();
        });

        // 4) Recrear índice
        Schema::table('custom_subtasks', function (Blueprint $table) {
            $table->index('event_instance_id', 'idx_custom_event_instance');
        });
        
        // NO recreamos la FK porque las instancias virtuales (string) no pueden apuntar a events.id (integer)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentamos revertir, pero chequeamos que todos los valores sean numéricos
        $nonNumeric = DB::select("
            SELECT COUNT(*) AS c
            FROM custom_subtasks
            WHERE event_instance_id IS NOT NULL
              AND event_instance_id REGEXP '[^0-9]'
        ");

        if (!empty($nonNumeric) && $nonNumeric[0]->c > 0) {
            throw new \Exception("Rollback abortado: hay {$nonNumeric[0]->c} filas en custom_subtasks.event_instance_id con valores no numéricos. Limpia o convierte esos valores antes de revertir.");
        }

        // Drop índice si existe
        $idx = DB::select("
            SELECT INDEX_NAME
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'custom_subtasks'
              AND INDEX_NAME = 'idx_custom_event_instance'
            LIMIT 1
        ");

        if (!empty($idx)) {
            Schema::table('custom_subtasks', function (Blueprint $table) {
                $table->dropIndex('idx_custom_event_instance');
            });
        }
        
        // Cambiar de vuelta a BIGINT
        Schema::table('custom_subtasks', function (Blueprint $table) {
            $table->bigInteger('event_instance_id')->unsigned()->change();
        });
        
        // Recrear índice e FK
        Schema::table('custom_subtasks', function (Blueprint $table) {
            $table->index('event_instance_id', 'idx_custom_event_instance');
            $table->foreign('event_instance_id')
                  ->references('id')->on('events')
                  ->onDelete('cascade');
        });
    }
};


