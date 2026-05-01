<?php

namespace App\Http\Controllers;

use App\Models\Projeto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjetosController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Projeto::with('responsavel');

            if ($request->filled('nome')) {
                $query->whereRaw('LOWER(nome_projeto) LIKE LOWER(?)', ["%{$request->nome}%"]);
            } elseif ($request->filled('status')) {
                $query->where('status_projeto', $request->status);
            } elseif ($request->filled('prioridade')) {
                $query->where('prioridade_proj', strtoupper($request->prioridade));
            }

            return response()->json([
                'success' => true,
                'message' => 'Projetos listados com sucesso',
                'data'    => ['projetos' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar projetos: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $projeto = Projeto::find($id);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Projeto encontrado com sucesso',
            'data'    => ['projeto' => $projeto],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome_projeto'    => 'required|string|min:2|max:255',
            'descricao'       => 'nullable|string',
            'data_inicio'     => 'nullable|date',
            'prazo_final'     => 'nullable|date',
            'status_projeto'  => 'nullable|string',
            'prioridade_proj' => 'nullable|string|in:BAIXA,MEDIA,ALTA',
            'id_responsavel'  => 'nullable|integer|exists:usuarios,id_usuario',
        ]);

        $projeto = Projeto::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Projeto cadastrado com sucesso',
            'data'    => ['projeto' => $projeto],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $projeto = Projeto::find($id);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'nome_projeto'    => 'required|string|min:2|max:255',
            'descricao'       => 'nullable|string',
            'data_inicio'     => 'nullable|date',
            'prazo_final'     => 'nullable|date',
            'status_projeto'  => 'nullable|string',
            'prioridade_proj' => 'nullable|string|in:BAIXA,MEDIA,ALTA',
            'id_responsavel'  => 'nullable|integer|exists:usuarios,id_usuario',
        ]);

        $projeto->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Projeto atualizado com sucesso',
            'data'    => ['projeto' => $projeto],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $projeto = Projeto::find($id);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        $projeto->delete();

        return response()->json([
            'success' => true,
            'message' => 'Projeto excluído com sucesso',
        ]);
    }

    public function totalPorStatus(): JsonResponse
    {
        try {
            $total = Projeto::selectRaw('status_projeto, COUNT(*) as total')
                ->groupBy('status_projeto')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de projetos por status obtido com sucesso',
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