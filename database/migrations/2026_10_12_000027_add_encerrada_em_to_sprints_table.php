<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bancos importados pelo script.sql criaram "sprints" sem a coluna encerrada_em,
 * e encerrar uma sprint falhava com "Unknown column".
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sprints') || Schema::hasColumn('sprints', 'encerrada_em')) {
            return;
        }

        Schema::table('sprints', function (Blueprint $table): void {
            $table->dateTime('encerrada_em')->nullable()->after('status_sprint');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('sprints') || ! Schema::hasColumn('sprints', 'encerrada_em')) {
            return;
        }

        Schema::table('sprints', function (Blueprint $table): void {
            $table->dropColumn('encerrada_em');
        });
    }
};
