<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('usuarios') || Schema::hasColumn('usuarios', 'status_atual')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->string('status_atual', 40)->nullable()->after('nivel');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('usuarios') || ! Schema::hasColumn('usuarios', 'status_atual')) {
            return;
        }

        Schema::table('usuarios', function (Blueprint $table): void {
            $table->dropColumn('status_atual');
        });
    }
};
