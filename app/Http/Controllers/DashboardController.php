<?php

namespace App\Http\Controllers;

use App\Models\Equipe;
use App\Models\Meta;
use App\Models\Projeto;
use App\Models\Sprint;
use App\Models\Tarefa;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    private const TEMP_DELETED_STATUS = Projeto::STATUS_EXCLUIDO;

    private function normalizeSearchQuery(string $value): string
    {
        return Str::ascii(mb_strtolower(trim($value)));
    }

    private function normalizedSearchColumn(string $column): string
    {
        $expression = "LOWER({$column})";

        foreach ([
            'á' => 'a',
            'à' => 'a',
            'â' => 'a',
            'ã' => 'a',
            'ä' => 'a',
            'é' => 'e',
            'è' => 'e',
            'ê' => 'e',
            'ë' => 'e',
            'í' => 'i',
            'ì' => 'i',
            'î' => 'i',
            'ï' => 'i',
            'ó' => 'o',
            'ò' => 'o',
            'ô' => 'o',
            'õ' => 'o',
            'ö' => 'o',
            'ú' => 'u',
            'ù' => 'u',
            'û' => 'u',
            'ü' => 'u',
            'ç' => 'c',
        ] as $from => $to) {
            $expression = "REPLACE({$expression}, '{$from}', '{$to}')";
        }

        return $expression;
    }

    private function normalizedSearchLike(string $column): string
    {
        return $this->normalizedSearchColumn($column) . ' LIKE ?';
    }

    private function currentUserIsAdmin(Request $request): bool
    {
        return (bool) data_get($request->session()->get('auth.user'), 'permissions.total', false);
    }

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

        $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $this->normalizeSearchQuery($query)) . '%';
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
                        ->whereRaw($this->normalizedSearchLike('nome_projeto'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('descricao'), [$like]);
                })
                ->orderBy('nome_projeto')
                ->limit(10)
                ->get(['id_projeto', 'nome_projeto', 'descricao']);

            foreach ($projetos as $projeto) {
                $results[] = [
                    'id' => 'projeto:' . $projeto->id_projeto,
                    'type' => 'projeto',
                    'title' => $projeto->nome_projeto,
                    'subtitle' => $projeto->descricao ?: 'Projeto',
                    'url' => '/projetos?project=' . $projeto->id_projeto,
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
                        ->whereRaw($this->normalizedSearchLike('tarefas.titulo'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('tarefas.descricao'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('projetos.nome_projeto'), [$like]);
                })
                ->orderBy('tarefas.id_tarefa', 'desc')
                ->limit(12)
                ->get([
                    'tarefas.id_tarefa',
                    'tarefas.id_projeto',
                    'tarefas.titulo',
                    'projetos.nome_projeto as projeto_nome',
                ]);

            foreach ($tarefas as $tarefa) {
                $results[] = [
                    'id' => 'tarefa:' . $tarefa->id_tarefa,
                    'type' => 'tarefa',
                    'title' => $tarefa->titulo,
                    'subtitle' => $tarefa->projeto_nome ? ('Projeto: ' . $tarefa->projeto_nome) : 'Card de tarefa',
                    'url' => '/projetos?project=' . $tarefa->id_projeto . '&task=' . $tarefa->id_tarefa,
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
                        ->whereRaw($this->normalizedSearchLike('metas.titulo_meta'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('projetos.nome_projeto'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('metas.status_meta'), [$like]);
                })
                ->orderBy('metas.id_meta', 'desc')
                ->limit(10)
                ->get([
                    'metas.id_meta',
                    'metas.id_projeto',
                    'metas.titulo_meta',
                    'projetos.nome_projeto as projeto_nome',
                ]);

            foreach ($metas as $meta) {
                $results[] = [
                    'id' => 'meta:' . $meta->id_meta,
                    'type' => 'meta',
                    'title' => $meta->titulo_meta,
                    'subtitle' => $meta->projeto_nome ? ('Projeto: ' . $meta->projeto_nome) : 'Meta',
                    'url' => '/desempenho?project=' . $meta->id_projeto,
                ];
            }
        }

        $currentUserIsAdmin = $this->currentUserIsAdmin($request);

        if (Schema::hasTable('usuarios')) {
            $usuarios = Usuario::query()
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->whereRaw($this->normalizedSearchLike('nome'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('email'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('cargo'), [$like]);
                })
                ->orderBy('nome')
            ->limit(10)
                ->get(['id_usuario', 'id_equipe', 'nome', 'email', 'cargo']);

            foreach ($usuarios as $usuario) {
                $results[] = [
                    'id' => 'usuario:' . $usuario->id_usuario,
                    'type' => 'usuario',
                    'title' => $usuario->nome,
                    'subtitle' => $usuario->email ?: ($usuario->cargo ?: 'Pessoa'),
                    'url' => $currentUserIsAdmin
                        ? '/gestao?tab=usuarios&user=' . $usuario->id_usuario
                        : '/equipe?user=' . $usuario->id_usuario . ($usuario->id_equipe ? '&team=' . $usuario->id_equipe : ''),
                ];
            }
        }

        if (Schema::hasTable('equipes')) {
            $equipes = Equipe::query()
                ->where(function ($builder) use ($like): void {
                    $builder
                        ->whereRaw($this->normalizedSearchLike('nome'), [$like])
                        ->orWhereRaw($this->normalizedSearchLike('tipo'), [$like]);
                })
                ->orderBy('nome')
                ->limit(10)
                ->get(['id_equipe', 'nome', 'tipo']);

            foreach ($equipes as $equipe) {
                $results[] = [
                    'id' => 'equipe:' . $equipe->id_equipe,
                    'type' => 'equipe',
                    'title' => $equipe->nome,
                    'subtitle' => $equipe->tipo ?: 'Equipe',
                    'url' => '/equipe?team=' . $equipe->id_equipe,
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

    /** Tarefas fora da lixeira, base de todos os indicadores. */
    private function tarefas()
    {
        return Tarefa::query()->deProjetosAtivos();
    }

    /**
     * Tarefa atrasada: não concluída e (a) numa sprint ativa que já terminou
     * ou (b) fora de sprint com o prazo vencido.
     */
    private function filtroAtrasadas(Carbon $hoje): \Closure
    {
        return function ($q) use ($hoje): void {
            $q->where(function ($inner) use ($hoje): void {
                $inner->whereNotNull('id_sprint')
                    ->whereHas('sprint', fn ($sq) => $sq->where('status_sprint', 'ATIVA')->whereDate('data_fim', '<', $hoje));
            })->orWhere(function ($inner) use ($hoje): void {
                $inner->whereNull('id_sprint')->whereNotNull('prazo')->whereDate('prazo', '<', $hoje);
            });
        };
    }

    private function filtroVencendo(Carbon $hoje, int $dias): \Closure
    {
        $limite = $hoje->copy()->addDays($dias);

        return function ($q) use ($hoje, $limite): void {
            $q->where(function ($inner) use ($hoje, $limite): void {
                $inner->whereNotNull('id_sprint')
                    ->whereHas('sprint', fn ($sq) => $sq->where('status_sprint', 'ATIVA')->whereBetween('data_fim', [$hoje, $limite]));
            })->orWhere(function ($inner) use ($hoje, $limite): void {
                $inner->whereNull('id_sprint')->whereNotNull('prazo')->whereBetween('prazo', [$hoje, $limite]);
            });
        };
    }

    /** Concluídas no período: pela data real de conclusão; sem ela, pelo prazo. */
    private function filtroConcluidasNoPeriodo(Carbon $dataRef): \Closure
    {
        return function ($q) use ($dataRef): void {
            $q->where('concluida_em', '>=', $dataRef)
                ->orWhere(function ($inner) use ($dataRef): void {
                    $inner->whereNull('concluida_em')
                        ->where(fn ($p) => $p->where('prazo', '>=', $dataRef)->orWhereNull('prazo'));
                });
        };
    }

    private function resumoTarefa(Tarefa $t, bool $comResponsavel = true): array
    {
        $item = [
            'titulo'  => $t->titulo,
            'projeto' => $t->projeto?->nome_projeto ?? '-',
        ];

        if ($comResponsavel) {
            $item['responsavel'] = $t->responsavel?->nome ?? '-';
            $item['prazo'] = $t->relationLoaded('sprint') && $t->sprint ? $t->sprint->data_fim : $t->prazo;
        }

        return $item;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $dias    = min(365, max(1, (int) $request->query('dias', 30)));
            $dataRef = Carbon::now()->subDays($dias);
            $hoje    = Carbon::today();

            // ----------------------------------------------------------------
            // KPI Cards
            // ----------------------------------------------------------------
            $tarefasPendentes = $this->tarefas()->abertas()->count();
            $tarefasAtrasadas = $this->tarefas()->abertas()->where($this->filtroAtrasadas($hoje))->count();
            $tarefasConcluidas = $this->tarefas()->concluidas()->where($this->filtroConcluidasNoPeriodo($dataRef))->count();
            $progressoMedio = (float) ($this->tarefas()->avg('progresso') ?? 0);

            // ----------------------------------------------------------------
            // Saúde dos Projetos (consultas agrupadas, sem N+1)
            // ----------------------------------------------------------------
            $projetosAtivosLista = Projeto::with('responsavel')->ativos()->get();
            $idsProjetos = $projetosAtivosLista->pluck('id_projeto');

            $progressoPorProjeto = Tarefa::query()
                ->whereIn('id_projeto', $idsProjetos)
                ->groupBy('id_projeto')
                ->selectRaw('id_projeto, AVG(COALESCE(progresso, 0)) as media')
                ->pluck('media', 'id_projeto');

            $sprintsAtivas = Sprint::query()
                ->whereIn('id_projeto', $idsProjetos)
                ->where('status_sprint', 'ATIVA')
                ->get()
                ->keyBy('id_projeto');

            $pendentesPorSprint = $sprintsAtivas->isEmpty()
                ? collect()
                : Tarefa::query()
                    ->whereIn('id_sprint', $sprintsAtivas->pluck('id_sprint'))
                    ->abertas()
                    ->groupBy('id_sprint')
                    ->selectRaw('id_sprint, COUNT(*) as total')
                    ->pluck('total', 'id_sprint');

            $projetos = $projetosAtivosLista
                ->map(function (Projeto $projeto) use ($hoje, $progressoPorProjeto, $sprintsAtivas, $pendentesPorSprint): array {
                    $progresso = (float) ($progressoPorProjeto[$projeto->id_projeto] ?? 0);
                    $sprintAtiva = $sprintsAtivas->get($projeto->id_projeto);

                    if ($sprintAtiva) {
                        $sprintFim = Carbon::parse($sprintAtiva->data_fim)->endOfDay();
                        $pendentes = (int) ($pendentesPorSprint[$sprintAtiva->id_sprint] ?? 0);

                        if ($hoje->gt($sprintFim) && $pendentes > 0) {
                            $status = 'ATRASADO';
                        } elseif ($sprintFim->diffInDays($hoje, false) >= -3 && $pendentes > 0) {
                            $status = 'EM_RISCO';
                        } else {
                            $status = 'EM_DIA';
                        }
                    } elseif ($projeto->prazo_final) {
                        $diasRestantes = $hoje->diffInDays(Carbon::parse($projeto->prazo_final), false);

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
                ->sortByDesc(fn ($p) => match ($p['status']) {
                    'ATRASADO' => 2,
                    'EM_RISCO' => 1,
                    default    => 0,
                })
                ->values();

            $projetosAtivos = $projetos->count();
            $projetosEmRisco = $projetos
                ->filter(fn ($p) => in_array($p['status'], ['EM_RISCO', 'ATRASADO'], true))
                ->count();

            // ----------------------------------------------------------------
            // Evolução de tarefas por semana (últimas 6 semanas)
            // ----------------------------------------------------------------
            $evolucao = [];

            for ($i = 5; $i >= 0; $i--) {
                $inicio = Carbon::now()->startOfWeek()->subWeeks($i);
                $fim    = (clone $inicio)->endOfWeek();

                $evolucao[] = [
                    'semana'     => 'Sem ' . (6 - $i),
                    'concluidas' => $this->tarefas()->concluidas()
                        ->where(function ($q) use ($inicio, $fim): void {
                            $q->whereBetween('concluida_em', [$inicio, $fim])
                                ->orWhere(fn ($p) => $p->whereNull('concluida_em')->whereBetween('prazo', [$inicio, $fim]));
                        })
                        ->count(),
                    'criadas'    => $this->tarefas()->whereBetween('data_inicio', [$inicio, $fim])->count(),
                ];
            }

            // ----------------------------------------------------------------
            // Produtividade por cargo (uma consulta agrupada)
            // ----------------------------------------------------------------
            $membrosPorCargo = Usuario::query()
                ->whereNotNull('cargo')
                ->groupBy('cargo')
                ->selectRaw('cargo, COUNT(*) as membros')
                ->pluck('membros', 'cargo');

            $concluidasPorCargo = $this->tarefas()
                ->concluidas()
                ->join('usuarios', 'usuarios.id_usuario', '=', 'tarefas.id_responsavel')
                ->whereNotNull('usuarios.cargo')
                ->groupBy('usuarios.cargo')
                ->selectRaw('usuarios.cargo as cargo, COUNT(*) as total')
                ->pluck('total', 'cargo');

            $produtividade = $membrosPorCargo
                ->map(fn ($membros, $cargo) => [
                    'equipe'     => $cargo,
                    'concluidas' => (int) ($concluidasPorCargo[$cargo] ?? 0),
                    'membros'    => (int) $membros,
                ])
                ->values();

            // ----------------------------------------------------------------
            // Distribuição de tarefas por status (vale para quadro padrão e personalizado)
            // ----------------------------------------------------------------
            $distribuicao = [
                ['status' => 'Concluídas',   'valor' => $this->tarefas()->concluidas()->count()],
                ['status' => 'Em andamento', 'valor' => $this->tarefas()->abertas()->where('progresso', '>', 0)->count()],
                ['status' => 'Pendentes',    'valor' => $this->tarefas()->abertas()->where(fn ($q) => $q->whereNull('progresso')->orWhere('progresso', 0))->count()],
                ['status' => 'Atrasadas',    'valor' => $tarefasAtrasadas],
            ];

            // ----------------------------------------------------------------
            // Alertas inteligentes
            // ----------------------------------------------------------------
            $alertas = [];

            // Projetos sem log de atividade há mais de 7 dias
            $ultimoLogPorProjeto = DB::table('log_projeto')
                ->whereIn('id_projeto', $idsProjetos)
                ->groupBy('id_projeto')
                ->selectRaw('id_projeto, MAX(data_hora) as ultimo')
                ->pluck('ultimo', 'id_projeto');

            foreach ($projetosAtivosLista as $p) {
                $ultimo = $ultimoLogPorProjeto[$p->id_projeto] ?? null;

                if (!$ultimo || Carbon::parse($ultimo)->lt(Carbon::now()->subDays(7))) {
                    $diasSemUpdate = $ultimo ? (int) Carbon::parse($ultimo)->diffInDays(Carbon::now()) : null;

                    $alertas[] = [
                        'tipo'     => 'sem_atualizacao',
                        'titulo'   => 'Projeto sem atualização',
                        'mensagem' => $p->nome_projeto . ' não tem atualizações há ' . ($diasSemUpdate !== null ? $diasSemUpdate : '?') . ' dias',
                        'nivel'    => 'danger',
                    ];
                }
            }

            // Membros sobrecarregados (mais que 2× a média)
            $totalUsuarios = Usuario::count();
            $mediaTarefas  = $totalUsuarios > 0 ? ($tarefasPendentes / $totalUsuarios) : 0;

            if ($mediaTarefas > 0) {
                $sobrecarregados = $this->tarefas()
                    ->abertas()
                    ->join('usuarios', 'usuarios.id_usuario', '=', 'tarefas.id_responsavel')
                    ->groupBy('usuarios.id_usuario', 'usuarios.nome')
                    ->havingRaw('COUNT(*) > ?', [$mediaTarefas * 2])
                    ->selectRaw('usuarios.nome as nome, COUNT(*) as qtd')
                    ->get();

                foreach ($sobrecarregados as $row) {
                    $alertas[] = [
                        'tipo'     => 'sobrecarga',
                        'titulo'   => 'Sobrecarga de tarefas',
                        'mensagem' => $row->nome . ' tem ' . $row->qtd . ' tarefas ativas (média: ' . round($mediaTarefas) . ')',
                        'nivel'    => 'warning',
                    ];
                }
            }

            // ----------------------------------------------------------------
            // Resumo Operacional
            // ----------------------------------------------------------------
            $tarefasAtrasadasLista = $this->tarefas()->with(['projeto', 'responsavel', 'sprint'])
                ->abertas()
                ->where($this->filtroAtrasadas($hoje))
                ->take(5)
                ->get()
                ->map(fn (Tarefa $t) => $this->resumoTarefa($t));

            $vencendoEm7Dias = $this->tarefas()->with(['projeto', 'responsavel', 'sprint'])
                ->abertas()
                ->where($this->filtroVencendo($hoje, 7))
                ->take(5)
                ->get()
                ->map(fn (Tarefa $t) => $this->resumoTarefa($t));

            $semResponsavel = $this->tarefas()->with('projeto')
                ->abertas()
                ->whereNull('id_responsavel')
                ->take(5)
                ->get()
                ->map(fn (Tarefa $t) => $this->resumoTarefa($t, false));

            $tarefasPendentesLista = $this->tarefas()->with(['projeto', 'responsavel'])
                ->abertas()
                ->orderByRaw('CASE WHEN prazo IS NULL THEN 1 ELSE 0 END')
                ->orderBy('prazo')
                ->orderBy('id_tarefa')
                ->limit(200)
                ->get()
                ->map(fn (Tarefa $t) => $this->resumoTarefa($t));

            $tarefasConcluidasLista = $this->tarefas()->with(['projeto', 'responsavel'])
                ->concluidas()
                ->where($this->filtroConcluidasNoPeriodo($dataRef))
                ->orderByDesc('concluida_em')
                ->orderByDesc('id_tarefa')
                ->limit(200)
                ->get()
                ->map(fn (Tarefa $t) => $this->resumoTarefa($t));

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
                        'pendentes'       => $tarefasPendentesLista,
                        'concluidas'      => $tarefasConcluidasLista,
                        'atrasadas'       => $tarefasAtrasadasLista,
                        'vencendo_7dias'  => $vencendoEm7Dias,
                        'sem_responsavel' => $semResponsavel,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar dashboard.',
            ], 500);
        }
    }
}
