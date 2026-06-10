<?php

namespace App\Http\Controllers;

use App\Models\Sprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SprintsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_projeto' => 'required|integer|exists:projetos,id_projeto',
        ]);

        $idProjeto = (int) $validated['id_projeto'];

        $sprints = Sprint::query()
            ->withCount('tarefas')
            ->where('id_projeto', $idProjeto)
            ->orderByDesc('id_sprint')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Sprints carregadas com sucesso',
            'data' => ['sprints' => $sprints],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_projeto' => 'required|integer|exists:projetos,id_projeto',
            'nome_sprint' => 'nullable|string|max:120',
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
        ]);

        $idProjeto = (int) $validated['id_projeto'];

        $activeSprint = Sprint::query()
            ->where('id_projeto', $idProjeto)
            ->where('status_sprint', 'ATIVA')
            ->first();

        if ($activeSprint) {
            return response()->json([
                'success' => false,
                'message' => 'Ja existe uma sprint ativa para este projeto.',
            ], 422);
        }

        $sprint = Sprint::create([
            'id_projeto' => $idProjeto,
            'nome_sprint' => trim((string) ($validated['nome_sprint'] ?? 'Sprint ' . now()->format('d/m'))),
            'data_inicio' => $validated['data_inicio'],
            'data_fim' => $validated['data_fim'],
            'status_sprint' => 'ATIVA',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sprint criada com sucesso',
            'data' => ['sprint' => $sprint],
        ], 201);
    }

    public function encerrar(int $id): JsonResponse
    {
        $sprint = Sprint::find($id);

        if (! $sprint) {
            return response()->json([
                'success' => false,
                'message' => 'Sprint nao encontrada',
            ], 404);
        }

        if ((string) $sprint->status_sprint === 'ENCERRADA') {
            return response()->json([
                'success' => false,
                'message' => 'Sprint ja encerrada.',
            ], 422);
        }

        DB::transaction(function () use ($sprint): void {
            DB::table('tarefas')
                ->where('id_sprint', $sprint->id_sprint)
                ->whereRaw("UPPER(TRIM(status_task)) IN ('APROVADO','DONE','CONCLUIDA','CONCLUÍDA')")
                ->update([
                    'em_historico' => true,
                    'id_sprint' => null,
                ]);

            DB::table('tarefas')
                ->where('id_sprint', $sprint->id_sprint)
                ->update([
                    'id_sprint' => null,
                    'em_historico' => false,
                ]);

            $sprint->update([
                'status_sprint' => 'ENCERRADA',
                'encerrada_em' => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Sprint encerrada e cards arquivados no historico.',
        ]);
    }
}
