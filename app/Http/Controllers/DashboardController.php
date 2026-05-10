<?php

namespace App\Http\Controllers;

use App\Models\Projeto;
use App\Models\Tarefa;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** Status de tarefa considerados "concluído" */
    private const CONCLUIDOS = ['APROVADO', 'CONCLUIDA', 'CONCLUÍDA', 'DONE'];

    /** Status de projeto considerados ativos (não encerrados) */
    private const PROJ_EXCLUIDOS = ['Concluído', 'Concluida', 'Cancelado', 'Cancelada'];

    public function index(Request $request): JsonResponse
    {
        try {
            $dias    = max(1, (int) $request->query('dias', 30));
            $dataRef = Carbon::now()->subDays($dias);
            $hoje    = Carbon::today();

            // ----------------------------------------------------------------
            // KPI Cards
            // ----------------------------------------------------------------
            $projetosAtivos = Projeto::whereNotIn(
                DB::raw('LOWER(status_projeto)'),
                array_map('strtolower', self::PROJ_EXCLUIDOS)
            )->count();

            $projetosEmRisco = Projeto::where(function ($q) {
                $q->whereRaw("LOWER(status_projeto) LIKE '%risco%'")
                  ->orWhere(function ($q2) {
                      // Projetos sem status definido com prazo em 14 dias e pouco progresso
                      $q2->whereNotNull('prazo_final')
                         ->where('prazo_final', '<=', Carbon::today()->addDays(14));
                  });
            })->count();

            $tarefasPendentes = Tarefa::whereNotIn(
                DB::raw('UPPER(status_task)'),
                self::CONCLUIDOS
            )->count();

            $tarefasAtrasadas = Tarefa::whereNotIn(
                DB::raw('UPPER(status_task)'),
                self::CONCLUIDOS
            )
            ->whereNotNull('prazo')
            ->where('prazo', '<', $hoje)
            ->count();

            $tarefasConcluidas = Tarefa::whereIn(
                DB::raw('UPPER(status_task)'),
                self::CONCLUIDOS
            )
            ->where(function ($q) use ($dataRef) {
                $q->where('prazo', '>=', $dataRef)
                  ->orWhereNull('prazo');
            })
            ->count();

            $progressoMedio = (float) (Tarefa::avg('progresso') ?? 0);

            // ----------------------------------------------------------------
            // Saúde dos Projetos
            // ----------------------------------------------------------------
            $projetos = Projeto::with('responsavel')
                ->whereNotIn(
                    DB::raw('LOWER(status_projeto)'),
                    array_map('strtolower', self::PROJ_EXCLUIDOS)
                )
                ->get()
                ->map(function ($projeto) use ($hoje) {
                    $progresso  = (float) (Tarefa::where('id_projeto', $projeto->id_projeto)->avg('progresso') ?? 0);
                    $prazoFinal = $projeto->prazo_final ? Carbon::parse($projeto->prazo_final) : null;

                    if ($prazoFinal) {
                        $diasRestantes = $hoje->diffInDays($prazoFinal, false);
                        if ($diasRestantes < 0) {
                            $status = 'ATRASADO';
                        } elseif ($diasRestantes <= 14 && $progresso < 80) {
                            $status = 'EM_RISCO';
                        } else {
                            $status = 'EM_DIA';
                        }
                    } else {
                        $status = 'EM_DIA';
                    }

                    return [
                        'id'          => $projeto->id_projeto,
                        'nome'        => $projeto->nome_projeto,
                        'progresso'   => round($progresso),
                        'prazo'       => $projeto->prazo_final,
                        'responsavel' => $projeto->responsavel?->nome ?? null,
                        'status'      => $status,
                    ];
                })
                ->sortByDesc(fn($p) => match ($p['status']) {
                    'ATRASADO' => 2,
                    'EM_RISCO' => 1,
                    default    => 0,
                })
                ->values();

            // ----------------------------------------------------------------
            // Evolução de tarefas por semana (últimas 6 semanas)
            // ----------------------------------------------------------------
            $evolucao = [];
            for ($i = 5; $i >= 0; $i--) {
                $inicio = Carbon::now()->startOfWeek()->subWeeks($i);
                $fim    = (clone $inicio)->endOfWeek();

                $evolucao[] = [
                    'semana'     => 'Sem ' . (6 - $i),
                    'concluidas' => Tarefa::whereIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                        ->whereBetween('prazo', [$inicio, $fim])
                        ->count(),
                    'criadas'    => Tarefa::whereBetween('data_inicio', [$inicio, $fim])->count(),
                ];
            }

            // ----------------------------------------------------------------
            // Produtividade por cargo (agrupamento viável com o schema atual)
            // ----------------------------------------------------------------
            $produtividade = Usuario::select('cargo', DB::raw('COUNT(usuarios.id_usuario) as membros'))
                ->whereNotNull('cargo')
                ->groupBy('cargo')
                ->get()
                ->map(function ($grupo) use ($dataRef) {
                    $membrosIds = Usuario::where('cargo', $grupo->cargo)->pluck('id_usuario');

                    $concluidas = Tarefa::whereIn('id_responsavel', $membrosIds)
                        ->whereIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                        ->count();

                    return [
                        'equipe'     => $grupo->cargo,
                        'concluidas' => $concluidas,
                        'membros'    => $grupo->membros,
                    ];
                })
                ->values();

            // ----------------------------------------------------------------
            // Distribuição de tarefas por status
            // ----------------------------------------------------------------
            $distribuicao = [
                ['status' => 'Concluídas',   'valor' => Tarefa::whereIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)->count()],
                ['status' => 'Em andamento', 'valor' => Tarefa::whereRaw("UPPER(status_task) IN ('DOING','TESTE')")->count()],
                ['status' => 'Pendentes',    'valor' => Tarefa::whereRaw("UPPER(status_task) IN ('TO_DO','BACKLOG')")->count()],
                ['status' => 'Atrasadas',    'valor' => $tarefasAtrasadas],
            ];

            // ----------------------------------------------------------------
            // Alertas inteligentes
            // ----------------------------------------------------------------
            $alertas = [];

            // Projetos sem log de atividade há mais de 7 dias
            $todosAtivos = Projeto::whereNotIn(
                DB::raw('LOWER(status_projeto)'),
                array_map('strtolower', self::PROJ_EXCLUIDOS)
            )->get();

            foreach ($todosAtivos as $p) {
                $ultimoLog = DB::table('log_projeto')
                    ->where('id_projeto', $p->id_projeto)
                    ->orderByDesc('data_hora')
                    ->first();

                if (!$ultimoLog || Carbon::parse($ultimoLog->data_hora)->lt(Carbon::now()->subDays(7))) {
                    $diasSemUpdate = $ultimoLog
                        ? (int) Carbon::parse($ultimoLog->data_hora)->diffInDays(Carbon::now())
                        : null;

                    $alertas[] = [
                        'tipo'     => 'sem_atualizacao',
                        'titulo'   => 'Projeto sem atualização',
                        'mensagem' => $p->nome_projeto . ' não tem atualizações há ' . ($diasSemUpdate !== null ? $diasSemUpdate : '?') . ' dias',
                        'nivel'    => 'danger',
                    ];
                }
            }

            // Membros sobrecarregados (mais que 2× a média)
            $totalTarefasAtivas = Tarefa::whereNotIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)->count();
            $totalUsuarios      = Usuario::count();
            $mediaTarefas       = $totalUsuarios > 0 ? ($totalTarefasAtivas / $totalUsuarios) : 0;

            if ($mediaTarefas > 0) {
                $porUsuario = Tarefa::select('id_responsavel', DB::raw('COUNT(*) as qtd'))
                    ->whereNotNull('id_responsavel')
                    ->whereNotIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                    ->groupBy('id_responsavel')
                    ->having('qtd', '>', $mediaTarefas * 2)
                    ->get();

                foreach ($porUsuario as $row) {
                    $u = Usuario::find($row->id_responsavel);
                    if ($u) {
                        $alertas[] = [
                            'tipo'     => 'sobrecarga',
                            'titulo'   => 'Sobrecarga de tarefas',
                            'mensagem' => $u->nome . ' tem ' . $row->qtd . ' tarefas ativas (média: ' . round($mediaTarefas) . ')',
                            'nivel'    => 'warning',
                        ];
                    }
                }
            }

            // ----------------------------------------------------------------
            // Resumo Operacional
            // ----------------------------------------------------------------
            $tarefasAtrasadasLista = Tarefa::with(['projeto', 'responsavel'])
                ->whereNotIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                ->whereNotNull('prazo')
                ->where('prazo', '<', $hoje)
                ->orderBy('prazo')
                ->take(5)
                ->get()
                ->map(fn($t) => [
                    'titulo'      => $t->titulo,
                    'projeto'     => $t->projeto?->nome_projeto ?? '-',
                    'responsavel' => $t->responsavel?->nome ?? '-',
                    'prazo'       => $t->prazo,
                ]);

            $vencendoEm7Dias = Tarefa::with(['projeto', 'responsavel'])
                ->whereNotIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                ->whereNotNull('prazo')
                ->whereBetween('prazo', [$hoje, $hoje->copy()->addDays(7)])
                ->orderBy('prazo')
                ->take(5)
                ->get()
                ->map(fn($t) => [
                    'titulo'      => $t->titulo,
                    'projeto'     => $t->projeto?->nome_projeto ?? '-',
                    'responsavel' => $t->responsavel?->nome ?? '-',
                    'prazo'       => $t->prazo,
                ]);

            $semResponsavel = Tarefa::with('projeto')
                ->whereNotIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                ->whereNull('id_responsavel')
                ->take(5)
                ->get()
                ->map(fn($t) => [
                    'titulo'  => $t->titulo,
                    'projeto' => $t->projeto?->nome_projeto ?? '-',
                ]);

            return response()->json([
                'success' => true,
                'data'    => [
                    'kpis' => [
                        'projetos_ativos'    => $projetosAtivos,
                        'projetos_em_risco'  => $projetosEmRisco,
                        'tarefas_pendentes'  => $tarefasPendentes,
                        'tarefas_atrasadas'  => $tarefasAtrasadas,
                        'tarefas_concluidas' => $tarefasConcluidas,
                        'progresso_medio'    => round($progressoMedio),
                    ],
                    'saude_projetos'       => $projetos,
                    'evolucao_semanal'     => $evolucao,
                    'produtividade_equipe' => $produtividade,
                    'distribuicao_status'  => $distribuicao,
                    'alertas'              => $alertas,
                    'resumo_operacional'   => [
                        'atrasadas'       => $tarefasAtrasadasLista,
                        'vencendo_7dias'  => $vencendoEm7Dias,
                        'sem_responsavel' => $semResponsavel,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard: ' . $e->getMessage(),
            ], 500);
        }
    }
}
