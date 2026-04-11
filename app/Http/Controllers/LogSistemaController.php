<?php

namespace App\Http\Controllers;

use App\Models\LogSistema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogSistemaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = LogSistema::with('usuario')
                ->orderBy('data_hora', 'desc');

            if ($request->filled('usuario_id')) {
                $query->where('id_usuario', (int) $request->usuario_id);
            } elseif ($request->filled('acao')) {
                $query->where('acao', $request->acao);
            }

            return response()->json([
                'success' => true,
                'message' => 'Logs do sistema listados com sucesso',
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
        $log = LogSistema::with('usuario')->find($id);

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
            'id_usuario' => 'required|integer|exists:usuarios,id_usuario',
            'acao'       => 'required|string',
            'descricao'  => 'required|string',
        ]);

        $log = LogSistema::create($validated);
        $log->load('usuario');

        return response()->json([
            'success' => true,
            'message' => 'Log registrado com sucesso',
            'data'    => ['log' => $log],
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $log = LogSistema::find($id);

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

    public function totalPorUsuario(): JsonResponse
    {
        try {
            $total = LogSistema::selectRaw('id_usuario, COUNT(*) as total')
                ->groupBy('id_usuario')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de logs por usuário obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function totalPorAcao(): JsonResponse
    {
        try {
            $total = LogSistema::selectRaw('acao, COUNT(*) as total')
                ->groupBy('acao')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de logs por ação obtido com sucesso',
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