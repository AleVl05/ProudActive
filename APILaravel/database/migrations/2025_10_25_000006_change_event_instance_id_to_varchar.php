<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Si existe FK sobre event_instance_id, dropearla (detectamos su nombre)
        $fk = DB::select("
            SELECT constraint_name
            FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE()
              AND table_name = 'subtask_instances'
              AND column_name = 'event_instance_id'
              AND referenced_table_name = 'events'
            LIMIT 1
        ");

        if (!empty($fk)) {
            $constraintName = $fk[0]->constraint_name;
            // dropForeign requiere el nombre exacto del constraint
            Schema::table('subtask_instances', function (Blueprint $table) use ($constraintName) {
                // en ocasiones Laravel quiere el nombre del constraint como string
                $table->dropForeign($constraintName);
            });
        }

        // 2) Si existe índice único ux_subtask_instance, dropearlo
        $idx = DB::select("
            SELECT INDEX_NAME
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'subtask_instances'
              AND INDEX_NAME = 'ux_subtask_instance'
            LIMIT 1
        ");

        if (!empty($idx)) {
            Schema::table('subtask_instances', function (Blueprint $table) {
                $table->dropUnique('ux_subtask_instance');
            });
        }

        // 3) Cambiar columna a VARCHAR(255)
        // NOTE: change() requiere doctrine/dbal package instalado
        Schema::table('subtask_instances', function (Blueprint $table) {
            // Hacemos nullable por seguridad (si hay NULLs)
            $table->string('event_instance_id', 255)->nullable()->change();
        });

        // 4) Recrear índice único con el nuevo tipo (si querés mantener unicidad)
        Schema::table('subtask_instances', function (Blueprint $table) {
            $table->unique(['subtask_id', 'event_instance_id'], 'ux_subtask_instance');
        });

        // IMPORTANTE: NO recreamos la FK hacia events(id) porque los tipos no coinciden (VARCHAR vs BIGINT).
        // Si quieres restablecer una relación referencial, habría que:
        //  - normalizar a IDs numéricos (persistir instancias) o
        //  - mantener una columna separada numeric_event_instance_id con FK.
    }

    public function down(): void
    {
        // Intentamos revertir, pero chequeamos que todos los valores sean numéricos
        $nonNumeric = DB::select("
            SELECT COUNT(*) AS c
            FROM subtask_instances
            WHERE event_instance_id IS NOT NULL
              AND event_instance_id REGEXP '[^0-9]'
        ");

        if (!empty($nonNumeric) && $nonNumeric[0]->c > 0) {
            throw new \Exception("Rollback abortado: hay {$nonNumeric[0]->c} filas en subtask_instances.event_instance_id con valores no numéricos. Limpia o convierte esos valores antes de revertir.");
        }

        // Drop unique if exists
        $idx = DB::select("
            SELECT INDEX_NAME
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'subtask_instances'
              AND INDEX_NAME = 'ux_subtask_instance'
            LIMIT 1
        ");

        if (!empty($idx)) {
            Schema::table('subtask_instances', function (Blueprint $table) {
                $table->dropUnique('ux_subtask_instance');
            });
        }

        // Change back to unsigned bigInteger
        Schema::table('subtask_instances', function (Blueprint $table) {
            $table->bigInteger('event_instance_id')->unsigned()->nullable(false)->change();
        });

        // Recreate unique index
        Schema::table('subtask_instances', function (Blueprint $table) {
            $table->unique(['subtask_id', 'event_instance_id'], 'ux_subtask_instance');
        });

        // Recreate FK pointing to events.id (nombre estándar)
        Schema::table('subtask_instances', function (Blueprint $table) {
            $table->foreign('event_instance_id', 'fk_si_event_instance')
                  ->references('id')->on('events')
                  ->onDelete('CASCADE');
        });
    }
};
