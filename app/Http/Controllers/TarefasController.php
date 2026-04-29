<?php

namespace App\Http\Controllers;

use App\Models\Tarefa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TarefasController extends Controller
{
    private function rules(bool $isUpdate = false): array
    {
        $tituloRule = $isUpdate ? 'sometimes|required|string|min:2|max:255' : 'required|string|min:2|max:255';

        return [
            'titulo'                => $tituloRule,
            'descricao'             => 'nullable|string',
            'id_projeto'            => 'nullable|integer|exists:projetos,id_projeto',
            'id_responsavel'        => 'nullable|integer|exists:usuarios,id_usuario',
            'prioridade_task'       => 'nullable|string|in:BAIXA,MEDIA,ALTA,CRITICA',
            'tipo_task'             => 'nullable|string|in:FRONT,BACK,FULLSTACK',
            'data_inicio'           => 'nullable|date',
            'data_prevista_termino' => 'nullable|date|after_or_equal:data_inicio',
            'progresso'             => 'nullable|integer|min:0|max:100',
            'bloqueada'             => 'nullable|boolean',
            'prazo'                 => 'nullable|date',
            'status_task'           => 'nullable|string',
            'relacionados'          => 'nullable|array',
            'relacionados.*'        => 'integer|exists:usuarios,id_usuario',
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Tarefa::with(['projeto', 'responsavel', 'relacionados'])
                ->orderByRaw('COALESCE(data_prevista_termino, prazo) asc');

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
        $tarefa = Tarefa::with(['projeto', 'responsavel', 'relacionados'])->find($id);

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
        $validated = $request->validate($this->rules());

        $relacionados = $validated['relacionados'] ?? [];
        unset($validated['relacionados']);

        if (!isset($validated['prazo']) && isset($validated['data_prevista_termino'])) {
            $validated['prazo'] = $validated['data_prevista_termino'];
        }

        $tarefa = Tarefa::create($validated);

        if (!empty($relacionados)) {
            $tarefa->relacionados()->sync($relacionados);
        }

        $tarefa->load(['projeto', 'responsavel', 'relacionados']);

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

        $validated = $request->validate($this->rules(true));

        $hasRelacionados = array_key_exists('relacionados', $validated);
        $relacionados = $validated['relacionados'] ?? [];
        unset($validated['relacionados']);

        if (!isset($validated['prazo']) && isset($validated['data_prevista_termino'])) {
            $validated['prazo'] = $validated['data_prevista_termino'];
        }

        $tarefa->update($validated);

        if ($hasRelacionados) {
            $tarefa->relacionados()->sync($relacionados);
        }

        $tarefa->load(['projeto', 'responsavel', 'relacionados']);

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

        try {
            DB::transaction(function () use ($tarefa): void {
                // Mantem compatibilidade com bancos que nao tem ON DELETE CASCADE nessas relacoes.
                $tarefa->relacionados()->detach();
                DB::table('historico_progresso')
                    ->where('id_tarefa', $tarefa->id_tarefa)
                    ->delete();

                $tarefa->delete();
            });

            return response()->json([
                'success' => true,
                'message' => 'Tarefa excluída com sucesso',
            ]);
        } catch (\Throwable $e) {
            Log::error('Erro ao excluir tarefa', [
                'id_tarefa' => $id,
                'erro' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Nao foi possivel excluir a tarefa porque existem vinculos ativos.',
            ], 409);
        }
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