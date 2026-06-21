<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurações</title>
    <script>
        if (localStorage.getItem('theme') === 'dark') {
            document.documentElement.classList.add('dark');
        }
    </script>
    @vite(['resources/css/app.css'])
</head>
<body class="min-h-screen bg-[#e7ebf3] px-4 py-6 text-slate-900 sm:px-6 sm:py-8 dark:bg-[#121b22] dark:text-[#e9f3fa]">
    @php
        $initials = collect(explode(' ', $user['name']))
            ->take(2)
            ->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))
            ->implode('');
        $savedLocation = old('localizacao', $user['localizacao'] ?? '');
        $locationParts = array_values(array_filter(array_map('trim', explode(',', (string) $savedLocation))));
        $locationUf = count($locationParts) > 1 ? array_pop($locationParts) : '';
        $locationAddress = implode(', ', $locationParts);
    @endphp

    <main class="mx-auto w-full max-w-[920px] space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <a href="/dashboard" class="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#d5dbe8] bg-white px-4 text-sm font-semibold text-[#2f6ae8] transition hover:bg-[#eef3ff] dark:border-[#2d4353] dark:bg-[#1c2a35] dark:text-[#9cc4df] dark:hover:bg-[#243845]">
                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                Voltar para o site
            </a>

            <button
                type="button"
                id="theme-toggle"
                class="inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#c9d5e6] bg-[#e7ebf3] text-[#111827] shadow-[0_4px_12px_rgba(23,62,91,0.12)] transition hover:bg-[#dde4ef] dark:border-[#2d4353] dark:bg-[#243845] dark:text-[#e9f3fa] dark:hover:bg-[#2a4254]"
                aria-label="Alternar tema"
            >
                <span id="theme-toggle-icon" aria-hidden="true" class="inline-flex h-6 w-6 items-center justify-center"></span>
            </button>
        </div>

        @if (!empty($success))
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {{ $success }}
            </div>
        @endif

        @if ($errors->any())
            <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {{ $errors->first() }}
            </div>
        @endif

        <section class="rounded-3xl border border-[#d5dbe8] bg-[#f5f7fc] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.08)] dark:border-[#2d4353] dark:bg-[#1c2a35] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <form class="space-y-5" method="POST" action="/settings/foto">
                @csrf

                <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex items-center gap-4">
                        <div class="relative h-[74px] w-[74px] rounded-2xl">
                            <div class="h-full w-full overflow-hidden rounded-2xl" data-avatar-preview>
                                @if (!empty($user['avatar']))
                                    <img src="{{ $user['avatar'] }}" alt="{{ $user['name'] }}" class="h-full w-full object-cover">
                                @else
                                    <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f78c1e] to-[#f26638] text-4xl font-bold text-white">
                                        {{ $initials }}
                                    </div>
                                @endif
                            </div>
                            <span class="absolute bottom-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#f5f7fc] bg-[#2f6ae8] text-white shadow-[0_2px_8px_rgba(47,106,232,0.45)] dark:border-[#1c2a35]">
                                <svg aria-hidden="true" viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 8h4l2-2h4l2 2h4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                                    <circle cx="12" cy="13" r="3" />
                                </svg>
                            </span>
                        </div>

                        <div>
                            <p class="text-2xl font-semibold leading-none text-[#0a1730] dark:text-[#d8ecfb]">{{ $user['name'] }}</p>
                            <p class="mt-2 text-base text-[#60789e] dark:text-[#9cc4df]">{{ $user['email'] }}</p>
                            <span class="mt-2 inline-flex rounded-full bg-[#dce8ff] px-3 py-1 text-sm font-semibold text-[#2f6ae8] dark:bg-[#243845] dark:text-[#c6e7ff]">Equipe</span>
                        </div>
                    </div>

                    <div class="flex flex-col gap-3 sm:flex-row">
                        <button type="button" data-open-file class="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2f6ae8] px-7 text-base font-semibold text-white shadow-[0_8px_22px_rgba(47,106,232,0.35)] transition hover:bg-[#2459cb] dark:bg-[#3a87bb] dark:hover:bg-[#326f98]">
                            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 16V4" />
                                <path d="M8 8l4-4 4 4" />
                                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                            </svg>
                            Escolher arquivo
                        </button>
                        <button type="button" data-open-file class="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d5dbe8] bg-[#f5f7fc] px-7 text-base font-semibold text-[#596f93] transition hover:bg-white dark:border-[#2d4353] dark:bg-[#243845] dark:text-[#c6e7ff] dark:hover:bg-[#2a4254]">
                            Substituir arquivo cadastrado
                        </button>
                    </div>
                </div>

                <input id="foto_arquivo" type="file" accept="image/*" class="hidden">
                <input type="hidden" name="foto_perfil" id="foto_perfil" value="">

                <div class="rounded-2xl border border-dashed border-[#cfd7e6] bg-[#f3f6fc] px-6 py-4 text-center text-sm text-[#8ba0c1] dark:border-[#2d4353] dark:bg-[#16232d] dark:text-[#9cc4df]">
                    Formatos aceitos JPG, PNG, GIF ou WEBP. Ela pode ser encontrada em uma imagem de até 4mb de tamanho.
                </div>

                <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0b1730] px-6 text-sm font-semibold text-white transition hover:bg-[#0f2145] dark:bg-[#243845] dark:hover:bg-[#2a4254]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 3v11" />
                        <path d="M8 10l4 4 4-4" />
                        <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                    </svg>
                    Salvar foto
                </button>
            </form>
        </section>

        <section class="rounded-3xl border border-[#d5dbe8] bg-[#f5f7fc] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.08)] dark:border-[#2d4353] dark:bg-[#1c2a35] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            <h2 class="mb-6 text-2xl font-semibold text-[#0a1730] dark:text-[#d8ecfb]">Informações pessoais</h2>

            <form class="space-y-6" method="POST" action="/settings/contato" id="contact-form">
                @csrf

                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label for="email" class="mb-2 block text-sm font-medium text-[#2f3f5a] dark:text-[#c6e7ff]">Email</label>
                        <input id="email" type="email" value="{{ $user['email'] }}" disabled class="h-11 w-full rounded-2xl border border-[#d6dce9] bg-[#edf1f7] px-4 text-sm text-[#5f7699] dark:border-[#2d4353] dark:bg-[#16232d] dark:text-[#9cc4df]">
                    </div>

                    <div>
                        <label for="telefone" class="mb-2 block text-sm font-medium text-[#2f3f5a] dark:text-[#c6e7ff]">Telefone</label>
                        <input id="telefone" name="telefone" type="text" maxlength="30" value="{{ old('telefone', $user['telefone'] ?? '') }}" class="h-11 w-full rounded-2xl border border-[#d6dce9] bg-[#edf1f7] px-4 text-sm text-[#344864] dark:border-[#2d4353] dark:bg-[#16232d] dark:text-[#d8ecfb]">
                    </div>

                    <div>
                        <label for="endereco_input" class="mb-2 block text-sm font-medium text-[#2f3f5a] dark:text-[#c6e7ff]">Endereço</label>
                        <input id="endereco_input" type="text" value="{{ $locationAddress }}" class="h-11 w-full rounded-2xl border border-[#d6dce9] bg-[#edf1f7] px-4 text-sm text-[#344864] dark:border-[#2d4353] dark:bg-[#16232d] dark:text-[#d8ecfb]">
                    </div>

                    <div>
                        <label for="uf_input" class="mb-2 block text-sm font-medium text-[#2f3f5a] dark:text-[#c6e7ff]">UF</label>
                        <input id="uf_input" type="text" value="{{ $locationUf }}" class="h-11 w-full rounded-2xl border border-[#d6dce9] bg-[#edf1f7] px-4 text-sm text-[#344864] dark:border-[#2d4353] dark:bg-[#16232d] dark:text-[#d8ecfb]">
                    </div>
                </div>

                <input type="hidden" id="localizacao" name="localizacao" value="{{ $savedLocation }}">

                <div>
                    <label class="mb-2 block text-sm font-medium text-[#2f3f5a] dark:text-[#c6e7ff]">Tags</label>
                    <div id="tags-container" class="flex min-h-[44px] flex-wrap items-center gap-2 rounded-2xl border border-[#d6dce9] bg-[#edf1f7] px-3 py-2 dark:border-[#2d4353] dark:bg-[#16232d]"></div>
                    <div class="mt-2 flex gap-2">
                        <input id="tag-input" type="text" class="h-10 flex-1 rounded-xl border border-[#d6dce9] bg-white px-3 text-sm text-[#344864] outline-none dark:border-[#2d4353] dark:bg-[#1c2a35] dark:text-[#d8ecfb]" placeholder="Digite uma tag">
                        <button type="button" id="add-tag-button" class="inline-flex h-10 items-center justify-center rounded-xl bg-[#2f6ae8] px-4 text-sm font-semibold text-white transition hover:bg-[#2459cb] dark:bg-[#3a87bb] dark:hover:bg-[#326f98]">
                            Adicionar tag
                        </button>
                    </div>
                    <input type="hidden" id="perfil_tags" name="perfil_tags" value="{{ old('perfil_tags', $user['perfil_tags'] ?? '') }}">
                </div>

                <div>
                    <label for="perfil_sobre" class="mb-2 block text-sm font-medium text-[#2f3f5a] dark:text-[#c6e7ff]">Notas</label>
                    <textarea id="perfil_sobre" name="perfil_sobre" maxlength="600" rows="4" class="min-h-[100px] w-full rounded-2xl border border-[#d6dce9] bg-[#edf1f7] px-4 py-3 text-sm text-[#344864] dark:border-[#2d4353] dark:bg-[#16232d] dark:text-[#d8ecfb]">{{ old('perfil_sobre', $user['perfil_sobre'] ?? '') }}</textarea>
                </div>

                <div class="flex justify-end">
                    <button type="submit" class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2f6ae8] px-6 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(47,106,232,0.35)] transition hover:bg-[#2459cb] dark:bg-[#3a87bb] dark:hover:bg-[#326f98]">
                        <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 3v11" />
                            <path d="M8 10l4 4 4-4" />
                            <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                        </svg>
                        Salvar informações
                    </button>
                </div>
            </form>
        </section>
    </main>

    <script>
        const themeToggleButton = document.getElementById('theme-toggle');
        const themeToggleIcon = document.getElementById('theme-toggle-icon');
        const moonIcon = '<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/></svg>';
        const sunIcon = '<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

        const syncThemeToggle = () => {
            const isDarkMode = document.documentElement.classList.contains('dark');

            if (themeToggleIcon) {
                themeToggleIcon.innerHTML = isDarkMode ? sunIcon : moonIcon;
            }

            themeToggleButton?.setAttribute('aria-label', isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro');
        };

        themeToggleButton?.addEventListener('click', () => {
            const isDarkMode = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            syncThemeToggle();
        });

        syncThemeToggle();

        const fileInput = document.getElementById('foto_arquivo');
        const hiddenPhotoInput = document.getElementById('foto_perfil');
        const avatarPreview = document.querySelector('[data-avatar-preview]');
        const fileTriggerButtons = document.querySelectorAll('[data-open-file]');

        if (fileInput && hiddenPhotoInput) {
            fileTriggerButtons.forEach((button) => {
                button.addEventListener('click', () => fileInput.click());
            });

            fileInput.addEventListener('change', () => {
                const file = fileInput.files && fileInput.files[0];

                if (!file) {
                    hiddenPhotoInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        hiddenPhotoInput.value = reader.result;

                        if (avatarPreview) {
                            avatarPreview.innerHTML = `<img src="${reader.result}" alt="Prévia" class="h-full w-full object-cover">`;
                        }
                    }
                };

                reader.readAsDataURL(file);
            });
        }

        const hiddenLocationInput = document.getElementById('localizacao');
        const addressInput = document.getElementById('endereco_input');
        const ufInput = document.getElementById('uf_input');
        const contactForm = document.getElementById('contact-form');

        if (hiddenLocationInput && addressInput && ufInput && contactForm) {
            contactForm.addEventListener('submit', () => {
                const address = addressInput.value.trim();
                const uf = ufInput.value.trim();

                hiddenLocationInput.value = [address, uf].filter(Boolean).join(', ');
            });
        }

        const tagsContainer = document.getElementById('tags-container');
        const tagInput = document.getElementById('tag-input');
        const addTagButton = document.getElementById('add-tag-button');
        const hiddenTagsInput = document.getElementById('perfil_tags');
        const tags = hiddenTagsInput && hiddenTagsInput.value
            ? hiddenTagsInput.value.split(',').map((tag) => tag.trim()).filter(Boolean)
            : [];

        const addTag = () => {
            if (!tagInput) {
                return;
            }

            const nextTag = tagInput.value.trim();

            if (!nextTag) {
                return;
            }

            if (!tags.includes(nextTag)) {
                tags.push(nextTag);
            }

            tagInput.value = '';
            renderTags();
        };

        const renderTags = () => {
            if (!tagsContainer || !hiddenTagsInput) {
                return;
            }

            tagsContainer.innerHTML = '';

            tags.forEach((tag, index) => {
                const chip = document.createElement('span');
                chip.className = 'inline-flex items-center gap-1 rounded-xl bg-[#dce8ff] px-3 py-1 text-[18px] font-semibold text-[#2f6ae8] dark:bg-[#243845] dark:text-[#c6e7ff]';
                chip.innerHTML = `${tag}<button type="button" class="text-[#8aa4d8]" data-remove-index="${index}" aria-label="Remover tag">×</button>`;
                tagsContainer.appendChild(chip);
            });

            hiddenTagsInput.value = tags.join(', ');

            tagsContainer.querySelectorAll('[data-remove-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    const index = Number(button.getAttribute('data-remove-index'));
                    if (!Number.isNaN(index)) {
                        tags.splice(index, 1);
                        renderTags();
                    }
                });
            });
        };

        if (tagInput && hiddenTagsInput) {
            tagInput.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') {
                    return;
                }

                event.preventDefault();
                addTag();
            });

            addTagButton?.addEventListener('click', addTag);
        }

        renderTags();
    </script>
</body>
</html>