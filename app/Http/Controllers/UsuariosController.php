<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuariosController extends Controller
{
    private function cargoTexto(Usuario $usuario): ?string
    {
        $cargo = $usuario->getRawOriginal('cargo');

        return is_string($cargo) && $cargo !== '' ? $cargo : null;
    }

    private function respostaUsuario(Usuario $usuario): array
    {
        $usuario->loadMissing('cargoRelation');

        $cargoRelation = $usuario->cargoRelation;

        return [
            'id_usuario' => $usuario->id_usuario,
            'nome' => $usuario->nome,
            'email' => $usuario->email,
            'foto_perfil' => $usuario->foto_perfil,
            'cargo' => $this->cargoTexto($usuario),
            'cargo_relation' => $cargoRelation ? [
                'id_cargo' => $cargoRelation->id_cargo,
                'nome_cargo' => $cargoRelation->nome_cargo,
            ] : null,
            'nivel' => $usuario->nivel,
            'data_criacao' => $usuario->data_criacao,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
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
                'data'    => ['usuarios' => $query->get()->map(fn (Usuario $usuario) => $this->respostaUsuario($usuario))->values()],
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
            'data'    => ['usuario' => $this->respostaUsuario($usuario)],
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
        ]);

        $usuario = Usuario::create($validated);
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
        ]);

        $usuario->update($validated);
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

        $usuario->delete();

        return response()->json([
            'success' => true,
            'message' => 'Usuário excluído com sucesso',
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