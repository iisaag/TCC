{{--
    Modelo único dos e-mails do AivyPM. Feito com tabelas e estilos inline
    porque Gmail e Outlook ignoram CSS moderno e SVG.

    Variáveis: $preheader, $icone, $rotulo, $titulo, $texto,
    $botaoTexto?, $botaoUrl?, $observacao?, $caixaTitulo?, $caixaTexto?
--}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>{{ $titulo }}</title>
</head>
<body style="margin:0; padding:0; background-color:#eef2fb; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">{{ $preheader }}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2fb;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 12px 40px rgba(30,64,175,0.10);">
                    {{-- Faixa colorida do topo --}}
                    <tr>
                        <td style="height:6px; line-height:6px; font-size:0; background-color:#1d4ed8; background-image:linear-gradient(90deg,#1d4ed8,#06b6d4);">&nbsp;</td>
                    </tr>

                    {{-- Cabeçalho: logo + selo --}}
                    <tr>
                        <td style="padding:32px 44px 24px 44px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td valign="middle" width="56" style="width:56px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" valign="middle" width="44" height="44" style="width:44px; height:44px; background-color:#1d5cff; border-radius:12px; color:#ffffff; font-size:18px; font-weight:700;">A</td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td valign="middle">
                                        <div style="font-size:18px; font-weight:700; color:#0b1a36;">AivyPM</div>
                                        <div style="font-size:12px; color:#8a94a6; margin-top:2px;">Gestão simples, resultados melhores</div>
                                    </td>
                                    <td valign="middle" align="right">
                                        <span style="display:inline-block; padding:6px 12px; background-color:#eaf1ff; border-radius:999px; font-size:12px; font-weight:600; color:#1d4ed8; white-space:nowrap;">&#9679; Conta segura</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:0 44px;">
                            <div style="height:1px; line-height:1px; font-size:0; background-color:#edf0f5;">&nbsp;</div>
                        </td>
                    </tr>

                    {{-- Conteúdo --}}
                    <tr>
                        <td align="center" style="padding:32px 44px 8px 44px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" valign="middle" width="64" height="64" style="width:64px; height:64px; background-color:#eaf1ff; border-radius:16px; font-size:28px; line-height:64px;">{{ $icone }}</td>
                                </tr>
                            </table>

                            <p style="margin:24px 0 0 0; font-size:14px; font-weight:600; color:#1d5cff;">{{ $rotulo }}</p>
                            <h1 style="margin:12px 0 0 0; font-size:28px; line-height:1.25; font-weight:800; color:#0b1a36;">{{ $titulo }}</h1>
                            <p style="margin:16px 0 0 0; font-size:15px; line-height:1.6; color:#5b6678;">{{ $texto }}</p>

                            @if (!empty($botaoUrl))
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0 auto;">
                                    <tr>
                                        <td align="center" style="background-color:#1d5cff; border-radius:12px; box-shadow:0 8px 20px rgba(29,92,255,0.30);">
                                            <a href="{{ $botaoUrl }}" target="_blank" style="display:inline-block; padding:15px 30px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none;">{{ $botaoTexto }} &nbsp;&#8250;</a>
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            @if (!empty($observacao))
                                <p style="margin:14px 0 0 0; font-size:12px; color:#8a94a6;">{{ $observacao }}</p>
                            @endif
                        </td>
                    </tr>

                    @if (!empty($caixaTexto))
                        <tr>
                            <td style="padding:28px 44px 36px 44px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f7ff; border:1px solid #dbe6fb; border-radius:14px;">
                                    <tr>
                                        <td valign="top" width="34" style="width:34px; padding:17px 0 18px 18px; font-size:16px; color:#1d5cff;">&#9432;</td>
                                        <td valign="top" style="padding:18px 18px 18px 6px; font-size:14px; line-height:1.55; color:#3d4b66;">
                                            @if (!empty($caixaTitulo))
                                                <strong style="color:#0b1a36;">{{ $caixaTitulo }}</strong>
                                            @endif
                                            {{ $caixaTexto }}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    @else
                        <tr><td style="height:28px; line-height:28px; font-size:0;">&nbsp;</td></tr>
                    @endif

                    {{-- Rodapé --}}
                    <tr>
                        <td align="center" style="padding:20px 44px; background-color:#f8fafd; border-top:1px solid #edf0f5; font-size:12px; line-height:1.7; color:#8a94a6;">
                            Esta é uma mensagem automática enviada pela AivyPM.<br>
                            Por favor, não responda este e-mail.
                        </td>
                    </tr>
                </table>

                @if (!empty($botaoUrl))
                    <p style="max-width:560px; margin:20px auto 0 auto; font-size:11px; line-height:1.6; color:#8a94a6; text-align:center; word-break:break-all;">
                        Se o botão não funcionar, copie e cole este endereço no navegador:<br>
                        <a href="{{ $botaoUrl }}" style="color:#1d5cff;">{{ $botaoUrl }}</a>
                    </p>
                @endif
            </td>
        </tr>
    </table>
</body>
</html>
