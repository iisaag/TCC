<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (! Schema::hasTable('user_presences')) {
            Schema::create('user_presences', function (Blueprint $table) {
                $table->string('session_id', 191)->primary();
                $table->unsignedInteger('user_id');
                $table->timestamp('last_seen')->nullable();
                $table->timestamps();

                // foreign key to usuarios.id_usuario if that table exists
                if (Schema::hasTable('usuarios')) {
                    $table->foreign('user_id')->references('id_usuario')->on('usuarios')->onDelete('cascade');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasTable('user_presences')) {
            Schema::dropIfExists('user_presences');
        }
    }
};
