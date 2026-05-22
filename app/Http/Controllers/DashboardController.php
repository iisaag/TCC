<?php

namespace App\Http\Controllers;

use App\Models\Equipe;
use App\Models\Meta;
use App\Models\Projeto;
use App\Models\Tarefa;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    /** Status de tarefa considerados "concluído" */
    private const CONCLUIDOS = ['APROVADO', 'CONCLUIDA', 'CONCLUÍDA', 'DONE'];

    /** Status de projeto considerados ativos (não encerrados) */
    private const PROJ_EXCLUIDOS = ['Concluído', 'Concluida', 'Cancelado', 'Cancelada'];
    private const TEMP_DELETED_STATUS = '__EXCLUIDO_TEMP__';

    public function globalSearch(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'data' => [
                    'results' => [],
                    'query' => $query,
                ],
            ]);
        }

        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $query) . '%';
        $results = [];

        if (Schema::hasTable('projetos')) {
            $projetos = Projeto::query()
                ->where(function ($builder): void {
                    $builder
                        ->whereNull('status_projeto')
                        ->orWhereRaw('UPPER(TRIM(status_projeto)) <> ?', [self::TEMP_DELETED_STATUS]);
                })
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->where('nome_projeto', 'like', $like)
                        ->orWhere('descricao', 'like', $like);
                })
                ->orderBy('nome_projeto')
                ->limit(6)
                ->get(['id_projeto', 'nome_projeto', 'descricao']);

            foreach ($projetos as $projeto) {
                $results[] = [
                    'id' => 'projeto:' . $projeto->id_projeto,
                    'type' => 'projeto',
                    'title' => $projeto->nome_projeto,
                    'subtitle' => $projeto->descricao ?: 'Projeto',
                    'url' => '/projetos',
                ];
            }
        }

        if (Schema::hasTable('tarefas')) {
            $tarefas = Tarefa::query()
                ->leftJoin('projetos', 'projetos.id_projeto', '=', 'tarefas.id_projeto')
                ->where(function ($builder): void {
                    $builder
                        ->whereNull('projetos.status_projeto')
                        ->orWhereRaw('UPPER(TRIM(projetos.status_projeto)) <> ?', [self::TEMP_DELETED_STATUS]);
                })
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->where('tarefas.titulo', 'like', $like)
                        ->orWhere('tarefas.descricao', 'like', $like)
                        ->orWhere('projetos.nome_projeto', 'like', $like);
                })
                ->orderBy('tarefas.id_tarefa', 'desc')
                ->limit(8)
                ->get([
                    'tarefas.id_tarefa',
                    'tarefas.titulo',
                    'projetos.nome_projeto as projeto_nome',
                ]);

            foreach ($tarefas as $tarefa) {
                $results[] = [
                    'id' => 'tarefa:' . $tarefa->id_tarefa,
                    'type' => 'tarefa',
                    'title' => $tarefa->titulo,
                    'subtitle' => $tarefa->projeto_nome ? ('Projeto: ' . $tarefa->projeto_nome) : 'Card de tarefa',
                    'url' => '/projetos',
                ];
            }
        }

        if (Schema::hasTable('metas')) {
            $metas = Meta::query()
                ->leftJoin('projetos', 'projetos.id_projeto', '=', 'metas.id_projeto')
                ->where(function ($builder): void {
                    $builder
                        ->whereNull('projetos.status_projeto')
                        ->orWhereRaw('UPPER(TRIM(projetos.status_projeto)) <> ?', [self::TEMP_DELETED_STATUS]);
                })
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->where('metas.titulo_meta', 'like', $like)
                        ->orWhere('projetos.nome_projeto', 'like', $like)
                        ->orWhere('metas.status_meta', 'like', $like);
                })
                ->orderBy('metas.id_meta', 'desc')
                ->limit(6)
                ->get([
                    'metas.id_meta',
                    'metas.titulo_meta',
                    'projetos.nome_projeto as projeto_nome',
                ]);

            foreach ($metas as $meta) {
                $results[] = [
                    'id' => 'meta:' . $meta->id_meta,
                    'type' => 'meta',
                    'title' => $meta->titulo_meta,
                    'subtitle' => $meta->projeto_nome ? ('Projeto: ' . $meta->projeto_nome) : 'Meta',
                    'url' => '/desempenho',
                ];
            }
        }

        if (Schema::hasTable('usuarios')) {
            $usuarios = Usuario::query()
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->where('nome', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('cargo', 'like', $like);
                })
                ->orderBy('nome')
                ->limit(8)
                ->get(['id_usuario', 'nome', 'email', 'cargo']);

            foreach ($usuarios as $usuario) {
                $results[] = [
                    'id' => 'usuario:' . $usuario->id_usuario,
                    'type' => 'usuario',
                    'title' => $usuario->nome,
                    'subtitle' => $usuario->email ?: ($usuario->cargo ?: 'Pessoa'),
                    'url' => '/equipe',
                ];
            }
        }

        if (Schema::hasTable('equipes')) {
            $equipes = Equipe::query()
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->where('nome', 'like', $like)
                        ->orWhere('tipo', 'like', $like);
                })
                ->orderBy('nome')
                ->limit(6)
                ->get(['id_equipe', 'nome', 'tipo']);

            foreach ($equipes as $equipe) {
                $results[] = [
                    'id' => 'equipe:' . $equipe->id_equipe,
                    'type' => 'equipe',
                    'title' => $equipe->nome,
                    'subtitle' => $equipe->tipo ?: 'Equipe',
                    'url' => '/equipe',
                ];
            }
        }

        usort($results, static fn(array $a, array $b): int => strcmp((string) $a['title'], (string) $b['title']));

        return response()->json([
            'success' => true,
            'data' => [
                'results' => array_slice($results, 0, 25),
                'query' => $query,
            ],
        ]);
    }

    private function calcularProgressoMedio(): float
    {
        if (Schema::hasTable('tarefas') && Schema::hasColumn('tarefas', 'progresso')) {
            return (float) (Tarefa::avg('progresso') ?? 0);
        }

        if (Schema::hasTable('historico_progresso')) {
            return (float) (DB::table('historico_progresso')->avg('progresso') ?? 0);
        }

        $statusConcluidos = implode("','", self::CONCLUIDOS);

        return (float) (Tarefa::selectRaw(
            "AVG(CASE WHEN UPPER(status_task) IN ('{$statusConcluidos}') THEN 100 ELSE 0 END) as progresso"
        )->value('progresso') ?? 0);
    }

    private function calcularProgressoProjeto(int $idProjeto): float
    {
        if (Schema::hasTable('tarefas') && Schema::hasColumn('tarefas', 'progresso')) {
            return (float) (Tarefa::where('id_projeto', $idProjeto)->avg('progresso') ?? 0);
        }

        if (Schema::hasTable('historico_progresso')) {
            return (float) (DB::table('historico_progresso as hp')
                ->join('tarefas as t', 't.id_tarefa', '=', 'hp.id_tarefa')
                ->where('t.id_projeto', $idProjeto)
                ->avg('hp.progresso') ?? 0);
        }

        $statusConcluidos = implode("','", self::CONCLUIDOS);

        return (float) (Tarefa::where('id_projeto', $idProjeto)
            ->selectRaw("AVG(CASE WHEN UPPER(status_task) IN ('{$statusConcluidos}') THEN 100 ELSE 0 END) as progresso")
            ->value('progresso') ?? 0);
    }

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

                        // Mantemos o KPI sincronizado com a mesma regra da "Saúde dos Projetos"
                        // para evitar divergência entre total do card e itens do popup.
                        $projetosEmRisco = 0;

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

            $progressoMedio = $this->calcularProgressoMedio();

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
                    $progresso  = $this->calcularProgressoProjeto((int) $projeto->id_projeto);
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

            $projetosEmRisco = $projetos
                ->filter(fn($p) => in_array($p['status'], ['EM_RISCO', 'ATRASADO'], true))
                ->count();

            // ----------------------------------------------------------------
            // Evolução de tarefas por semana (últimas 6 semanas)
            // ----------------------------------------------------------------
            $evolucao = [];
            $campoCriacaoTarefa = Schema::hasColumn('tarefas', 'data_inicio')
                ? 'data_inicio'
                : (Schema::hasColumn('tarefas', 'created_at') ? 'created_at' : null);

            for ($i = 5; $i >= 0; $i--) {
                $inicio = Carbon::now()->startOfWeek()->subWeeks($i);
                $fim    = (clone $inicio)->endOfWeek();

                $evolucao[] = [
                    'semana'     => 'Sem ' . (6 - $i),
                    'concluidas' => Tarefa::whereIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                        ->whereBetween('prazo', [$inicio, $fim])
                        ->count(),
                    'criadas'    => $campoCriacaoTarefa
                        ? Tarefa::whereBetween($campoCriacaoTarefa, [$inicio, $fim])->count()
                        : 0,
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

            $tarefasPendentesLista = Tarefa::with(['projeto', 'responsavel'])
                ->whereNotIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                ->orderByRaw('CASE WHEN prazo IS NULL THEN 1 ELSE 0 END')
                ->orderBy('prazo')
                ->orderBy('id_tarefa')
                ->get()
                ->map(fn($t) => [
                    'titulo'      => $t->titulo,
                    'projeto'     => $t->projeto?->nome_projeto ?? '-',
                    'responsavel' => $t->responsavel?->nome ?? '-',
                    'prazo'       => $t->prazo,
                ]);

            $tarefasConcluidasLista = Tarefa::with(['projeto', 'responsavel'])
                ->whereIn(DB::raw('UPPER(status_task)'), self::CONCLUIDOS)
                ->where(function ($q) use ($dataRef) {
                    $q->where('prazo', '>=', $dataRef)
                      ->orWhereNull('prazo');
                })
                ->orderByRaw('CASE WHEN prazo IS NULL THEN 1 ELSE 0 END')
                ->orderByDesc('prazo')
                ->orderByDesc('id_tarefa')
                ->get()
                ->map(fn($t) => [
                    'titulo'      => $t->titulo,
                    'projeto'     => $t->projeto?->nome_projeto ?? '-',
                    'responsavel' => $t->responsavel?->nome ?? '-',
                    'prazo'       => $t->prazo,
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
                        'pendentes'      => $tarefasPendentesLista,
                        'concluidas'     => $tarefasConcluidasLista,
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
