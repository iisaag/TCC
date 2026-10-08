<?php

namespace App\Http\Controllers;

use App\Models\Senha;
use App\Models\Usuario;
use App\Models\UserPresence;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class UsuariosController extends Controller
{
    private const DELETION_RETENTION_DAYS = 7;
    private const ALLOWED_MANUAL_STATUS = ['online', 'ausente', 'ocupado', 'não perturbe', 'offline'];

    private function normalizarStatusAtual(?string $status): string
    {
        $normalized = mb_strtolower(trim((string) $status));

        if (in_array($normalized, self::ALLOWED_MANUAL_STATUS, true)) {
            return $normalized;
        }

        if ($normalized === 'ativo') {
            return 'online';
        }

        if ($normalized === 'inativo') {
            return 'offline';
        }

        return 'offline';
    }

    private function usuariosTemStatusAtual(): bool
    {
        return Schema::hasTable('usuarios') && Schema::hasColumn('usuarios', 'status_atual');
    }

    private function usuariosTemEquipe(): bool
    {
        return Schema::hasTable('usuarios') && Schema::hasColumn('usuarios', 'id_equipe');
    }

    private function ensureDeletedUsersTable(): void
    {
        if (Schema::hasTable('usuarios_excluidos')) {
            return;
        }

        Schema::create('usuarios_excluidos', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('id_usuario_original')->nullable();
            $table->string('nome', 100);
            $table->string('email', 150);
            $table->string('telefone', 30)->nullable();
            $table->string('localizacao', 120)->nullable();
            $table->longText('foto_perfil')->nullable();
            $table->string('cargo', 100)->nullable();
            $table->string('nivel', 50)->nullable();
            $table->string('status_atual', 40)->nullable();
            $table->string('nivel_acesso', 50)->default('usuario');
            $table->string('senha_hash', 255)->nullable();
            $table->unsignedInteger('projetos_afetados')->default(0);
            $table->unsignedInteger('equipes_afetadas')->default(0);
            $table->dateTime('excluido_em');
            $table->dateTime('expira_em')->index();
        });
    }

    private function isAdmin(Request $request): bool
    {
        if (! $request->hasSession()) {
            return false;
        }

        return (bool) data_get($request->session()->get('auth.user'), 'permissions.total', false);
    }

    private function cargoTexto(Usuario $usuario): ?string
    {
        $cargo = $usuario->getRawOriginal('cargo');

        return is_string($cargo) && $cargo !== '' ? $cargo : null;
    }

    private function respostaUsuario(Usuario $usuario, bool $includeSensitiveData = true): array
    {
        $usuario->loadMissing(['cargoRelation', 'equipeRelation']);

        $cargoRelation = $usuario->cargoRelation;
        $equipeRelation = $usuario->equipeRelation;
        $presenceThreshold = now()->subSeconds(45);

        $ultimoAcessoRaw = Schema::hasTable('user_presences')
            ? UserPresence::where('user_id', $usuario->id_usuario)->max('last_seen')
            : null;
        $ultimoAcesso = $ultimoAcessoRaw ? Carbon::parse((string) $ultimoAcessoRaw)->toIso8601String() : null;
        $onlineAgora = Schema::hasTable('user_presences')
            ? UserPresence::where('user_id', $usuario->id_usuario)->where('last_seen', '>=', $presenceThreshold)->exists()
            : false;

        $response = [
            'id_usuario'    => $usuario->id_usuario,
            'nome'          => $usuario->nome,
            'foto_perfil'   => $usuario->foto_perfil,
            'cargo'         => $this->cargoTexto($usuario),
            'cargo_relation' => $cargoRelation ? [
                'id_cargo'   => $cargoRelation->id_cargo,
                'nome_cargo' => $cargoRelation->nome_cargo,
            ] : null,
            'id_equipe'     => $usuario->id_equipe,
            'equipe_relation' => $equipeRelation ? [
                'id_equipe' => $equipeRelation->id_equipe,
                'nome'      => $equipeRelation->nome,
                'tipo'      => $equipeRelation->tipo,
                'id_lider'  => $equipeRelation->id_lider,
            ] : null,
            'nivel'         => $usuario->nivel,
            'status_atual'  => $usuario->status_atual,
            'data_criacao'  => $usuario->data_criacao,
            'ultimo_acesso' => $ultimoAcesso,
            'online_agora'  => $onlineAgora,
        ];

        if ($includeSensitiveData) {
            $response['email'] = $usuario->email;
            $response['telefone'] = $usuario->telefone ?? null;
            $response['localizacao'] = $usuario->localizacao ?? null;
        }

        return $response;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $isAdmin = $this->isAdmin($request);
            $query = Usuario::with('cargoRelation')->orderBy('nome', 'asc');

            if ($request->filled('nome')) {
                $query->whereRaw('LOWER(nome) LIKE LOWER(?)', ["%{$request->nome}%"]);
            } elseif ($request->filled('cargo')) {
                $query->where('cargo', $request->cargo);
            } elseif ($request->filled('nivel')) {
                $query->where('nivel', $request->nivel);
            }

            return response()->json([
                'success' => true,
                'message' => 'Usuários listados com sucesso',
                'data'    => ['usuarios' => $query->get()->map(fn (Usuario $usuario) => $this->respostaUsuario($usuario, $isAdmin))->values()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar usuários: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $isAdmin = $this->isAdmin(request());
        $usuario = Usuario::with('cargoRelation')->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuário encontrado com sucesso',
            'data'    => ['usuario' => $this->respostaUsuario($usuario, $isAdmin)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome'        => 'required|string|min:2|max:255',
            'email'       => 'required|email|unique:usuarios,email',
            'foto_perfil' => [
                'nullable',
                'string',
                'starts_with:data:image/',
                'regex:/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=\r\n]+$/',
            ],
            'cargo'       => 'nullable|string|exists:cargos,nome_cargo',
            'nivel'       => 'nullable|string',
            'status_atual' => 'nullable|string|in:online,ausente,ocupado,offline,não perturbe,Ativo,Inativo',
            'id_equipe'   => 'nullable|integer|exists:equipes,id_equipe',
            'telefone'    => 'nullable|string|max:30',
            'localizacao' => 'nullable|string|max:120',
            'senha'       => 'required|string|min:6',
            'nivel_acesso' => 'required|string',
        ]);

        $usuario = DB::transaction(function () use ($validated): Usuario {
            $dadosUsuario = [
                'nome'         => $validated['nome'],
                'email'        => $validated['email'],
                'foto_perfil'   => $validated['foto_perfil'] ?? null,
                'cargo'        => $validated['cargo'] ?? null,
                'nivel'        => $validated['nivel'] ?? null,
                'telefone'     => $validated['telefone'] ?? null,
                'localizacao'  => $validated['localizacao'] ?? null,
            ];

            if ($this->usuariosTemStatusAtual()) {
                $dadosUsuario['status_atual'] = $this->normalizarStatusAtual($validated['status_atual'] ?? null);
            }

            if ($this->usuariosTemEquipe()) {
                $dadosUsuario['id_equipe'] = $validated['id_equipe'] ?? null;
            }

            $usuario = Usuario::create($dadosUsuario);

            Senha::create([
                'email'        => $validated['email'],
                'senha'        => $validated['senha'],
                'nivel_acesso' => $validated['nivel_acesso'],
            ]);

            return $usuario;
        });

        $usuario->load(['cargoRelation', 'equipeRelation']);

        return response()->json([
            'success' => true,
            'message' => 'Usuário cadastrado com sucesso',
            'data'    => ['usuario' => $this->respostaUsuario($usuario)],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $usuario = Usuario::find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'nome'        => 'required|string|min:2|max:255',
            'email'       => 'required|email|unique:usuarios,email,' . $id . ',id_usuario',
            'foto_perfil' => [
                'nullable',
                'string',
                'starts_with:data:image/',
                'regex:/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=\r\n]+$/',
            ],
            'cargo'       => 'nullable|string|exists:cargos,nome_cargo',
            'nivel'       => 'nullable|string',
            'status_atual' => 'nullable|string|in:online,ausente,ocupado,offline,não perturbe,Ativo,Inativo',
            'id_equipe'   => 'nullable|integer|exists:equipes,id_equipe',
            'telefone'    => 'nullable|string|max:30',
            'localizacao' => 'nullable|string|max:120',
        ]);

        // Only update allowed fields explicitly to avoid unexpected mass-assignment
        $updateData = [
            'nome' => $validated['nome'],
            'email' => $validated['email'],
            'foto_perfil' => $validated['foto_perfil'] ?? null,
            'cargo' => $validated['cargo'] ?? null,
            'nivel' => $validated['nivel'] ?? null,
            'telefone' => $validated['telefone'] ?? null,
            'localizacao' => $validated['localizacao'] ?? null,
        ];

        if ($this->usuariosTemEquipe()) {
            $updateData['id_equipe'] = $validated['id_equipe'] ?? null;
        }

        if ($this->usuariosTemStatusAtual()) {
            $updateData['status_atual'] = $this->normalizarStatusAtual($validated['status_atual'] ?? null);
        }

        $usuario->update($updateData);
        $usuario->load(['cargoRelation', 'equipeRelation']);

        return response()->json([
            'success' => true,
            'message' => 'Usuário atualizado com sucesso',
            'data'    => ['usuario' => $this->respostaUsuario($usuario)],
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $usuario = Usuario::find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado',
            ], 404);
        }

        $bloqueio = $this->deletionBlocker($request, $usuario);

        if ($bloqueio !== null) {
            return response()->json([
                'success' => false,
                'message' => $bloqueio,
            ], 422);
        }

        try {
            $this->ensureDeletedUsersTable();

            DB::transaction(function () use ($usuario): void {
                $userId = (int) $usuario->id_usuario;
                $userEmail = (string) $usuario->email;
                $senha = Schema::hasTable('senha')
                    ? Senha::query()->where('email', $userEmail)->first()
                    : null;

                $projetosAfetados = Schema::hasTable('projetos') && Schema::hasColumn('projetos', 'id_responsavel')
                    ? (int) DB::table('projetos')->where('id_responsavel', $userId)->count()
                    : 0;
                $equipesAfetadas = Schema::hasTable('equipes') && Schema::hasColumn('equipes', 'criado_por')
                    ? (int) DB::table('equipes')->where('criado_por', $userId)->count()
                    : 0;

                DB::table('usuarios_excluidos')->insert([
                    'id_usuario_original' => $userId,
                    'nome' => $usuario->nome,
                    'email' => $userEmail,
                    'telefone' => $usuario->telefone,
                    'localizacao' => $usuario->localizacao,
                    'foto_perfil' => $usuario->getRawOriginal('foto_perfil'),
                    'cargo' => $usuario->getRawOriginal('cargo'),
                    'nivel' => $usuario->nivel,
                    'status_atual' => $usuario->status_atual,
                    'nivel_acesso' => $senha?->nivel_acesso ?? 'usuario',
                    'senha_hash' => $senha?->getRawOriginal('senha'),
                    'projetos_afetados' => $projetosAfetados,
                    'equipes_afetadas' => $equipesAfetadas,
                    'excluido_em' => now(),
                    'expira_em' => now()->addDays(self::DELETION_RETENTION_DAYS),
                ]);

                if (Schema::hasTable('senha')) {
                    Senha::where('email', $userEmail)->delete();
                }

                if (Schema::hasTable('projetos') && Schema::hasColumn('projetos', 'id_responsavel')) {
                    DB::table('projetos')->where('id_responsavel', $userId)->update(['id_responsavel' => null]);
                }

                if (Schema::hasTable('tarefas') && Schema::hasColumn('tarefas', 'id_responsavel')) {
                    DB::table('tarefas')->where('id_responsavel', $userId)->update(['id_responsavel' => null]);
                }

                if (Schema::hasTable('historico_progresso') && Schema::hasColumn('historico_progresso', 'id_usuario')) {
                    DB::table('historico_progresso')->where('id_usuario', $userId)->delete();
                }

                if (Schema::hasTable('log_projeto') && Schema::hasColumn('log_projeto', 'id_usuario')) {
                    DB::table('log_projeto')->where('id_usuario', $userId)->delete();
                }

                if (Schema::hasTable('log_sistema') && Schema::hasColumn('log_sistema', 'id_usuario')) {
                    DB::table('log_sistema')->where('id_usuario', $userId)->delete();
                }

                if (Schema::hasTable('user_presences') && Schema::hasColumn('user_presences', 'user_id')) {
                    UserPresence::where('user_id', $userId)->delete();
                }

                if (Schema::hasTable('equipes') && Schema::hasColumn('equipes', 'criado_por')) {
                    DB::table('equipes')->where('criado_por', $userId)->update(['criado_por' => null]);
                }

                if (Schema::hasTable('notificacoes_usuario')) {
                    DB::table('notificacoes_usuario')->where('id_destinatario', $userId)->delete();
                    DB::table('notificacoes_usuario')->where('id_autor', $userId)->update(['id_autor' => null]);
                }

                $usuario->delete();
            });
        } catch (QueryException $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Não foi possível desativar este funcionário porque ainda existem vínculos obrigatórios (projetos, tarefas, equipes ou registros históricos). Reatribua os vínculos e tente novamente.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuário desativado com sucesso',
        ]);
    }

    /**
     * Retorna o motivo que impede a desativação do usuário, ou null se puder desativar.
     */
    private function deletionBlocker(Request $request, Usuario $usuario): ?string
    {
        $userId = (int) $usuario->id_usuario;

        if ((int) data_get($request->session()->get('auth.user'), 'id') === $userId) {
            return 'Você não pode desativar o seu próprio usuário.';
        }

        if (Schema::hasTable('senha')) {
            $ehAdm = Senha::query()->where('email', $usuario->email)->value('nivel_acesso') === 'adm';

            if ($ehAdm && Senha::query()->where('nivel_acesso', 'adm')->count() <= 1) {
                return 'Não é possível desativar o último administrador do sistema.';
            }
        }

        if (Schema::hasTable('projetos')) {
            $projetos = DB::table('projetos')
                ->where('id_responsavel', $userId)
                ->where(fn ($q) => $q->whereNull('status_projeto')->orWhere('status_projeto', '!=', '__EXCLUIDO_TEMP__'))
                ->pluck('nome_projeto');

            if ($projetos->isNotEmpty()) {
                return 'Este funcionário é responsável pelo(s) projeto(s): ' . $projetos->implode(', ')
                    . '. Defina outro responsável antes de desativar.';
            }
        }

        if (Schema::hasTable('equipes') && Schema::hasColumn('equipes', 'id_lider')) {
            $equipes = DB::table('equipes')->where('id_lider', $userId)->pluck('nome');

            if ($equipes->isNotEmpty()) {
                return 'Este funcionário é líder da(s) equipe(s): ' . $equipes->implode(', ')
                    . '. Defina outro líder antes de desativar.';
            }
        }

        return null;
    }

    public function deletedHistory(): JsonResponse
    {
        $this->ensureDeletedUsersTable();

        DB::table('usuarios_excluidos')
            ->where('expira_em', '<=', now())
            ->delete();

        $historico = DB::table('usuarios_excluidos')
            ->orderByDesc('excluido_em')
            ->get()
            ->map(static function ($item): array {
                return [
                    'id' => (int) $item->id,
                    'id_usuario_original' => $item->id_usuario_original,
                    'nome' => $item->nome,
                    'email' => $item->email,
                    'cargo' => $item->cargo,
                    'nivel' => $item->nivel,
                    'status_atual' => $item->status_atual,
                    'nivel_acesso' => $item->nivel_acesso,
                    'projetos_afetados' => (int) $item->projetos_afetados,
                    'equipes_afetadas' => (int) $item->equipes_afetadas,
                    'excluido_em' => $item->excluido_em,
                    'expira_em' => $item->expira_em,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Histórico de usuários desativados carregado com sucesso.',
            'data' => ['usuarios_excluidos' => $historico],
        ]);
    }

    public function restoreDeleted(int $registro): JsonResponse
    {
        $this->ensureDeletedUsersTable();

        $historico = DB::table('usuarios_excluidos')->where('id', $registro)->first();

        if (! $historico) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de desativação não encontrado.',
            ], 404);
        }

        if (Carbon::parse((string) $historico->expira_em)->lte(now())) {
            DB::table('usuarios_excluidos')->where('id', $registro)->delete();

            return response()->json([
                'success' => false,
                'message' => 'Este registro expirou e não pode mais ser restaurado.',
            ], 410);
        }

        if (Usuario::query()->where('email', (string) $historico->email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Já existe um usuário ativo com este e-mail. Remova o conflito para restaurar.',
            ], 422);
        }

        DB::transaction(function () use ($historico, $registro): void {
            $dadosUsuario = [
                'nome' => $historico->nome,
                'email' => $historico->email,
                'telefone' => $historico->telefone,
                'localizacao' => $historico->localizacao,
                'cargo' => $historico->cargo,
                'nivel' => $historico->nivel,
            ];

            if ($this->usuariosTemStatusAtual()) {
                $dadosUsuario['status_atual'] = $this->normalizarStatusAtual($historico->status_atual);
            }

            $usuario = Usuario::create($dadosUsuario);

            if (! empty($historico->foto_perfil)) {
                DB::table('usuarios')
                    ->where('id_usuario', (int) $usuario->id_usuario)
                    ->update(['foto_perfil' => $historico->foto_perfil]);
            }

            Senha::updateOrCreate(
                ['email' => (string) $historico->email],
                [
                    'senha' => $historico->senha_hash ?: 'Temp@123456',
                    'nivel_acesso' => $historico->nivel_acesso ?: 'usuario',
                ]
            );

            if ($historico->id_usuario_original && (int) $historico->id_usuario_original !== (int) $usuario->id_usuario) {
                if (Schema::hasTable('projetos') && Schema::hasColumn('projetos', 'id_responsavel')) {
                    DB::table('projetos')
                        ->where('id_responsavel', (int) $historico->id_usuario_original)
                        ->update(['id_responsavel' => (int) $usuario->id_usuario]);
                }
                if (Schema::hasTable('tarefas') && Schema::hasColumn('tarefas', 'id_responsavel')) {
                    DB::table('tarefas')
                        ->where('id_responsavel', (int) $historico->id_usuario_original)
                        ->update(['id_responsavel' => (int) $usuario->id_usuario]);
                }
            }

            DB::table('usuarios_excluidos')->where('id', $registro)->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Usuário restaurado com sucesso.',
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        if (! $this->usuariosTemStatusAtual()) {
            return response()->json([
                'success' => false,
                'message' => 'A coluna de status não está disponível para atualização.',
            ], 422);
        }

        $usuario = Usuario::find($id);

        if (! $usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'status_atual' => 'required|string|in:online,ausente,ocupado,offline,não perturbe,Ativo,Inativo',
        ]);

        $usuario->update([
            'status_atual' => $this->normalizarStatusAtual($validated['status_atual']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status do usuário atualizado com sucesso.',
            'data' => ['usuario' => $this->respostaUsuario($usuario->fresh())],
        ]);
    }

    public function totalPorCargo(): JsonResponse
    {
        try {
            $total = Usuario::selectRaw('cargo, COUNT(*) as total')
                ->groupBy('cargo')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de usuários por cargo obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function totalPorNivel(): JsonResponse
    {
        try {
            $total = Usuario::selectRaw('nivel, COUNT(*) as total')
                ->groupBy('nivel')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de usuários por nível obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}