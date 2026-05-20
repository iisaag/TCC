<?php

namespace App\Http\Controllers;

use App\Models\Senha;
use App\Models\Usuario;
use App\Models\UserPresence;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class UsuariosController extends Controller
{
    private function normalizarStatusAtual(?string $status): string
    {
        return mb_strtolower(trim((string) $status)) === 'inativo' ? 'Inativo' : 'Ativo';
    }

    private function usuariosTemStatusAtual(): bool
    {
        return Schema::hasTable('usuarios') && Schema::hasColumn('usuarios', 'status_atual');
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
        $usuario->loadMissing('cargoRelation');

        $cargoRelation = $usuario->cargoRelation;

        $ultimoAcesso = Schema::hasTable('user_presences')
            ? UserPresence::where('user_id', $usuario->id_usuario)->max('last_seen')
            : null;

        $response = [
            'id_usuario'    => $usuario->id_usuario,
            'nome'          => $usuario->nome,
            'foto_perfil'   => $usuario->foto_perfil,
            'cargo'         => $this->cargoTexto($usuario),
            'cargo_relation' => $cargoRelation ? [
                'id_cargo'   => $cargoRelation->id_cargo,
                'nome_cargo' => $cargoRelation->nome_cargo,
            ] : null,
            'nivel'         => $usuario->nivel,
            'status_atual'  => $usuario->status_atual,
            'data_criacao'  => $usuario->data_criacao,
            'ultimo_acesso' => $ultimoAcesso,
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
            'status_atual' => 'nullable|string|max:40',
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
                $dadosUsuario['status_atual'] = $validated['status_atual'] ?? 'Ativo';
            }

            $usuario = Usuario::create($dadosUsuario);

            Senha::create([
                'email'        => $validated['email'],
                'senha'        => $validated['senha'],
                'nivel_acesso' => $validated['nivel_acesso'],
            ]);

            return $usuario;
        });

        $usuario->load('cargoRelation');

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

        $usuario->update($updateData);
        $usuario->load('cargoRelation');

        return response()->json([
            'success' => true,
            'message' => 'Usuário atualizado com sucesso',
            'data'    => ['usuario' => $this->respostaUsuario($usuario)],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $usuario = Usuario::find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado',
            ], 404);
        }

        try {
            DB::transaction(function () use ($usuario): void {
                $userId = (int) $usuario->id_usuario;
                $userEmail = (string) $usuario->email;

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

                $usuario->delete();
            });
        } catch (QueryException $exception) {
            return response()->json([
                'success' => false,
                'message' => 'Não foi possível excluir este funcionário porque ainda existem vínculos obrigatórios (projetos, tarefas, equipes ou registros históricos). Reatribua os vínculos e tente novamente.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuário excluído com sucesso',
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
            'status_atual' => 'required|string|in:Ativo,Inativo',
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