<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Models\Senha;
use App\Models\UserPresence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Session;
use Carbon\Carbon;
use Inertia\Inertia;

class SenhaController extends Controller
{
    private function senhaConfere(string $senhaDigitada, string $senhaArmazenada): bool
    {
        if ($this->senhaPareceHash($senhaArmazenada)) {
            return Hash::check($senhaDigitada, $senhaArmazenada);
        }

        return hash_equals($senhaArmazenada, $senhaDigitada);
    }

    private function senhaPareceHash(string $senha): bool
    {
        return preg_match('/^\$(2y|2a|2b|argon2i|argon2id)\$/', $senha) === 1;
    }

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
            'email'        => 'required|email|unique:senha,email',
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

        if (!$registro || !$this->senhaConfere($validated['senha'], $registro->senha)) {
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

    public function authenticate(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'senha' => 'required|string',
        ]);

        $registro = Senha::with('usuario')->find($validated['email']);

        if (!$registro || !$this->senhaConfere($validated['senha'], $registro->senha) || !$registro->usuario) {
            return back()->withErrors([
                'email' => 'Credenciais inválidas',
            ]);
        }

        $usuario = $registro->usuario;
        $nivelAcesso = strtolower((string) $registro->nivel_acesso);
        $temPermissaoTotal = in_array($nivelAcesso, ['total', 'admin', 'administrador', 'geral'], true);
        $cargoTexto = $usuario->getRawOriginal('cargo');

        $request->session()->regenerate();
        $request->session()->put('auth.user', [
            'id' => $usuario->id_usuario,
            'name' => $usuario->nome,
            'role' => is_string($cargoTexto) && $cargoTexto !== '' ? $cargoTexto : $nivelAcesso,
            'avatar' => $usuario->foto_perfil ?: null,
            'permissions' => [
                'total' => $temPermissaoTotal,
            ],
            'nivel_acesso' => $registro->nivel_acesso,
        ]);

        UserPresence::updateOrCreate(
            ['session_id' => $request->session()->getId()],
            [
                'user_id' => (int) $usuario->id_usuario,
                'last_seen' => Carbon::now(),
            ]
        );

        return redirect()->route('dashboard');
    }

    public function logout(Request $request)
    {
        UserPresence::query()->where('session_id', $request->session()->getId())->delete();

        $request->session()->forget('auth.user');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
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