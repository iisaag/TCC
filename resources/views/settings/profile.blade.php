<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurações</title>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-linear-to-br from-[#f8f4ff] via-[#f7f8fc] to-[#edf2ff] px-6 py-10 text-slate-900">
    <main class="mx-auto w-full max-w-4xl rounded-4xl border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div class="mb-6 flex items-center justify-between gap-4">
            <div>
                <p class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Perfil</p>
                <h1 class="mt-2 text-3xl font-semibold">Foto de perfil</h1>
                <p class="mt-2 text-sm text-slate-600">Atualize sua imagem direto no banco de dados.</p>
            </div>

            <a href="/dashboard" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Voltar</a>
        </div>

        @if (!empty($success))
            <div class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {{ $success }}
            </div>
        @endif

        @if ($errors->any())
            <div class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ $errors->first() }}
            </div>
        @endif

        <section class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div class="mb-5 flex items-center gap-4">
                <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600" data-avatar-preview>
                    @if (!empty($user['avatar']))
                        <img src="{{ $user['avatar'] }}" alt="{{ $user['name'] }}" class="h-full w-full object-cover">
                    @else
                        <span>{{ collect(explode(' ', $user['name']))->take(2)->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))->implode('') }}</span>
                    @endif
                </div>

                <div>
                    <p class="text-lg font-semibold text-slate-900">{{ $user['name'] }}</p>
                    <p class="text-sm text-slate-600">{{ $user['email'] }}</p>
                    <p class="text-xs font-medium text-slate-500">{{ $user['role'] ?? 'Sem cargo' }}</p>
                </div>
            </div>

            <form class="space-y-5" method="POST" action="/settings/foto">
                @csrf

                <div class="space-y-2">
                    <label for="foto_arquivo" class="block text-sm font-medium text-slate-700">Nova foto de perfil</label>
                    <input id="foto_arquivo" type="file" accept="image/*" class="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800">
                    <input type="hidden" name="foto_perfil" id="foto_perfil" value="">
                    <p class="text-xs text-slate-500">Selecione uma imagem JPG, PNG, GIF ou WEBP. Ela será convertida no navegador antes de enviar.</p>
                </div>

                <button type="submit" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Salvar foto
                </button>
            </form>

            <script>
                const fileInput = document.getElementById('foto_arquivo');
                const hiddenInput = document.getElementById('foto_perfil');
                const avatarPreview = document.querySelector('[data-avatar-preview]');

                if (fileInput && hiddenInput) {
                    fileInput.addEventListener('change', () => {
                        const file = fileInput.files && fileInput.files[0];

                        if (!file) {
                            hiddenInput.value = '';
                            return;
                        }

                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') {
                                hiddenInput.value = reader.result;

                                if (avatarPreview) {
                                    avatarPreview.innerHTML = `<img src="${reader.result}" alt="Prévia" class="h-full w-full object-cover">`;
                                }
                            }
                        };

                        reader.readAsDataURL(file);
                    });
                }
            </script>
        </section>
    </main>
</body>
</html>