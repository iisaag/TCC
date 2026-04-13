<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_presences', function (Blueprint $table): void {
            $table->string('session_id', 255)->primary();
            $table->unsignedBigInteger('user_id');
            $table->timestamp('last_seen');

            $table->index('user_id');
            $table->index('last_seen');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_presences');
    }
};
