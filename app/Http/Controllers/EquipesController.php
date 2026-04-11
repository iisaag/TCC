<?php

namespace App\Http\Controllers;

use App\Models\Equipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Equipe::query();

            if ($request->filled('nome')) {
                $query->whereRaw('LOWER(nome) LIKE LOWER(?)', ["%{$request->nome}%"]);
            } elseif ($request->filled('tipo')) {
                $query->where('tipo', strtoupper($request->tipo));
            } elseif ($request->filled('criado_por')) {
                $query->where('criado_por', (int) $request->criado_por);
            } elseif ($request->filled('equipe_pai')) {
                $query->where('equipe_pai', (int) $request->equipe_pai);
            } elseif ($request->has('principais')) {
                $query->whereNull('equipe_pai');
            }

            return response()->json([
                'success' => true,
                'message' => 'Equipes listadas com sucesso',
                'data'    => ['equipes' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar equipes: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $equipe = Equipe::find($id);

        if (!$equipe) {
            return response()->json([
                'success' => false,
                'message' => 'Equipe não encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Equipe encontrada com sucesso',
            'data'    => ['equipe' => $equipe],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome'       => 'required|string|min:2|max:100',
            'criado_por' => 'required|integer|exists:usuarios,id_usuario',
            'equipe_pai' => 'nullable|integer|exists:equipes,id_equipe',
            'tipo'       => 'nullable|string|in:EMPRESA,SUBEQUIPE',
        ]);

        $validated['tipo'] = $validated['tipo'] ?? 'SUBEQUIPE';

        $equipe = Equipe::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Equipe cadastrada com sucesso',
            'data'    => ['equipe' => $equipe],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $equipe = Equipe::find($id);

        if (!$equipe) {
            return response()->json([
                'success' => false,
                'message' => 'Equipe não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'nome'       => 'required|string|min:2|max:100',
            'criado_por' => 'required|integer|exists:usuarios,id_usuario',
            'equipe_pai' => 'nullable|integer|exists:equipes,id_equipe',
            'tipo'       => 'nullable|string|in:EMPRESA,SUBEQUIPE',
        ]);

        $equipe->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Equipe atualizada com sucesso',
            'data'    => ['equipe' => $equipe],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $equipe = Equipe::find($id);

        if (!$equipe) {
            return response()->json([
                'success' => false,
                'message' => 'Equipe não encontrada',
            ], 404);
        }

        $equipe->delete();

        return response()->json([
            'success' => true,
            'message' => 'Equipe excluída com sucesso',
        ]);
    }

    public function totalSubequipes(): JsonResponse
    {
        try {
            $total = Equipe::whereNotNull('equipe_pai')
                ->selectRaw('equipe_pai, COUNT(*) as total')
                ->groupBy('equipe_pai')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de subequipes por equipe obtido com sucesso',
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