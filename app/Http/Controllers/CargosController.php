<?php

namespace App\Http\Controllers;

use App\Models\Cargo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class CargosController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Cargo::orderBy('nome_cargo', 'asc');

            if ($request->filled('nome')) {
                $query->whereRaw('LOWER(nome_cargo) LIKE LOWER(?)', ["%{$request->nome}%"]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Cargos listados com sucesso',
                'data'    => ['cargos' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar cargos: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $cargo = Cargo::find($id);

        if (!$cargo) {
            return response()->json([
                'success' => false,
                'message' => 'Cargo não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cargo encontrado com sucesso',
            'data'    => ['cargo' => $cargo],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome_cargo' => 'required|string|min:2|max:100',
        ]);

        $cargo = Cargo::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cargo cadastrado com sucesso',
            'data'    => ['cargo' => $cargo],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cargo = Cargo::find($id);

        if (!$cargo) {
            return response()->json([
                'success' => false,
                'message' => 'Cargo não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'nome_cargo' => 'required|string|min:2|max:100',
        ]);

        $cargo->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cargo atualizado com sucesso',
            'data'    => ['cargo' => $cargo],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $cargo = Cargo::find($id);

        if (!$cargo) {
            return response()->json([
                'success' => false,
                'message' => 'Cargo não encontrado',
            ], 404);
        }

        $cargo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cargo excluído com sucesso',
        ]);
    }
}