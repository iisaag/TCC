<?php

namespace App\Http\Controllers;

use App\Models\UserPresence;
use App\Models\Usuario;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    private const ALLOWED_STATUS = ['online', 'ocupado', 'ausente', 'não perturbe'];

    private function authUserId(Request $request): ?int
    {
        $authUser = $request->session()->get('auth.user');

        if (! is_array($authUser) || ! isset($authUser['id'])) {
            return null;
        }

        return (int) $authUser['id'];
    }

    private function onlineUserIds(): array
    {
        $threshold = Carbon::now()->subSeconds(45);

        return UserPresence::query()
            ->where('last_seen', '>=', $threshold)
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public function heartbeat(Request $request): JsonResponse
    {
        $userId = $this->authUserId($request);

        if ($userId === null) {
            return response()->json(['success' => false], 401);
        }

        UserPresence::updateOrCreate(
            ['session_id' => $request->session()->getId()],
            [
                'user_id' => $userId,
                'last_seen' => Carbon::now(),
            ]
        );

        return response()->json(['success' => true]);
    }

    public function users(Request $request): JsonResponse
    {
        $userId = $this->authUserId($request);

        if ($userId === null) {
            return response()->json(['success' => false], 401);
        }

        $onlineIds = $this->onlineUserIds();

        $users = Usuario::orderBy('nome', 'asc')->get()->map(function (Usuario $usuario) use ($onlineIds) {
            $cargoTexto = $usuario->getRawOriginal('cargo');
            $isOnline = in_array((int) $usuario->id_usuario, $onlineIds, true);
            $customStatus = is_string($usuario->status_atual) && in_array($usuario->status_atual, self::ALLOWED_STATUS, true)
                ? $usuario->status_atual
                : 'online';

            return [
                'id' => (int) $usuario->id_usuario,
                'name' => $usuario->nome,
                'role' => is_string($cargoTexto) && $cargoTexto !== '' ? $cargoTexto : 'Sem cargo',
                'avatar' => $usuario->foto_perfil ?: null,
                'status' => $isOnline ? $customStatus : 'offline',
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users,
            ],
        ]);
    }

    public function updateStatus(Request $request): JsonResponse
    {
        $userId = $this->authUserId($request);

        if ($userId === null) {
            return response()->json(['success' => false], 401);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:online,ocupado,ausente,não perturbe'],
        ]);

        $usuario = Usuario::find($userId);

        if (! $usuario) {
            return response()->json(['success' => false], 404);
        }

        $usuario->status_atual = $validated['status'];
        $usuario->save();

        return response()->json([
            'success' => true,
            'data' => [
                'status' => $usuario->status_atual,
            ],
        ]);
    }
}
