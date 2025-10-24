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
        Schema::table('users', function (Blueprint $table) {
            // Campos de autenticación
            $table->string('email', 255)->unique()->after('uuid');
            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->string('password', 255)->after('email_verified_at');
            $table->rememberToken()->after('locale');
            
            // Campos adicionales
            $table->string('avatar_url', 512)->nullable()->after('locale');
            $table->boolean('is_active')->default(true)->after('avatar_url');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            
            // Índices
            $table->index('email');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropIndex(['is_active']);
            
            $table->dropColumn([
                'email',
                'email_verified_at',
                'password',
                'remember_token',
                'avatar_url',
                'is_active',
                'last_login_at',
            ]);
        });
    }
};
