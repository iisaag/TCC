AivyPM - {{ $rotulo }}

{{ $titulo }}

{{ $texto }}
@if (!empty($botaoUrl))

{{ $botaoTexto }}: {{ $botaoUrl }}
@endif
@if (!empty($observacao))
{{ $observacao }}
@endif
@if (!empty($caixaTexto))

{{ $caixaTitulo ?? '' }} {{ $caixaTexto }}
@endif

--
Esta é uma mensagem automática enviada pela AivyPM. Por favor, não responda este e-mail.
