<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Models\Senha;
use App\Models\UserPresence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
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

        if (! Schema::hasTable('usuarios') || ! Schema::hasTable('senha')) {
            return back()->withErrors([
                'email' => 'Base de usuários não está disponível no ambiente atual.',
            ]);
        }

        $registro = Senha::with('usuario')->find($validated['email']);
        $usuario = $registro?->usuario ?? Usuario::query()->where('email', $validated['email'])->first();

        if (! $registro || ! $this->senhaConfere($validated['senha'], $registro->senha) || ! $usuario) {
            return back()->withErrors([
                'email' => $registro && $this->senhaConfere($validated['senha'], $registro->senha)
                    ? 'Usuário não encontrado na tabela usuarios.'
                    : 'Credenciais inválidas',
            ]);
        }

        $nivelAcessoOriginal = (string) $registro->nivel_acesso;

        $nivelAcesso = strtolower($nivelAcessoOriginal);
        $temPermissaoTotal = in_array($nivelAcesso, ['adm'], true);
        $cargoTexto = $usuario->getRawOriginal('cargo');

        $request->session()->regenerate();
        $request->session()->put('auth.user', [
            'id' => $usuario->id_usuario,
            'email' => $usuario->email,
            'name' => $usuario->nome,
            'role' => is_string($cargoTexto) && $cargoTexto !== '' ? $cargoTexto : $nivelAcesso,
            'avatar' => $usuario->foto_perfil ?: null,
            'permissions' => [
                'total' => $temPermissaoTotal,
            ],
            'nivel_acesso' => $nivelAcessoOriginal,
        ]);

        if (Schema::hasTable('user_presences')) {
            UserPresence::updateOrCreate(
                ['session_id' => $request->session()->getId()],
                [
                    'user_id' => (int) $usuario->id_usuario,
                    'last_seen' => Carbon::now(),
                ]
            );
        }

        return redirect()->route('home');
    }

    private const RESET_TOKEN_MINUTES = 60;

    /**
     * Envia por e-mail um link de redefinição. A resposta é sempre a mesma,
     * para não revelar quais e-mails têm cadastro.
     */
    public function enviarLinkRedefinicao(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $email = $validated['email'];

        if (Senha::find($email)) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );

            $link = url('/redefinir-senha/' . $token) . '?email=' . urlencode($email);

            Mail::send(
                ['html' => 'emails.aviso', 'text' => 'emails.aviso-texto'],
                [
                    'preheader' => 'Use o link para criar uma nova senha do AivyPM.',
                    'icone' => '🔒',
                    'rotulo' => 'Redefinição de senha',
                    'titulo' => 'Vamos criar uma nova senha?',
                    'texto' => 'Recebemos uma solicitação para redefinir a senha da sua conta AivyPM. Clique no botão abaixo para continuar.',
                    'botaoTexto' => 'Redefinir minha senha',
                    'botaoUrl' => $link,
                    'observacao' => 'Este link é válido por ' . self::RESET_TOKEN_MINUTES . ' minutos.',
                    'caixaTitulo' => 'Não solicitou esta alteração?',
                    'caixaTexto' => 'Ignore este e-mail. Sua senha atual continuará válida e sua conta permanecerá segura.',
                ],
                function ($message) use ($email) {
                    $message->to($email)->subject('Redefinição de senha - AivyPM');
                }
            );
        }

        return redirect()->route('login')->with('success', 'Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.');
    }

    public function formRedefinicao(Request $request, string $token)
    {
        return Inertia::render('login/redefinir-senha', [
            'token' => $token,
            'email' => (string) $request->query('email', ''),
        ]);
    }

    public function redefinir(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'senha' => 'required|string|min:6|confirmed',
        ]);

        $pedido = DB::table('password_reset_tokens')->where('email', $validated['email'])->first();

        $valido = $pedido
            && Hash::check($validated['token'], $pedido->token)
            && Carbon::parse($pedido->created_at)->addMinutes(self::RESET_TOKEN_MINUTES)->isFuture();

        $registro = $valido ? Senha::find($validated['email']) : null;

        if (! $registro) {
            return back()->withErrors([
                'senha' => 'Este link de redefinição é inválido ou expirou. Solicite um novo.',
            ]);
        }

        $registro->senha = $validated['senha'];
        $registro->save();

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return redirect()->route('login')->with('success', 'Senha atualizada com sucesso. Faça login com a nova senha.');
    }

    public function logout(Request $request)
    {
        try {
            if (Schema::hasTable('user_presences')) {
                UserPresence::query()->where('session_id', $request->session()->getId())->delete();
            }
        } catch (\Exception $e) {
            // Ignore presence cleanup errors (missing table or DB access issues in local env)
        }

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

        if (Usuario::query()->where('email', $email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Este acesso pertence a um funcionário ativo. Exclua o funcionário para remover o acesso.',
            ], 422);
        }

        $registro->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro excluído com sucesso',
        ]);
    }
}