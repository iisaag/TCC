<?php

namespace App\Http\Controllers;

use App\Models\Projeto;
use App\Support\Notificacoes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class ProjetosController extends Controller
{
    private const DELETION_RETENTION_DAYS = 7;
    private const TEMP_DELETED_STATUS = '__EXCLUIDO_TEMP__';

    private function authUserId(Request $request): ?int
    {
        $authUser = $request->session()->get('auth.user');

        if (!is_array($authUser) || !isset($authUser['id'])) {
            return null;
        }

        $id = (int) $authUser['id'];

        return $id > 0 ? $id : null;
    }

    private function ensureDeletedProjectsTable(): void
    {
        if (Schema::hasTable('projetos_excluidos')) {
            return;
        }

        Schema::create('projetos_excluidos', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('id_projeto_original')->nullable();
            $table->string('nome_projeto', 255);
            $table->text('descricao')->nullable();
            $table->date('data_inicio')->nullable();
            $table->date('prazo_final')->nullable();
            $table->string('status_projeto', 100)->nullable();
            $table->string('prioridade_proj', 20)->nullable();
            $table->unsignedInteger('id_responsavel')->nullable();
            $table->unsignedInteger('tarefas_afetadas')->default(0);
            $table->unsignedInteger('metas_afetadas')->default(0);
            $table->dateTime('excluido_em');
            $table->dateTime('expira_em')->index();
        });
    }

    private function normalizarPrioridadeProjeto(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        $normalized = mb_strtoupper(
            preg_replace('/\s+/', ' ', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $raw) ?: $raw)
        );

        if (str_contains($normalized, 'ALTA')) {
            return 'ALTA';
        }

        if (str_contains($normalized, 'BAIXA')) {
            return 'BAIXA';
        }

        if (str_contains($normalized, 'MEDIA') || str_contains($normalized, 'MEDI')) {
            return 'MEDIA';
        }

        return null;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Projeto::with('responsavel')
                ->where(function ($builder): void {
                    $builder
                        ->whereNull('status_projeto')
                        ->orWhereRaw('UPPER(TRIM(status_projeto)) <> ?', [self::TEMP_DELETED_STATUS]);
                });

            if ($request->filled('nome')) {
                $query->whereRaw('LOWER(nome_projeto) LIKE LOWER(?)', ["%{$request->nome}%"]);
            } elseif ($request->filled('status')) {
                $query->where('status_projeto', $request->status);
            } elseif ($request->filled('prioridade')) {
                $query->where('prioridade_proj', strtoupper($request->prioridade));
            }

            return response()->json([
                'success' => true,
                'message' => 'Projetos listados com sucesso',
                'data'    => ['projetos' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar projetos: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $projeto = Projeto::find($id);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Projeto encontrado com sucesso',
            'data'    => ['projeto' => $projeto],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $autorId = $this->authUserId($request);

        $request->merge([
            'prioridade_proj' => $this->normalizarPrioridadeProjeto($request->input('prioridade_proj')),
        ]);

        $validated = $request->validate([
            'nome_projeto'    => 'required|string|min:2|max:255',
            'descricao'       => 'nullable|string',
            'data_inicio'     => 'nullable|date',
            'prazo_final'     => 'nullable|date',
            'status_projeto'  => 'nullable|string',
            'prioridade_proj' => 'nullable|string|in:BAIXA,MEDIA,ALTA',
            'id_responsavel'  => 'nullable|integer|exists:usuarios,id_usuario',
        ]);

        $projeto = Projeto::create($validated);

        $nomeProjeto = trim((string) $projeto->nome_projeto);

        Notificacoes::logSistema($autorId, 'criar_projeto', sprintf('Criou o projeto "%s".', $nomeProjeto));
        Notificacoes::logProjeto($autorId, $projeto->id_projeto, sprintf('Projeto criado: %s', $nomeProjeto));

        Notificacoes::paraUsuarios(
            [(int) ($projeto->id_responsavel ?? 0)],
            $autorId,
            'projeto_atribuido',
            'Voce recebeu um novo projeto',
            sprintf('Voce foi definido como responsavel do projeto "%s".', $nomeProjeto),
            '/projetos'
        );

        return response()->json([
            'success' => true,
            'message' => 'Projeto cadastrado com sucesso',
            'data'    => ['projeto' => $projeto],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $projeto = Projeto::find($id);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        $autorId = $this->authUserId($request);
        $responsavelAnterior = $projeto->id_responsavel ? (int) $projeto->id_responsavel : null;
        $statusAnterior = (string) ($projeto->status_projeto ?? '');

        $request->merge([
            'prioridade_proj' => $this->normalizarPrioridadeProjeto($request->input('prioridade_proj')),
        ]);

        $validated = $request->validate([
            'nome_projeto'    => 'required|string|min:2|max:255',
            'descricao'       => 'nullable|string',
            'data_inicio'     => 'nullable|date',
            'prazo_final'     => 'nullable|date',
            'status_projeto'  => 'nullable|string',
            'prioridade_proj' => 'nullable|string|in:BAIXA,MEDIA,ALTA',
            'id_responsavel'  => 'nullable|integer|exists:usuarios,id_usuario',
        ]);

        $projeto->update($validated);

        $nomeProjeto = trim((string) $projeto->nome_projeto);

        Notificacoes::logSistema($autorId, 'atualizar_projeto', sprintf('Atualizou o projeto "%s".', $nomeProjeto));
        Notificacoes::logProjeto($autorId, $projeto->id_projeto, sprintf('Projeto atualizado: %s', $nomeProjeto));

        if ($responsavelAnterior !== (int) ($projeto->id_responsavel ?? 0) && $projeto->id_responsavel) {
            Notificacoes::paraUsuarios(
                [(int) $projeto->id_responsavel],
                $autorId,
                'projeto_atribuido',
                'Nova responsabilidade de projeto',
                sprintf('Voce foi definido como responsavel do projeto "%s".', $nomeProjeto),
                '/projetos'
            );
        }

        if (array_key_exists('status_projeto', $validated)) {
            $statusAtual = (string) ($projeto->status_projeto ?? '');
            if ($statusAtual !== $statusAnterior) {
                Notificacoes::paraUsuarios(
                    [(int) ($projeto->id_responsavel ?? 0)],
                    $autorId,
                    'projeto_status',
                    'Status de projeto atualizado',
                    sprintf('O projeto "%s" mudou de "%s" para "%s".', $nomeProjeto, $statusAnterior, $statusAtual),
                    '/projetos'
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Projeto atualizado com sucesso',
            'data'    => ['projeto' => $projeto],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $projeto = Projeto::find($id);

        if (!$projeto) {
            return response()->json([
                'success' => false,
                'message' => 'Projeto não encontrado',
            ], 404);
        }

        try {
            $this->ensureDeletedProjectsTable();

            DB::transaction(function () use ($projeto): void {
                $tarefasAfetadas = Schema::hasTable('tarefas')
                    ? (int) DB::table('tarefas')->where('id_projeto', $projeto->id_projeto)->count()
                    : 0;
                $metasAfetadas = Schema::hasTable('metas')
                    ? (int) DB::table('metas')->where('id_projeto', $projeto->id_projeto)->count()
                    : 0;

                $existingHistoryId = DB::table('projetos_excluidos')
                    ->where('id_projeto_original', (int) $projeto->id_projeto)
                    ->value('id');

                $historyPayload = [
                    'id_projeto_original' => (int) $projeto->id_projeto,
                    'nome_projeto' => $projeto->nome_projeto,
                    'descricao' => $projeto->descricao,
                    'data_inicio' => $projeto->data_inicio,
                    'prazo_final' => $projeto->prazo_final,
                    'status_projeto' => $projeto->status_projeto,
                    'prioridade_proj' => $projeto->prioridade_proj,
                    'id_responsavel' => $projeto->id_responsavel,
                    'tarefas_afetadas' => $tarefasAfetadas,
                    'metas_afetadas' => $metasAfetadas,
                    'excluido_em' => now(),
                    'expira_em' => now()->addDays(self::DELETION_RETENTION_DAYS),
                ];

                if ($existingHistoryId) {
                    DB::table('projetos_excluidos')->where('id', (int) $existingHistoryId)->update($historyPayload);
                } else {
                    DB::table('projetos_excluidos')->insert($historyPayload);
                }

                $projeto->update(['status_projeto' => self::TEMP_DELETED_STATUS]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Projeto excluído com sucesso',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Nao foi possivel excluir o projeto: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function deletedHistory(): JsonResponse
    {
        $this->ensureDeletedProjectsTable();

        DB::table('projetos_excluidos')
            ->where('expira_em', '<=', now())
            ->delete();

        $historico = DB::table('projetos_excluidos')
            ->orderByDesc('excluido_em')
            ->get()
            ->map(static function ($item): array {
                return [
                    'id' => (int) $item->id,
                    'id_projeto_original' => $item->id_projeto_original,
                    'nome_projeto' => $item->nome_projeto,
                    'descricao' => $item->descricao,
                    'data_inicio' => $item->data_inicio,
                    'prazo_final' => $item->prazo_final,
                    'status_projeto' => $item->status_projeto,
                    'prioridade_proj' => $item->prioridade_proj,
                    'id_responsavel' => $item->id_responsavel,
                    'tarefas_afetadas' => (int) $item->tarefas_afetadas,
                    'metas_afetadas' => (int) $item->metas_afetadas,
                    'excluido_em' => $item->excluido_em,
                    'expira_em' => $item->expira_em,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Histórico de projetos excluídos carregado com sucesso.',
            'data' => ['projetos_excluidos' => $historico],
        ]);
    }

    public function restoreDeleted(int $registro): JsonResponse
    {
        $this->ensureDeletedProjectsTable();

        $historico = DB::table('projetos_excluidos')->where('id', $registro)->first();

        if (! $historico) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de exclusão não encontrado.',
            ], 404);
        }

        if (Carbon::parse((string) $historico->expira_em)->lte(now())) {
            DB::table('projetos_excluidos')->where('id', $registro)->delete();

            return response()->json([
                'success' => false,
                'message' => 'Este registro expirou e não pode mais ser restaurado.',
            ], 410);
        }

        $idResponsavel = $historico->id_responsavel;
        if ($idResponsavel && Schema::hasTable('usuarios')) {
            $responsavelExiste = DB::table('usuarios')->where('id_usuario', (int) $idResponsavel)->exists();
            if (! $responsavelExiste) {
                $idResponsavel = null;
            }
        }

        $idOriginal = (int) ($historico->id_projeto_original ?? 0);
        $projetoOriginal = $idOriginal > 0 ? Projeto::find($idOriginal) : null;

        if ($projetoOriginal) {
            $projetoOriginal->update([
                'nome_projeto' => $historico->nome_projeto,
                'descricao' => $historico->descricao,
                'data_inicio' => $historico->data_inicio,
                'prazo_final' => $historico->prazo_final,
                'status_projeto' => $historico->status_projeto,
                'prioridade_proj' => $historico->prioridade_proj,
                'id_responsavel' => $idResponsavel,
            ]);
        } else {
            Projeto::create([
                'nome_projeto' => $historico->nome_projeto,
                'descricao' => $historico->descricao,
                'data_inicio' => $historico->data_inicio,
                'prazo_final' => $historico->prazo_final,
                'status_projeto' => $historico->status_projeto,
                'prioridade_proj' => $historico->prioridade_proj,
                'id_responsavel' => $idResponsavel,
            ]);
        }

        DB::table('projetos_excluidos')->where('id', $registro)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Projeto restaurado com sucesso.',
        ]);
    }

    public function totalPorStatus(): JsonResponse
    {
        try {
            $total = Projeto::selectRaw('status_projeto, COUNT(*) as total')
                ->where(function ($builder): void {
                    $builder
                        ->whereNull('status_projeto')
                        ->orWhereRaw('UPPER(TRIM(status_projeto)) <> ?', [self::TEMP_DELETED_STATUS]);
                })
                ->groupBy('status_projeto')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de projetos por status obtido com sucesso',
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