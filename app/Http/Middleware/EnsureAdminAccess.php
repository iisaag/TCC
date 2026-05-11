<?php

namespace App\Http\Middleware;

use App\Models\Senha;
use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAccess
{
    private function hasAdminPermission(Request $request): bool
    {
        $authUser = $request->session()->get('auth.user');
        $email = is_array($authUser) ? ($authUser['email'] ?? null) : null;

        if (! $email && is_array($authUser) && isset($authUser['id'])) {
            $usuario = Usuario::find((int) $authUser['id']);
            $email = $usuario?->email;
        }

        if (! is_string($email) || $email === '') {
            return false;
        }

        $registroSenha = Senha::find($email);

        if (! $registroSenha) {
            return false;
        }

        $nivelAcesso = strtolower((string) $registroSenha->nivel_acesso);
        $hasTotalPermission = in_array($nivelAcesso, ['total', 'admin', 'administrador', 'geral'], true);

        if (is_array($authUser)) {
            $authUser['email'] = $email;
            $authUser['nivel_acesso'] = $registroSenha->nivel_acesso;
            $authUser['permissions'] = [
                'total' => $hasTotalPermission,
            ];
            $request->session()->put('auth.user', $authUser);
        }

        return $hasTotalPermission;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $hasTotalPermission = $this->hasAdminPermission($request);

        if (! $hasTotalPermission) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado.',
                ], 403);
            }

            abort(403);
        }

        return $next($request);
    }
}
