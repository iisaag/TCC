<?php

use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::inertia('/dashboard',  'dashboard')->name('dashboard');
Route::inertia('/desempenho', 'desempenho/desempenho')->name('desempenho');
Route::inertia('/equipe',     'equipe/equipe')->name('equipe');
Route::inertia('/projetos',   'projetos/projetos')->name('projetos');
Route::inertia('/login',      'login/login')->name('login');