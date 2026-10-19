<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests;
    use ValidatesRequests;

    /**
     * Registra o erro no log e devolve o complemento da mensagem para o usuário:
     * o detalhe técnico só aparece com APP_DEBUG ligado, para não expor SQL e tabelas em produção.
     */
    protected function detalheErro(\Throwable $e): string
    {
        report($e);

        return config('app.debug') ? ': ' . $e->getMessage() : '.';
    }
}
