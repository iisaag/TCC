<?php

use App\Http\Controllers\SenhaController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\PresenceController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login');

// Debug route: return `senha` record for an email (temporary, remove after use)
Route::get('/__debug/senha/{email}', function (string $email) {
	$registro = \App\Models\Senha::find($email);
	return response()->json([
		'found' => $registro !== null,
		'registro' => $registro,
	]);
});

Route::post('/login', [SenhaController::class, 'authenticate'])->name('login.authenticate');

Route::inertia('/login',      'login/login')->name('login');

Route::middleware('session.auth')->group(function () {
	Route::post('/logout', [SenhaController::class, 'logout'])->name('logout');
	Route::get('/settings', [PerfilController::class, 'edit'])->name('settings');
	Route::post('/settings/foto', [PerfilController::class, 'updatePhoto'])->name('settings.photo');
	Route::post('/settings/contato', [PerfilController::class, 'updateContact'])->name('settings.contact');
	Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat'])->name('presence.heartbeat');
	Route::post('/presence/status', [PresenceController::class, 'updateStatus'])->name('presence.status');
	Route::get('/presence/users', [PresenceController::class, 'users'])->name('presence.users');

	Route::inertia('/dashboard',  'dashboard')->name('dashboard');
	Route::inertia('/desempenho', 'desempenho/desempenho')->name('desempenho');
	Route::inertia('/equipe',     'equipe/equipe')->name('equipe');
	Route::inertia('/projetos',   'projetos/projetos')->name('projetos');

	Route::middleware('admin.access')->group(function () {
		Route::inertia('/gestao', 'gestao/gestao')->name('gestao');
		Route::inertia('/usuarios', 'usuarios/usuarios')->name('usuarios.admin');
	});
});