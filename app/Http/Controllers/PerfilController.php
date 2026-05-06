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
                'telefone' => $usuario->telefone,
                'localizacao' => $usuario->localizacao,
                'perfil_tags' => $usuario->perfil_tags,
                'perfil_sobre' => $usuario->perfil_sobre,
                'role' => $authUser['role'] ?? null,
                'avatar' => $usuario->foto_perfil,
            ],
            'success' => $request->session()->get('success'),
            'error' => $request->session()->get('error'),
        ]);
    }

    public function updateContact(Request $request): RedirectResponse
    {
        $authUser = $request->session()->get('auth.user');

        if (! is_array($authUser) || ! isset($authUser['id'])) {
            return redirect()->route('login');
        }

        $validated = $request->validate([
            'telefone' => ['nullable', 'string', 'max:30'],
            'localizacao' => ['nullable', 'string', 'max:120'],
            'perfil_tags' => ['nullable', 'string', 'max:255'],
            'perfil_sobre' => ['nullable', 'string', 'max:600'],
        ]);

        $usuario = Usuario::find($authUser['id']);

        if (! $usuario) {
            return redirect()->route('login');
        }

        $usuario->telefone = isset($validated['telefone']) && trim($validated['telefone']) !== ''
            ? trim($validated['telefone'])
            : null;

        $usuario->localizacao = isset($validated['localizacao']) && trim($validated['localizacao']) !== ''
            ? trim($validated['localizacao'])
            : null;

        $usuario->perfil_tags = isset($validated['perfil_tags']) && trim($validated['perfil_tags']) !== ''
            ? trim($validated['perfil_tags'])
            : null;

        $usuario->perfil_sobre = isset($validated['perfil_sobre']) && trim($validated['perfil_sobre']) !== ''
            ? trim($validated['perfil_sobre'])
            : null;

        $usuario->save();

        return back()->with('success', 'Informações de contato atualizadas com sucesso.');
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