<?php

namespace App\Http\Controllers;

use App\Models\Equipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipesController extends Controller
{
    private function equipeData(Equipe $equipe): array
    {
        $equipe->loadMissing(['lider', 'criador']);

        $membros = \DB::table('usuarios')
            ->where('id_equipe', $equipe->id_equipe)
            ->pluck('id_usuario')
            ->toArray();

        return [
            'id_equipe'    => $equipe->id_equipe,
            'nome'         => $equipe->nome,
            'tipo'         => $equipe->tipo,
            'criado_por'   => $equipe->criado_por,
            'criador_nome' => $equipe->criador?->nome ?? null,
            'equipe_pai'   => $equipe->equipe_pai,
            'id_lider'     => $equipe->id_lider,
            'lider_nome'   => $equipe->lider?->nome ?? null,
            'data_criacao' => $equipe->data_criacao,
            'membros'      => $membros,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Equipe::with(['lider', 'criador']);

            if ($request->filled('nome')) {
                $query->whereRaw('LOWER(nome) LIKE LOWER(?)', ["%{$request->nome}%"]);
            } elseif ($request->filled('tipo')) {
                $query->where('tipo', strtoupper($request->tipo));
            } elseif ($request->filled('criado_por')) {
                $query->where('criado_por', (int) $request->criado_por);
            } elseif ($request->filled('equipe_pai')) {
                $query->where('equipe_pai', (int) $request->equipe_pai);
            } elseif ($request->has('principais')) {
                $query->whereNull('equipe_pai');
            }

            return response()->json([
                'success' => true,
                'message' => 'Equipes listadas com sucesso',
                'data'    => ['equipes' => $query->get()->map(fn($e) => $this->equipeData($e))->values()],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar equipes: ' . $e->getMessage(),
            ], 400);
        }
    }

    public function show(int $id): JsonResponse
    {
        $equipe = Equipe::with(['lider', 'criador'])->find($id);

        if (!$equipe) {
            return response()->json([
                'success' => false,
                'message' => 'Equipe não encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Equipe encontrada com sucesso',
            'data'    => ['equipe' => $this->equipeData($equipe)],
        ]);
    }

    private function promoverLiderAdmin(?int $idLider): void
    {
        if ($idLider === null) return;

        $email = \DB::table('usuarios')
            ->where('id_usuario', $idLider)
            ->value('email');

        if (!$email) return;

        \DB::table('senha')
            ->where('email', $email)
            ->update(['nivel_acesso' => 'adm']);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome'       => 'required|string|min:2|max:100',
            'criado_por' => 'required|integer|exists:usuarios,id_usuario',
            'equipe_pai' => 'nullable|integer|exists:equipes,id_equipe',
            'tipo'       => 'nullable|string|in:EMPRESA,SUBEQUIPE',
            'id_lider'   => 'nullable|integer|exists:usuarios,id_usuario',
            'membros'    => 'nullable|array',
            'membros.*'  => 'integer|exists:usuarios,id_usuario',
        ]);

        $this->promoverLiderAdmin($validated['id_lider'] ?? null);

        $validated['tipo'] = $validated['tipo'] ?? 'SUBEQUIPE';

        $membros = $validated['membros'] ?? [];
        unset($validated['membros']);

        $equipe = Equipe::create($validated);

        if (!empty($membros)) {
            \DB::table('usuarios')
                ->whereIn('id_usuario', $membros)
                ->update(['id_equipe' => $equipe->id_equipe]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Equipe cadastrada com sucesso',
            'data'    => ['equipe' => $this->equipeData($equipe->fresh())],
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $equipe = Equipe::find($id);

        if (!$equipe) {
            return response()->json([
                'success' => false,
                'message' => 'Equipe não encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'nome'       => 'required|string|min:2|max:100',
            'criado_por' => 'required|integer|exists:usuarios,id_usuario',
            'equipe_pai' => 'nullable|integer|exists:equipes,id_equipe',
            'tipo'       => 'nullable|string|in:EMPRESA,SUBEQUIPE',
            'id_lider'   => 'nullable|integer|exists:usuarios,id_usuario',
            'membros'    => 'nullable|array',
            'membros.*'  => 'integer|exists:usuarios,id_usuario',
        ]);

        $this->promoverLiderAdmin($validated['id_lider'] ?? null);

        $membros = $validated['membros'] ?? [];
        unset($validated['membros']);

        $equipe->update($validated);

        \DB::table('usuarios')
            ->where('id_equipe', $equipe->id_equipe)
            ->whereNotIn('id_usuario', $membros)
            ->update(['id_equipe' => null]);

        if (!empty($membros)) {
            \DB::table('usuarios')
                ->whereIn('id_usuario', $membros)
                ->update(['id_equipe' => $equipe->id_equipe]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Equipe atualizada com sucesso',
            'data'    => ['equipe' => $this->equipeData($equipe->fresh())],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $equipe = Equipe::find($id);

        if (!$equipe) {
            return response()->json([
                'success' => false,
                'message' => 'Equipe não encontrada',
            ], 404);
        }

        $equipe->delete();

        return response()->json([
            'success' => true,
            'message' => 'Equipe excluída com sucesso',
        ]);
    }

    public function totalSubequipes(): JsonResponse
    {
        try {
            $total = Equipe::whereNotNull('equipe_pai')
                ->selectRaw('equipe_pai, COUNT(*) as total')
                ->groupBy('equipe_pai')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Total de subequipes por equipe obtido com sucesso',
                'data'    => $total,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}