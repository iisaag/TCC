<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('projetos')) {
            return;
        }

        Schema::table('projetos', function (Blueprint $table): void {
            if (!Schema::hasColumn('projetos', 'kanban_padrao')) {
                $table->boolean('kanban_padrao')->default(true)->after('status_projeto');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('projetos')) {
            return;
        }

        Schema::table('projetos', function (Blueprint $table): void {
            if (Schema::hasColumn('projetos', 'kanban_padrao')) {
                $table->dropColumn('kanban_padrao');
            }
        });
    }
};
