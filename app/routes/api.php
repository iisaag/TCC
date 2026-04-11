<?php

use App\Http\Controllers\CargosController;
use App\Http\Controllers\EquipesController;
use App\Http\Controllers\HistoricoProgressoController;
use App\Http\Controllers\LogProjetoController;
use App\Http\Controllers\LogSistemaController;
use App\Http\Controllers\MetasController;
use App\Http\Controllers\ProjetosController;
use App\Http\Controllers\SenhaController;
use App\Http\Controllers\TarefasController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\UsuariosController;
use Illuminate\Support\Facades\Route;

// Cargos
Route::apiResource('cargos', CargosController::class);

// Equipes
Route::get('equipes/subequipes/total',           [EquipesController::class, 'totalSubequipes']);
Route::apiResource('equipes', EquipesController::class);

// Histórico de Progresso
Route::get('historico-progresso/tarefa/{id}/ultimo', [HistoricoProgressoController::class, 'showUltimo']);
Route::get('historico-progresso/total/por-tarefa',   [HistoricoProgressoController::class, 'totalPorTarefa']);
Route::get('historico-progresso/total/por-usuario',  [HistoricoProgressoController::class, 'totalPorUsuario']);
Route::apiResource('historico-progresso', HistoricoProgressoController::class);

// Log Projeto
Route::get('log-projeto/total/por-projeto',      [LogProjetoController::class, 'totalPorProjeto']);
Route::apiResource('log-projeto', LogProjetoController::class)->except(['update']);

// Log Sistema
Route::get('log-sistema/total/por-usuario',      [LogSistemaController::class, 'totalPorUsuario']);
Route::get('log-sistema/total/por-acao',         [LogSistemaController::class, 'totalPorAcao']);
Route::apiResource('log-sistema', LogSistemaController::class)->except(['update']);

// Metas
Route::get('metas/total/por-status',             [MetasController::class, 'totalPorStatus']);
Route::get('metas/total/por-projeto',            [MetasController::class, 'totalPorProjeto']);
Route::patch('metas/{id}/concluir',              [MetasController::class, 'concluir']);
Route::apiResource('metas', MetasController::class);

// Projetos
Route::get('projetos/total/por-status',          [ProjetosController::class, 'totalPorStatus']);
Route::apiResource('projetos', ProjetosController::class);

// Senhas / Auth
Route::post('auth/verificar',                    [SenhaController::class, 'verificarSenha']);
Route::patch('senhas/{email}/senha',             [SenhaController::class, 'editSenha']);
Route::patch('senhas/{email}/nivel-acesso',      [SenhaController::class, 'editNivelAcesso']);
Route::apiResource('senhas', SenhaController::class)->except(['update']);

// Tarefas
Route::get('tarefas/total/por-status',           [TarefasController::class, 'totalPorStatus']);
Route::get('tarefas/total/por-projeto',          [TarefasController::class, 'totalPorProjeto']);
Route::get('tarefas/total/por-responsavel',      [TarefasController::class, 'totalPorResponsavel']);
Route::patch('tarefas/{id}/status',              [TarefasController::class, 'editStatus']);
Route::patch('tarefas/{id}/responsavel',         [TarefasController::class, 'editResponsavel']);
Route::apiResource('tarefas', TarefasController::class);

// Usuários
Route::get('usuarios/total/por-cargo',           [UsuariosController::class, 'totalPorCargo']);
Route::get('usuarios/total/por-nivel',           [UsuariosController::class, 'totalPorNivel']);
Route::apiResource('usuarios', UsuariosController::class);

// Database
Route::get('database/backup',                    [DatabaseController::class, 'backup']);