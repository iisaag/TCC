<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSessionAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('auth.user')) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nao autenticado.',
                ], 401);
            }

            return redirect()->route('login');
        }

        return $next($request);
    }
}