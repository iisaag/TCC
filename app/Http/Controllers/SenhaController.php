<?php

namespace App\Http\Controllers;

use App\Models\Senha;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SenhaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Senha::with('usuario');

            if ($request->filled('nivel_acesso')) {
                $query->where('nivel_acesso', strtolower($request->nivel_acesso));
            }

            return response()->json([
                'success' => true,
                'message' => 'Registros listados com sucesso',
                'data'    => ['senhas' => $query->get()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar registros: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(string $email): JsonResponse
    {
        $registro = Senha::with('usuario')->find($email);

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Registro não encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Registro encontrado com sucesso',
            'data'    => ['senha' => $registro],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'        => 'required|email|unique:senhas,email',
            'senha'        => 'required|string|min:6',
            'nivel_acesso' => 'required|string',
        ]);

        $registro = Senha::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Senha cadastrada com sucesso',
            'data'    => ['email' => $registro->email],
        ], 201);
    }

    public function editSenha(Request $request, string $email): JsonResponse
    {
        $registro = Senha::find($email);

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Registro não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'senha' => 'required|string|min:6',
        ]);

        $registro->update(['senha' => $validated['senha']]);

        return response()->json([
            'success' => true,
            'message' => 'Senha atualizada com sucesso',
        ]);
    }

    public function editNivelAcesso(Request $request, string $email): JsonResponse
    {
        $registro = Senha::find($email);

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Registro não encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'nivel_acesso' => 'required|string',
        ]);

        $registro->update(['nivel_acesso' => $validated['nivel_acesso']]);

        return response()->json([
            'success' => true,
            'message' => 'Nível de acesso atualizado com sucesso',
        ]);
    }

    public function verificarSenha(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'senha' => 'required|string',
        ]);

        $registro = Senha::with('usuario')->find($validated['email']);

        if (!$registro || !Hash::check($validated['senha'], $registro->senha)) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciais inválidas',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'message' => 'Autenticação realizada com sucesso',
            'data'    => ['senha' => $registro],
        ]);
    }

    public function destroy(string $email): JsonResponse
    {
        $registro = Senha::find($email);

        if (!$registro) {
            return response()->json([
                'success' => false,
                'message' => 'Registro não encontrado',
            ], 404);
        }

        $registro->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro excluído com sucesso',
        ]);
    }
}