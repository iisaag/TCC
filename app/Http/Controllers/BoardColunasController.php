<?php

namespace App\Http\Controllers;

use App\Models\BoardColuna;
use App\Models\Projeto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoardColunasController extends Controller
{
    public function index(int $idProjeto): JsonResponse
    {
        $colunas = BoardColuna::where('id_projeto', $idProjeto)
            ->orderBy('ordem')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Colunas listadas com sucesso',
            'data'    => ['colunas' => $colunas],
        ]);
    }

    public function store(Request $request, int $idProjeto): JsonResponse
    {
        $projeto = Projeto::find($idProjeto);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'nome'                 => 'required|string|min:1|max:100',
            'progresso'            => 'required|integer|min:0|max:100',
            'arquiva_ao_concluir'  => 'nullable|boolean',
        ]);

        $proximaOrdem = (int) (BoardColuna::where('id_projeto', $idProjeto)->max('ordem') ?? 0) + 1;

        $coluna = BoardColuna::create([
            'id_projeto'           => $idProjeto,
            'nome'                 => $validated['nome'],
            'progresso'            => $validated['progresso'],
            'ordem'                => $proximaOrdem,
            'arquiva_ao_concluir'  => $validated['arquiva_ao_concluir'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Coluna criada com sucesso',
            'data'    => ['coluna' => $coluna],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $coluna = BoardColuna::find($id);

        if (!$coluna) {
            return response()->json([
                'success' => false,
                'message' => 'Coluna não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'nome'                 => 'sometimes|required|string|min:1|max:100',
            'progresso'            => 'sometimes|required|integer|min:0|max:100',
            'arquiva_ao_concluir'  => 'nullable|boolean',
        ]);

        $coluna->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Coluna atualizada com sucesso',
            'data'    => ['coluna' => $coluna],
        ]);
    }

    public function reorder(Request $request, int $idProjeto): JsonResponse
    {
        $validated = $request->validate([
            'colunas'               => 'required|array|min:1',
            'colunas.*.id_coluna'   => 'required|integer|exists:board_colunas,id_coluna',
            'colunas.*.ordem'       => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($validated, $idProjeto): void {
            foreach ($validated['colunas'] as $item) {
                BoardColuna::where('id_coluna', $item['id_coluna'])
                    ->where('id_projeto', $idProjeto)
                    ->update(['ordem' => $item['ordem']]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Ordem das colunas atualizada com sucesso',
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $coluna = BoardColuna::find($id);

        if (!$coluna) {
            return response()->json([
                'success' => false,
                'message' => 'Coluna não encontrada',
            ], 404);
        }

        DB::transaction(function () use ($coluna): void {
            DB::table('tarefas')
                ->where('id_coluna', $coluna->id_coluna)
                ->update(['id_coluna' => null]);

            $coluna->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Coluna excluída com sucesso',
        ]);
    }
}
