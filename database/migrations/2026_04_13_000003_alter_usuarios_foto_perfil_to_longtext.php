<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('usuarios')) {
            DB::statement('ALTER TABLE usuarios MODIFY foto_perfil LONGTEXT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('usuarios')) {
            DB::statement('ALTER TABLE usuarios MODIFY foto_perfil VARCHAR(255) NULL');
        }
    }
};
