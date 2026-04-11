<?php

namespace App\Http\Controllers;

use App\Models\HistoricoProgresso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistoricoProgressoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = HistoricoProgresso::with(['tarefa', 'usuario'])
                ->orderBy('data_atualizacao', 'desc');

            if ($request->filled('id_tarefa') && $request->filled('id_usuario')) {
                $query->where('id_tarefa',  (int) $request->id_tarefa)
                      ->where('id_usuario', (int) $request->id_usuario);
            } elseif ($request->filled('id_tarefa')) {
                $query->where('id_tarefa', (int) $request->id_tarefa);
            } elseif ($request->filled('id_usuario')) {
                $query->where('id_usuario', (int) $request->id_usuario);
            } elseif ($request->filled('data_inicio') && $request->filled('data_fim')) {
                $query->whereBetween('data_atualizacao', [
                    $request->data_inicio,
                    $request->data_fim,
                ]);
            } elseif ($request->filled('progresso_min')) {
                $query->where('progresso', '>=', (int) $request->progresso_min);
            }

            return response()->json([
                'success' => true,
                'message' => 'Histórico listado com sucesso',
                'data'    => ['historico' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar histórico: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $historico = HistoricoProgresso::with(['tarefa', 'usuario'])->find($id);

        if (!$historico) {
            return response()->json([
                'success' => false,
                'message' => 'Registro não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Registro encontrado com sucesso',
            'data'    => ['historico' => $historico],
        ]);
    }

    public function showUltimo(int $idTarefa): JsonResponse
    {
        $historico = HistoricoProgresso::with(['tarefa', 'usuario'])
            ->where('id_tarefa', $idTarefa)
            ->orderBy('data_atualizacao', 'desc')
            ->first();

        if (!$historico) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhum registro encontrado para esta tarefa',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Último registro obtido com sucesso',
            'data'    => ['historico' => $historico],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_tarefa'  => 'required|integer|exists:tarefas,id_tarefa',
            'id_usuario' => 'required|integer|exists:usuarios,id_usuario',
            'progresso'  => 'required|integer|min:0|max:100',
        ]);

        $historico = HistoricoProgresso::create($validated);
        $historico->load(['tarefa', 'usuario']);

        return response()->json([
            'success' => true,
            'message' => 'Progresso registrado com sucesso',
            'data'    => ['historico' => $historico],
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $historico = HistoricoProgresso::find($id);

        if (!$historico) {
            return response()->json([
                'success' => false,
                'message' => 'Registro não encontrado',
            ], 404);
        }

        $historico->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro excluído com sucesso',
        ]);
    }

    public function totalPorTarefa(): JsonResponse
    {
        try {
            $total = HistoricoProgresso::selectRaw('id_tarefa, COUNT(*) as total')
                ->groupBy('id_tarefa')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de registros por tarefa obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function totalPorUsuario(): JsonResponse
    {
        try {
            $total = HistoricoProgresso::selectRaw('id_usuario, COUNT(*) as total')
                ->groupBy('id_usuario')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de registros por usuário obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}