<?php

namespace App\Http\Middleware;

use App\Models\UserPresence;
use App\Models\Usuario;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    private const ALLOWED_STATUS = ['online', 'ocupado', 'ausente', 'não perturbe'];

    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $authUser = $request->session()->get('auth.user');
        $authUserId = is_array($authUser) && isset($authUser['id']) ? (int) $authUser['id'] : null;

        if (is_array($authUser) && isset($authUser['id'])) {
            $usuario = Usuario::find($authUser['id']);

            if ($usuario) {
                $cargoTexto = $usuario->getRawOriginal('cargo');

                $authUser['name'] = $usuario->nome;
                $authUser['role'] = is_string($cargoTexto) && $cargoTexto !== '' ? $cargoTexto : ($authUser['role'] ?? null);
                $authUser['avatar'] = $usuario->foto_perfil ?: null;
            }
        }

        if (is_array($authUser) && isset($authUser['role']) && is_object($authUser['role']) && isset($authUser['role']->nome_cargo)) {
            $authUser['role'] = $authUser['role']->nome_cargo;
        }

        UserPresence::query()->where('last_seen', '<', Carbon::now()->subMinutes(10))->delete();

        $onlineIds = UserPresence::query()
            ->where('last_seen', '>=', Carbon::now()->subSeconds(45))
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($authUserId !== null) {
            UserPresence::updateOrCreate(
                ['session_id' => $request->session()->getId()],
                [
                    'user_id' => $authUserId,
                    'last_seen' => Carbon::now(),
                ]
            );

            if (! in_array($authUserId, $onlineIds, true)) {
                $onlineIds[] = $authUserId;
            }
        }

        $projectUsers = Usuario::orderBy('nome', 'asc')->get()->map(function (Usuario $usuario) use ($onlineIds) {
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

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $authUser,
            ],
            'projectUsers' => $projectUsers,
        ]);
    }
}
