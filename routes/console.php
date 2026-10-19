<?php

use App\Support\LixeiraProjetos;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Apaga de vez os projetos que passaram dos 7 dias na lixeira.
// Precisa do agendador do Laravel rodando (php artisan schedule:work ou cron com schedule:run).
Schedule::call(fn () => LixeiraProjetos::purgarExpirados())->daily()->name('purgar-lixeira-projetos');
