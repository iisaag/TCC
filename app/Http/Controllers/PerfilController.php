<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;
use Illuminate\Http\Request;

class PerfilController extends Controller
{
    public function edit(Request $request): View|RedirectResponse
    {
        $authUser = $request->session()->get('auth.user');

        if (! is_array($authUser) || ! isset($authUser['id'])) {
            return redirect()->route('login');
        }

        $usuario = Usuario::find($authUser['id']);

        if (! $usuario) {
            return redirect()->route('login');
        }

        return view('settings.profile', [
            'user' => [
                'id' => $usuario->id_usuario,
                'name' => $usuario->nome,
                'email' => $usuario->email,
                'role' => $authUser['role'] ?? null,
                'avatar' => $usuario->foto_perfil,
            ],
            'success' => $request->session()->get('success'),
            'error' => $request->session()->get('error'),
        ]);
    }

    public function updatePhoto(Request $request): RedirectResponse
    {
        $authUser = $request->session()->get('auth.user');

        if (! is_array($authUser) || ! isset($authUser['id'])) {
            return redirect()->route('login');
        }

        $validated = $request->validate([
            'foto_perfil' => [
                'nullable',
                'string',
                'starts_with:data:image/',
                'regex:/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=\r\n]+$/',
            ],
        ]);

        $usuario = Usuario::find($authUser['id']);

        if (! $usuario) {
            return redirect()->route('login');
        }

        $fotoData = $validated['foto_perfil'] ?? null;

        $usuario->foto_perfil = $fotoData;
        $usuario->save();

        $request->session()->put('auth.user.avatar', $usuario->foto_perfil ?: null);

        return back()->with('success', 'Foto de perfil atualizada com sucesso.');
    }
}