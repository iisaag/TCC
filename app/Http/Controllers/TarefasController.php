<?php

namespace App\Http\Controllers;

use App\Models\Tarefa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TarefasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Tarefa::with(['projeto', 'responsavel'])->orderBy('prazo', 'asc');

            $porProjeto     = $request->filled('id_projeto')     ? (int) $request->id_projeto     : null;
            $porResponsavel = $request->filled('id_responsavel') ? (int) $request->id_responsavel : null;

            if ($request->filled('titulo')) {
                $query->whereRaw('LOWER(titulo) LIKE LOWER(?)', ["%{$request->titulo}%"]);
            } elseif ($porProjeto && $porResponsavel) {
                $query->where('id_projeto', $porProjeto)->where('id_responsavel', $porResponsavel);
            } elseif ($porProjeto) {
                $query->where('id_projeto', $porProjeto);
            } elseif ($porResponsavel) {
                $query->where('id_responsavel', $porResponsavel);
            } elseif ($request->filled('status')) {
                $query->where('status_task', $request->status);
            } elseif ($request->filled('prioridade')) {
                $query->where('prioridade_task', strtoupper($request->prioridade));
            } elseif ($request->has('atrasadas')) {
                $query->whereDate('prazo', '<', now())
                      ->whereNotIn('status_task', ['Concluída', 'Cancelada']);
            } elseif ($request->has('sem_responsavel')) {
                $query->whereNull('id_responsavel');
            }

            return response()->json([
                'success' => true,
                'message' => 'Tarefas listadas com sucesso',
                'data'    => ['tarefas' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar tarefas: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $tarefa = Tarefa::with(['projeto', 'responsavel'])->find($id);

        if (!$tarefa) {
            return response()->json([
                'success' => false,
                'message' => 'Tarefa não encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tarefa encontrada com sucesso',
            'data'    => ['tarefa' => $tarefa],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo'          => 'required|string|min:2|max:255',
            'descricao'       => 'nullable|string',
            'id_projeto'      => 'nullable|integer|exists:projetos,id_projeto',
            'id_responsavel'  => 'nullable|integer|exists:usuarios,id_usuario',
            'prioridade_task' => 'nullable|string|in:BAIXA,MEDIA,ALTA',
            'prazo'           => 'nullable|date',
            'status_task'     => 'nullable|string',
        ]);

        $tarefa = Tarefa::create($validated);
        $tarefa->load(['projeto', 'responsavel']);

        return response()->json([
            'success' => true,
            'message' => 'Tarefa cadastrada com sucesso',
            'data'    => ['tarefa' => $tarefa],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tarefa = Tarefa::find($id);

        if (!$tarefa) {
            return response()->json([
                'success' => false,
                'message' => 'Tarefa não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'titulo'          => 'required|string|min:2|max:255',
            'descricao'       => 'nullable|string',
            'id_projeto'      => 'nullable|integer|exists:projetos,id_projeto',
            'id_responsavel'  => 'nullable|integer|exists:usuarios,id_usuario',
            'prioridade_task' => 'nullable|string|in:BAIXA,MEDIA,ALTA',
            'prazo'           => 'nullable|date',
            'status_task'     => 'nullable|string',
        ]);

        $tarefa->update($validated);
        $tarefa->load(['projeto', 'responsavel']);

        return response()->json([
            'success' => true,
            'message' => 'Tarefa atualizada com sucesso',
            'data'    => ['tarefa' => $tarefa],
        ]);
    }

    public function editStatus(Request $request, int $id): JsonResponse
    {
        $tarefa = Tarefa::find($id);

        if (!$tarefa) {
            return response()->json([
                'success' => false,
                'message' => 'Tarefa não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'status_task' => 'required|string',
        ]);

        $tarefa->update(['status_task' => $validated['status_task']]);

        return response()->json([
            'success' => true,
            'message' => 'Status atualizado com sucesso',
            'data'    => ['tarefa' => $tarefa],
        ]);
    }

    public function editResponsavel(Request $request, int $id): JsonResponse
    {
        $tarefa = Tarefa::find($id);

        if (!$tarefa) {
            return response()->json([
                'success' => false,
                'message' => 'Tarefa não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'id_responsavel' => 'required|integer|exists:usuarios,id_usuario',
        ]);

        $tarefa->update(['id_responsavel' => $validated['id_responsavel']]);
        $tarefa->load('responsavel');

        return response()->json([
            'success' => true,
            'message' => 'Responsável atribuído com sucesso',
            'data'    => ['tarefa' => $tarefa],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $tarefa = Tarefa::find($id);

        if (!$tarefa) {
            return response()->json([
                'success' => false,
                'message' => 'Tarefa não encontrada',
            ], 404);
        }

        $tarefa->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tarefa excluída com sucesso',
        ]);
    }

    public function totalPorStatus(): JsonResponse
    {
        try {
            $total = Tarefa::selectRaw('status_task, COUNT(*) as total')
                ->groupBy('status_task')->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de tarefas por status obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function totalPorProjeto(): JsonResponse
    {
        try {
            $total = Tarefa::selectRaw('id_projeto, COUNT(*) as total')
                ->groupBy('id_projeto')->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de tarefas por projeto obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function totalPorResponsavel(): JsonResponse
    {
        try {
            $total = Tarefa::selectRaw('id_responsavel, COUNT(*) as total')
                ->groupBy('id_responsavel')->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de tarefas por responsável obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}