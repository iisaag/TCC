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

        Mail::raw(
            "Um novo pedido de acesso ao AivyPM foi enviado pelo e-mail: {$validated['email']}",
            function ($message) use ($adminEmail) {
                $message->to($adminEmail)
                    ->subject('Nova solicitação de acesso - AivyPM');
            }
        );

        return redirect()->route('login')->with('success', 'Solicitação enviada! Em breve o administrador entrará em contato.');
    }
}
