<?php

namespace App\Http\Controllers;

use App\Models\Meta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MetasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Meta::with('projeto')->orderBy('prazo_meta', 'asc');

            $porProjeto = $request->filled('id_projeto') ? (int) $request->id_projeto : null;

            if ($request->filled('titulo')) {
                $query->whereRaw('LOWER(titulo_meta) LIKE LOWER(?)', ["%{$request->titulo}%"]);
            } elseif ($request->has('pendentes') && $porProjeto) {
                $query->where('id_projeto', $porProjeto)->where('status_meta', 'Pendente');
            } elseif ($porProjeto) {
                $query->where('id_projeto', $porProjeto);
            } elseif ($request->filled('status')) {
                $query->where('status_meta', $request->status);
            } elseif ($request->has('atrasadas')) {
                $query->whereDate('prazo_meta', '<', now())
                      ->whereNotIn('status_meta', ['Concluída', 'Cancelada']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Metas listadas com sucesso',
                'data'    => ['metas' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar metas: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $meta = Meta::with('projeto')->find($id);

        if (!$meta) {
            return response()->json([
                'success' => false,
                'message' => 'Meta não encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Meta encontrada com sucesso',
            'data'    => ['meta' => $meta],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_projeto'          => 'required|integer|exists:projetos,id_projeto',
            'titulo_meta'         => 'required|string|min:2|max:255',
            'prazo_meta'          => 'required|date',
            'data_conclusao_meta' => 'nullable|date',
            'status_meta'         => 'nullable|string|in:Pendente,Em Andamento,Concluída,Cancelada',
        ]);

        $meta = Meta::create($validated);
        $meta->load('projeto');

        return response()->json([
            'success' => true,
            'message' => 'Meta cadastrada com sucesso',
            'data'    => ['meta' => $meta],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $meta = Meta::find($id);

        if (!$meta) {
            return response()->json([
                'success' => false,
                'message' => 'Meta não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'id_projeto'          => 'required|integer|exists:projetos,id_projeto',
            'titulo_meta'         => 'required|string|min:2|max:255',
            'prazo_meta'          => 'required|date',
            'data_conclusao_meta' => 'nullable|date',
            'status_meta'         => 'nullable|string|in:Pendente,Em Andamento,Concluída,Cancelada',
        ]);

        $meta->update($validated);
        $meta->load('projeto');

        return response()->json([
            'success' => true,
            'message' => 'Meta atualizada com sucesso',
            'data'    => ['meta' => $meta],
        ]);
    }

    public function concluir(Request $request, int $id): JsonResponse
    {
        $meta = Meta::find($id);

        if (!$meta) {
            return response()->json([
                'success' => false,
                'message' => 'Meta não encontrada',
            ], 404);
        }

        $meta->update([
            'status_meta'         => 'Concluída',
            'data_conclusao_meta' => $request->input('data_conclusao_meta', now()->toDateString()),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Meta concluída com sucesso',
            'data'    => ['meta' => $meta],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $meta = Meta::find($id);

        if (!$meta) {
            return response()->json([
                'success' => false,
                'message' => 'Meta não encontrada',
            ], 404);
        }

        $meta->delete();

        return response()->json([
            'success' => true,
            'message' => 'Meta excluída com sucesso',
        ]);
    }

    public function totalPorStatus(): JsonResponse
    {
        try {
            $total = Meta::selectRaw('status_meta, COUNT(*) as total')
                ->groupBy('status_meta')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de metas por status obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function totalPorProjeto(): JsonResponse
    {
        try {
            $total = Meta::selectRaw('id_projeto, COUNT(*) as total')
                ->groupBy('id_projeto')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de metas por projeto obtido com sucesso',
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