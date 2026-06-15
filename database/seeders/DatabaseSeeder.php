<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::table('usuarios')->updateOrInsert(
            ['email' => 'belli@ivyteam.com'],
            [
                'nome' => 'Isabelli Arantes',
                'telefone' => null,
                'localizacao' => null,
                'perfil_tags' => null,
                'perfil_sobre' => null,
                'foto_perfil' => null,
                'cargo' => 'Administrador',
                'nivel' => 'Pleno',
                'status_atual' => 'online',
                'data_criacao' => now(),
            ]
        );
    }
}
