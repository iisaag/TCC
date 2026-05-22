<?php

use App\Http\Controllers\CargosController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EquipesController;
use App\Http\Controllers\HistoricoProgressoController;
use App\Http\Controllers\LogProjetoController;
use App\Http\Controllers\LogSistemaController;
use App\Http\Controllers\MetasController;
use App\Http\Controllers\NotificacoesController;
use App\Http\Controllers\ProjetosController;
use App\Http\Controllers\SenhaController;
use App\Http\Controllers\TarefasController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\UsuariosController;
use Illuminate\Support\Facades\Route;

// Senhas / Auth
Route::post('auth/verificar',                    [SenhaController::class, 'verificarSenha']);

Route::middleware(['web', 'session.auth'])->group(function (): void {
	// Dashboard
	Route::get('dashboard', [DashboardController::class, 'index']);
	Route::get('busca/global', [DashboardController::class, 'globalSearch']);
	Route::get('notificacoes', [NotificacoesController::class, 'index']);

	// Equipes
	Route::get('equipes/subequipes/total',           [EquipesController::class, 'totalSubequipes']);
	Route::apiResource('equipes', EquipesController::class);

	// Historico de Progresso
	Route::get('historico-progresso/tarefa/{id}/ultimo', [HistoricoProgressoController::class, 'showUltimo']);
	Route::get('historico-progresso/total/por-tarefa',   [HistoricoProgressoController::class, 'totalPorTarefa']);
	Route::get('historico-progresso/total/por-usuario',  [HistoricoProgressoController::class, 'totalPorUsuario']);
	Route::apiResource('historico-progresso', HistoricoProgressoController::class);

	// Metas
	Route::get('metas/total/por-status',             [MetasController::class, 'totalPorStatus']);
	Route::get('metas/total/por-projeto',            [MetasController::class, 'totalPorProjeto']);
	Route::patch('metas/{id}/concluir',              [MetasController::class, 'concluir']);
	Route::apiResource('metas', MetasController::class);

	// Projetos
	Route::get('projetos/total/por-status',          [ProjetosController::class, 'totalPorStatus']);
	Route::get('projetos/excluidos/historico',       [ProjetosController::class, 'deletedHistory']);
	Route::post('projetos/excluidos/{registro}/restaurar', [ProjetosController::class, 'restoreDeleted']);
	Route::apiResource('projetos', ProjetosController::class);

	// Tarefas
	Route::get('tarefas/total/por-status',           [TarefasController::class, 'totalPorStatus']);
	Route::get('tarefas/total/por-projeto',          [TarefasController::class, 'totalPorProjeto']);
	Route::get('tarefas/total/por-responsavel',      [TarefasController::class, 'totalPorResponsavel']);
	Route::patch('tarefas/{id}/status',              [TarefasController::class, 'editStatus']);
	Route::patch('tarefas/{id}/responsavel',         [TarefasController::class, 'editResponsavel']);
	Route::apiResource('tarefas', TarefasController::class);

	// Usuarios (acesso geral apenas leitura)
	Route::get('usuarios',                           [UsuariosController::class, 'index']);
	Route::get('usuarios/{usuario}',                 [UsuariosController::class, 'show']);

	Route::middleware('admin.access')->group(function (): void {
		// Cargos
		Route::apiResource('cargos', CargosController::class);

		// Log Projeto
		Route::get('log-projeto/total/por-projeto',  [LogProjetoController::class, 'totalPorProjeto']);
		Route::apiResource('log-projeto', LogProjetoController::class)->except(['update']);

		// Log Sistema
		Route::get('log-sistema/total/por-usuario',  [LogSistemaController::class, 'totalPorUsuario']);
		Route::get('log-sistema/total/por-acao',     [LogSistemaController::class, 'totalPorAcao']);
		Route::apiResource('log-sistema', LogSistemaController::class)->except(['update']);

		// Senhas / Auth (gestao)
		Route::patch('senhas/{email}/senha',         [SenhaController::class, 'editSenha']);
		Route::patch('senhas/{email}/nivel-acesso',  [SenhaController::class, 'editNivelAcesso']);
		Route::apiResource('senhas', SenhaController::class)->except(['update']);

		// Usuarios (gestao completa)
		Route::get('usuarios/total/por-cargo',       [UsuariosController::class, 'totalPorCargo']);
		Route::get('usuarios/total/por-nivel',       [UsuariosController::class, 'totalPorNivel']);
		Route::get('usuarios/excluidos/historico',   [UsuariosController::class, 'deletedHistory']);
		Route::post('usuarios/excluidos/{registro}/restaurar', [UsuariosController::class, 'restoreDeleted']);
		Route::post('usuarios',                       [UsuariosController::class, 'store']);
		Route::put('usuarios/{usuario}',              [UsuariosController::class, 'update']);
		Route::patch('usuarios/{usuario}',            [UsuariosController::class, 'update']);
		Route::patch('usuarios/{usuario}/status',     [UsuariosController::class, 'updateStatus']);
		Route::delete('usuarios/{usuario}',           [UsuariosController::class, 'destroy']);

		// Database
		Route::get('database/backup',                [DatabaseController::class, 'backup']);
	});
});