<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class SolicitacaoAcessoController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $adminEmail = config('mail.admin_address');

        Mail::send(
            ['html' => 'emails.aviso', 'text' => 'emails.aviso-texto'],
            [
                'preheader' => "{$validated['email']} pediu acesso ao AivyPM.",
                'icone' => '👤',
                'rotulo' => 'Solicitação de acesso',
                'titulo' => 'Alguém quer entrar no AivyPM',
                'texto' => "O e-mail {$validated['email']} pediu acesso ao sistema. Para liberar, cadastre a pessoa em Gestão → Adicionar funcionário.",
                'botaoTexto' => 'Abrir a Gestão',
                'botaoUrl' => url('/gestao'),
                'caixaTitulo' => 'Não reconhece este pedido?',
                'caixaTexto' => 'Ignore este e-mail. Nenhum acesso é liberado sem que um administrador cadastre a pessoa.',
            ],
            function ($message) use ($adminEmail) {
                $message->to($adminEmail)
                    ->subject('Nova solicitação de acesso - AivyPM');
            }
        );

        return redirect()->route('login')->with('success', 'Solicitação enviada! Em breve o administrador entrará em contato.');
    }
}
