<?php

namespace App\Http\Controllers;

use App\Models\Equipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                'message' => 'Erro ao listar equipes' . $this->detalheErro($e),
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

        // Só marca como "admin por liderança" quem ainda não era administrador.
        DB::table('senha')
            ->where('email', $email)
            ->where('nivel_acesso', '!=', 'adm')
            ->update(['nivel_acesso' => 'adm', 'admin_por_lideranca' => true]);
    }

    /**
     * Quem virou administrador só por liderar volta a ser usuário comum
     * quando não lidera mais nenhuma equipe (nunca o último administrador).
     */
    private function rebaixarExLider(?int $idLider): void
    {
        if ($idLider === null || DB::table('equipes')->where('id_lider', $idLider)->exists()) {
            return;
        }

        $email = DB::table('usuarios')->where('id_usuario', $idLider)->value('email');
        $registro = $email ? DB::table('senha')->where('email', $email)->first() : null;

        if (! $registro || ! $registro->admin_por_lideranca || $registro->nivel_acesso !== 'adm') {
            return;
        }

        if (DB::table('senha')->where('nivel_acesso', 'adm')->count() <= 1) {
            return;
        }

        DB::table('senha')
            ->where('email', $email)
            ->update(['nivel_acesso' => 'usuario', 'admin_por_lideranca' => false]);
    }

    private function regras(): array
    {
        return [
            'nome'       => 'required|string|min:2|max:100',
            'criado_por' => 'required|integer|exists:usuarios,id_usuario',
            'equipe_pai' => 'nullable|integer|exists:equipes,id_equipe',
            'tipo'       => 'nullable|string|in:EMPRESA,SUBEQUIPE',
            'id_lider'   => 'nullable|integer|exists:usuarios,id_usuario',
            'membros'    => 'nullable|array',
            'membros.*'  => 'integer|exists:usuarios,id_usuario',
        ];
    }

    /**
     * Regras da hierarquia: só uma equipe principal (EMPRESA), sem equipe pai,
     * e nenhuma equipe pode ficar abaixo dela mesma (ciclo).
     */
    private function problemaHierarquia(array $dados, ?Equipe $equipe = null): ?string
    {
        $tipo = strtoupper((string) ($dados['tipo'] ?? $equipe?->tipo ?? 'SUBEQUIPE'));
        $equipePai = array_key_exists('equipe_pai', $dados) ? $dados['equipe_pai'] : $equipe?->equipe_pai;

        if ($tipo === 'EMPRESA') {
            if ($equipePai !== null) {
                return 'A equipe principal (empresa) não pode ter equipe pai.';
            }

            $outraEmpresa = Equipe::query()
                ->where('tipo', 'EMPRESA')
                ->when($equipe, fn ($q) => $q->where('id_equipe', '!=', $equipe->id_equipe))
                ->value('nome');

            if ($outraEmpresa !== null) {
                return "Já existe uma equipe principal: {$outraEmpresa}. Cadastre esta como subequipe.";
            }
        }

        if ($equipe && $equipePai !== null) {
            $atual = (int) $equipePai;
            $visitados = [];

            while ($atual > 0 && ! in_array($atual, $visitados, true)) {
                if ($atual === (int) $equipe->id_equipe) {
                    return 'Uma equipe não pode ficar abaixo dela mesma nem de uma das suas subequipes.';
                }

                $visitados[] = $atual;
                $atual = (int) DB::table('equipes')->where('id_equipe', $atual)->value('equipe_pai');
            }
        }

        return null;
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->regras());
        $validated['tipo'] = $validated['tipo'] ?? 'SUBEQUIPE';

        if ($erro = $this->problemaHierarquia($validated)) {
            return response()->json(['success' => false, 'message' => $erro], 422);
        }

        $membros = $validated['membros'] ?? [];
        unset($validated['membros']);

        $equipe = DB::transaction(function () use ($validated, $membros): Equipe {
            $this->promoverLiderAdmin($validated['id_lider'] ?? null);

            $equipe = Equipe::create($validated);

            if (!empty($membros)) {
                DB::table('usuarios')
                    ->whereIn('id_usuario', $membros)
                    ->update(['id_equipe' => $equipe->id_equipe]);
            }

            return $equipe;
        });

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

        $validated = $request->validate($this->regras());

        // Sem tipo informado, mantém o atual (o model não aceita tipo vazio).
        if (empty($validated['tipo'])) {
            unset($validated['tipo']);
        }

        if ($erro = $this->problemaHierarquia($validated, $equipe)) {
            return response()->json(['success' => false, 'message' => $erro], 422);
        }

        $membros = $validated['membros'] ?? [];
        unset($validated['membros']);

        DB::transaction(function () use ($equipe, $validated, $membros): void {
            $liderAnterior = $equipe->id_lider ? (int) $equipe->id_lider : null;

            $this->promoverLiderAdmin($validated['id_lider'] ?? null);

            $equipe->update($validated);

            if ($liderAnterior !== ($equipe->id_lider ? (int) $equipe->id_lider : null)) {
                $this->rebaixarExLider($liderAnterior);
            }

            DB::table('usuarios')
                ->where('id_equipe', $equipe->id_equipe)
                ->whereNotIn('id_usuario', $membros)
                ->update(['id_equipe' => null]);

            if (!empty($membros)) {
                DB::table('usuarios')
                    ->whereIn('id_usuario', $membros)
                    ->update(['id_equipe' => $equipe->id_equipe]);
            }
        });

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

        $subequipes = DB::table('equipes')->where('equipe_pai', $equipe->id_equipe)->pluck('nome');

        if ($subequipes->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Não é possível excluir esta equipe porque ela possui subequipes: '
                    . $subequipes->implode(', ') . '. Exclua ou mova as subequipes antes.',
            ], 422);
        }

        DB::transaction(function () use ($equipe): void {
            $liderAnterior = $equipe->id_lider ? (int) $equipe->id_lider : null;

            DB::table('usuarios')->where('id_equipe', $equipe->id_equipe)->update(['id_equipe' => null]);
            $equipe->delete();

            $this->rebaixarExLider($liderAnterior);
        });

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
                'message' => 'Não foi possível calcular os totais' . $this->detalheErro($e),
            ], 400);
        }
    }
}