<?php

namespace App\Http\Controllers;

use App\Models\LogProjeto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogProjetoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = LogProjeto::with(['projeto', 'usuario'])
                ->orderBy('data_hora', 'desc');

            if ($request->filled('projeto_id')) {
                $query->where('id_projeto', (int) $request->projeto_id);
            } elseif ($request->filled('usuario_id')) {
                $query->where('id_usuario', (int) $request->usuario_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Logs listados com sucesso',
                'data'    => ['logs' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar logs: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $log = LogProjeto::with(['projeto', 'usuario'])->find($id);

        if (!$log) {
            return response()->json([
                'success' => false,
                'message' => 'Log não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Log encontrado com sucesso',
            'data'    => ['log' => $log],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_projeto' => 'required|integer|exists:projetos,id_projeto',
            'id_usuario' => 'required|integer|exists:usuarios,id_usuario',
            'mensagem'   => 'required|string',
        ]);

        $log = LogProjeto::create($validated);
        $log->load(['projeto', 'usuario']);

        return response()->json([
            'success' => true,
            'message' => 'Log registrado com sucesso',
            'data'    => ['log' => $log],
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $log = LogProjeto::find($id);

        if (!$log) {
            return response()->json([
                'success' => false,
                'message' => 'Log não encontrado',
            ], 404);
        }

        $log->delete();

        return response()->json([
            'success' => true,
            'message' => 'Log excluído com sucesso',
        ]);
    }

    public function totalPorProjeto(): JsonResponse
    {
        try {
            $total = LogProjeto::selectRaw('id_projeto, COUNT(*) as total')
                ->groupBy('id_projeto')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de logs por projeto obtido com sucesso',
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