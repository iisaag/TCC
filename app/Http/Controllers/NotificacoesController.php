<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificacoesController extends Controller
{
    private function authUserId(Request $request): ?int
    {
        $authUser = $request->session()->get('auth.user');

        if (!is_array($authUser) || !isset($authUser['id'])) {
            return null;
        }

        $id = (int) $authUser['id'];

        return $id > 0 ? $id : null;
    }

    public function index(Request $request): JsonResponse
    {
        $authUserId = $this->authUserId($request);
        $page = (int) $request->query('page', 1);
        $page = max(1, $page);

        $limit = (int) $request->query('limit', 20);
        $limit = max(1, min($limit, 100));

        $sources = [];

        if ($authUserId !== null && Schema::hasTable('notificacoes_usuario')) {
            $sources[] = DB::table('notificacoes_usuario as nu')
                ->selectRaw("CONCAT('usuario:', nu.id_notificacao) as id")
                ->selectRaw("'sistema' as source")
                ->selectRaw('COALESCE(nu.titulo, "Notificacao") as title')
                ->selectRaw('COALESCE(nu.mensagem, "Sem detalhes") as description')
                ->selectRaw('nu.criado_em as occurred_at')
                ->where('nu.id_destinatario', $authUserId)
                ->whereNotNull('nu.criado_em');
        }

        if (Schema::hasTable('log_sistema')) {
            $sources[] = DB::table('log_sistema')
                ->selectRaw("CONCAT('sistema:', id_log_sistema) as id")
                ->selectRaw("'sistema' as source")
                ->selectRaw('COALESCE(acao, "Atualizacao do sistema") as title')
                ->selectRaw('COALESCE(descricao, "Sem detalhes") as description')
                ->selectRaw('data_hora as occurred_at')
                ->whereNotNull('data_hora');
        }

        if (Schema::hasTable('log_projeto') && Schema::hasTable('projetos')) {
            $sources[] = DB::table('log_projeto as lp')
                ->leftJoin('projetos as p', 'p.id_projeto', '=', 'lp.id_projeto')
                ->selectRaw("CONCAT('projeto:', lp.id_log_projeto) as id")
                ->selectRaw("'projeto' as source")
                ->selectRaw('COALESCE(p.nome_projeto, "Projeto") as title')
                ->selectRaw('COALESCE(lp.mensagem, "Atualizacao de projeto") as description')
                ->selectRaw('lp.data_hora as occurred_at')
                ->whereNotNull('lp.data_hora');
        }

        if (empty($sources)) {
            return response()->json([
                'success' => true,
                'data' => [
                    'notifications' => [],
                    'unread_count' => 0,
                ],
            ]);
        }

        $unionQuery = array_shift($sources);

        foreach ($sources as $source) {
            $unionQuery = $unionQuery->unionAll($source);
        }

        $baseQuery = DB::query()->fromSub($unionQuery, 'n');

        $since = $request->query('since');
        $sinceDate = null;

        if (is_string($since) && trim($since) !== '') {
            try {
                $sinceDate = Carbon::parse($since);
            } catch (\Throwable) {
                $sinceDate = null;
            }
        }

        $totalCount = (clone $baseQuery)->count();
        $totalPages = max(1, (int) ceil($totalCount / $limit));
        $page = min($page, $totalPages);
        $offset = ($page - 1) * $limit;

        $notifications = (clone $baseQuery)
            ->orderByDesc('occurred_at')
            ->offset($offset)
            ->limit($limit)
            ->get();

        $items = $notifications->map(static function ($item) use ($sinceDate): array {
            $occurredAt = $item->occurred_at ? Carbon::parse($item->occurred_at) : null;

            return [
                'id' => (string) $item->id,
                'source' => (string) $item->source,
                'title' => (string) $item->title,
                'description' => (string) $item->description,
                'occurred_at' => $occurredAt?->toIso8601String(),
                'read' => $sinceDate && $occurredAt ? $occurredAt->lessThanOrEqualTo($sinceDate) : false,
            ];
        })->values();

        $unreadCount = $sinceDate
            ? (clone $baseQuery)->where('occurred_at', '>', $sinceDate->toDateTimeString())->count()
            : $totalCount;

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $items,
                'unread_count' => $unreadCount,
                'page' => $page,
                'limit' => $limit,
                'total_count' => $totalCount,
                'total_pages' => $totalPages,
            ],
        ]);
    }
}
