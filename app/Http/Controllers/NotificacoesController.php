<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NotificacoesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 20);
        $limit = max(1, min($limit, 100));

        $sources = [];

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

        $notifications = DB::query()
            ->fromSub($unionQuery, 'n')
            ->orderByDesc('occurred_at')
            ->limit($limit)
            ->get();

        $since = $request->query('since');
        $sinceDate = null;

        if (is_string($since) && trim($since) !== '') {
            try {
                $sinceDate = Carbon::parse($since);
            } catch (\Throwable) {
                $sinceDate = null;
            }
        }

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

        $unreadCount = $items->where('read', false)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $items,
                'unread_count' => $unreadCount,
            ],
        ]);
    }
}
