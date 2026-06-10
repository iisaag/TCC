// =============================================================
// 📁 Header.tsx
// =============================================================
// Barra superior do sistema com:
//  - Logo + saudação ao usuário
//  - Campo de busca centralizado
//  - Ícone de notificações
//  - Avatar + nome e cargo do usuário
//
// 💡 COMO USAR:
//   <Header user={auth.user} />
//
// O objeto `user` vem do Inertia via `usePage().props.auth.user`
// ou pode ser passado diretamente pelo layout.
//
// 💡 DEPENDÊNCIAS NECESSÁRIAS:
//   npm install lucide-react
// =============================================================

import { router } from "@inertiajs/react";
import { Bell, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import UserDropdownMenu from "@/components/UserDropdownMenu";
import { apiRoutes } from "@/lib/routes";

interface NotificationItem {
    id: string;
    source: "sistema" | "projeto";
    title: string;
    description: string;
    occurred_at: string | null;
    read: boolean;
}

// ------------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------------
interface User {
    name: string;       // Ex: "Isabelli Arantes"
    role: string;       // Ex: "Chefe - Design & Front"
    status?: string;
    avatar?: string;    // URL da foto. Se não tiver, mostra as iniciais.
}

interface HeaderProps {
    user: User;
}

interface SearchResultItem {
    id: string;
    type: "projeto" | "tarefa" | "meta" | "usuario" | "equipe";
    title: string;
    subtitle: string;
    url: string;
}

interface NotificationsApiResponse {
    data?: {
        notifications?: NotificationItem[];
        unread_count?: number;
        page?: number;
        total_pages?: number;
    };
}

function resolveAvatarUrl(avatar?: string | null): string | undefined {
    if (!avatar) {
        return undefined;
    }

    if (
        avatar.startsWith("data:image/") ||
        avatar.startsWith("http://") ||
        avatar.startsWith("https://")
    ) {
        return avatar;
    }

    return undefined;
}

// ------------------------------------------------------------------
// FUNÇÃO AUXILIAR — Gerar iniciais do nome
// ------------------------------------------------------------------
// Usada quando o usuário não tem foto de avatar.
// Ex: "Isabelli Arantes" → "IA"
function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2) // Pega no máximo 2 palavras
        .map((word) => word[0].toUpperCase())
        .join("");
}

// ------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ------------------------------------------------------------------
export default function Header({ user }: HeaderProps) {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement | null>(null);
    const userMenuRef = useRef<HTMLDivElement | null>(null);
    const searchRef = useRef<HTMLDivElement | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationsPage, setNotificationsPage] = useState(1);
    const [notificationsTotalPages, setNotificationsTotalPages] = useState(1);
    const [lastSeenAt, setLastSeenAt] = useState<string>(() => {
        try {
            return localStorage.getItem("notifications:lastSeenAt") ?? new Date(0).toISOString();
        } catch {
            return new Date(0).toISOString();
        }
    });

    const avatar = resolveAvatarUrl(user.avatar);
    const [currentStatus, setCurrentStatus] = useState(user.status ?? "online");

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setCurrentStatus(user.status ?? "online");
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [user.status]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                notificationsRef.current &&
                !notificationsRef.current.contains(event.target as Node)
            ) {
                setIsNotificationsOpen(false);
            }

            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(event.target as Node)
            ) {
                setIsUserMenuOpen(false);
            }

            if (
                searchRef.current &&
                !searchRef.current.contains(event.target as Node)
            ) {
                setIsSearchOpen(false);
            }
        }

        if (isNotificationsOpen || isUserMenuOpen || isSearchOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isNotificationsOpen, isUserMenuOpen, isSearchOpen]);

    useEffect(() => {
        const query = searchQuery.trim();

        if (query.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setIsSearching(true);

            try {
                const response = await fetch(`${apiRoutes.buscaGlobal}?q=${encodeURIComponent(query)}`, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Falha ao carregar resultados da busca");
                }

                const payload = (await response.json()) as { data?: { results?: SearchResultItem[] } };
                setSearchResults(payload.data?.results ?? []);
                setIsSearchOpen(true);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [searchQuery]);

    useEffect(() => {
        let isMounted = true;

        const fetchNotifications = async () => {
            try {
                const response = await fetch(`${apiRoutes.notificacoes}?limit=30&page=${notificationsPage}&since=${encodeURIComponent(lastSeenAt)}`, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" },
                });

                if (!response.ok || !isMounted) {
                    return;
                }

                const payload = (await response.json()) as NotificationsApiResponse;
                setNotifications(payload.data?.notifications ?? []);
                setUnreadCount(payload.data?.unread_count ?? 0);

                const totalPages = Math.max(1, payload.data?.total_pages ?? 1);
                setNotificationsTotalPages(totalPages);
            } catch {
                // Mantem estado anterior se o polling falhar.
            }
        };

        void fetchNotifications();

        const interval = window.setInterval(() => {
            void fetchNotifications();
        }, 5000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, [lastSeenAt, notificationsPage]);

    useEffect(() => {
        if (!isNotificationsOpen) {
            return;
        }

        const now = new Date().toISOString();
        setLastSeenAt(now);

        try {
            localStorage.setItem("notifications:lastSeenAt", now);
        } catch {
            // Ignore storage errors.
        }
    }, [isNotificationsOpen]);

    const formatNotificationTime = (isoDate: string | null): string => {
        if (!isoDate) {
            return "Agora";
        }

        const date = new Date(isoDate);
        if (Number.isNaN(date.getTime())) {
            return "Agora";
        }

        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) {
            return "Agora";
        }

        if (diffMin < 60) {
            return `Ha ${diffMin} min`;
        }

        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) {
            return `Ha ${diffHours} h`;
        }

        const diffDays = Math.floor(diffHours / 24);
        return `Ha ${diffDays} d`;
    };

    const goToResult = (item: SearchResultItem) => {
        setIsSearchOpen(false);
        setSearchQuery("");
        router.get(item.url);
    };

    const typeLabel: Record<SearchResultItem["type"], string> = {
        projeto: "Projeto",
        tarefa: "Card",
        meta: "Meta",
        usuario: "Pessoa",
        equipe: "Equipe",
    };

    return (
        /*
         * ─── CONTAINER DO HEADER ─────────────────────────────────────
         * `sticky top-0 z-20` → o header fica fixo no topo ao rolar a página.
         * `h-16` → altura padrão de 64px, igual ao botão de toggle da Sidebar.
         */
        <header className="
            sticky top-0 z-20
            flex items-center gap-4
            h-16 px-4
            bg-(--cor-primaria)
        ">
            {/*
             * ─── LOGO + SAUDAÇÃO ─────────────────────────────────────────
             * Bloco da esquerda: logo da aplicação e saudação ao usuário.
             * `shrink-0` evita que o bloco seja comprimido em telas menores.
             */}
            <div className="flex flex-col shrink-0">
                {/* Nome do sistema — destaque em roxo */}
                <span className="text-(--cor-logo) font-bold font-aclonica text-xl leading-tight tracking-tight">
                    AivyPM
                </span>
                {/* Saudação personalizada */}
                <span className="text-white text-lg font-medium">
                    Olá, {user.name.split(" ")[0]}! 👋
                </span>
            </div>

            {/*
             * ─── CAMPO DE BUSCA ──────────────────────────────────────────
             * `flex-1` faz o campo crescer e ocupar o espaço disponível no centro.
             * `max-w-xl` limita o tamanho máximo para não ficar enorme em telas grandes.
             */}
            <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-xl" ref={searchRef}>
                    {/*
                     * Ícone de lupa posicionado absolutamente dentro do campo.
                     * `pointer-events-none` garante que o ícone não intercepte cliques.
                     */}
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[--cor-textoII] pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Pesquisar projetos, metas, pessoas..."
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                        }}
                        onFocus={() => {
                            if (searchQuery.trim().length >= 2) {
                                setIsSearchOpen(true);
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setIsSearchOpen(false);
                            }

                            if (event.key === "Enter" && searchResults.length > 0) {
                                event.preventDefault();
                                goToResult(searchResults[0]);
                            }
                        }}
                        className="
                            w-full
                            pl-9 pr-4 py-2
                            text-sm
                            bg-(--cor-widgets) rounded-full
                            border border-(--cor-borda)
                            focus:outline-none focus:border-[--cor-accentII]/40 focus:bg-(--cor-borda)
                            transition-colors duration-200
                            placeholder:text-(--cor-textoII)/50
                        "
                        style={{ color: "var(--cor-vetores)" }}
                    />

                    {isSearchOpen && (
                        <div
                            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border bg-white shadow-2xl"
                            style={{ borderColor: "var(--cor-borda)" }}
                        >
                            <div className="max-h-80 overflow-y-auto p-2">
                                {isSearching ? (
                                    <p className="px-3 py-2 text-sm" style={{ color: "var(--cor-textoII)" }}>
                                        Pesquisando...
                                    </p>
                                ) : searchResults.length === 0 ? (
                                    <p className="px-3 py-2 text-sm" style={{ color: "var(--cor-textoII)" }}>
                                        Nenhum resultado encontrado.
                                    </p>
                                ) : (
                                    searchResults.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => goToResult(item)}
                                            className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#eef5fb]"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                                                <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                                            </div>
                                            <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                                {typeLabel[item.type]}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/*
             * ─── ÁREA DO USUÁRIO ─────────────────────────────────────────
             * Alinhada à direita: notificações + avatar + info do usuário.
             * `shrink-0` evita compressão.
             */}
            <div className="flex items-center gap-3 shrink-0">
                {/*
                 * ── BOTÃO DE NOTIFICAÇÕES ────────────────────────────────
                 * Círculo com ícone de sino. O ponto vermelho indica notificações não lidas.
                 * `relative` no botão + `absolute` no ponto permite esse posicionamento.
                 */}
                <div className="relative" ref={notificationsRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsNotificationsOpen((prev) => {
                                const next = !prev;
                                if (next) {
                                    setNotificationsPage(1);
                                }
                                return next;
                            });
                            setIsUserMenuOpen(false);
                        }}
                        className="
                            relative
                            flex items-center justify-center
                            bg-(--cor-noti)
                            text-white
                            w-9 h-9
                            rounded-xl
                            hover:bg-[#406179]
                            hover:scale-110
                            shadow-sm hover:shadow-lg
                            transition-all duration-300
                            "
                        aria-expanded={isNotificationsOpen}
                        aria-label="Abrir notificacoes"
                    >
                        <Bell size={18} />
                        {/* Ponto vermelho de notificação não lida */}
                        {unreadCount > 0 && (
                            <span className="
                                absolute top-2 right-2
                                w-2 h-2 rounded-full
                                bg-[#B33B3B]
                                ring-2 ring-white
                            " />
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="
                            absolute right-0 top-11 z-40
                            w-88 max-w-[85vw]
                            rounded-2xl shadow-xl
                            overflow-hidden
                            animate-scale-in
                        " style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}>
                            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--cor-borda)" }}>
                                <span className="text-sm font-semibold" style={{ color: "var(--cor-vetores)" }}>Notificações</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: "var(--cor-logo)", backgroundColor: "color-mix(in srgb, var(--cor-logo) 18%, transparent)" }}>
                                    {unreadCount} novas
                                </span>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="text-sm text-center py-6" style={{ color: "var(--cor-textoII)" }}>Sem notificações no momento</p>
                                ) : (
                                    notifications.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`px-4 py-3 border-b last:border-b-0 transition-colors duration-150 ${
                                                index === 0 ? "animate-stagger-1" : index === 1 ? "animate-stagger-2" : "animate-stagger-3"
                                            }`}
                                            style={{ borderColor: "var(--cor-borda)" }}
                                            onMouseEnter={(event) => {
                                                event.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--cor-accent) 20%, transparent)";
                                            }}
                                            onMouseLeave={(event) => {
                                                event.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate" style={{ color: "var(--cor-vetores)" }}>{item.title}</p>
                                                    <p className="text-xs mt-0.5" style={{ color: "var(--cor-textoII)" }}>{item.description}</p>
                                                </div>
                                                {!item.read && (
                                                    <span className="mt-1 w-2 h-2 rounded-full bg-[#6c63ff] shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] mt-1" style={{ color: "var(--cor-textoII)" }}>{formatNotificationTime(item.occurred_at)}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {notificationsTotalPages > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-2.5" style={{ borderColor: "var(--cor-borda)" }}>
                                    <button
                                        type="button"
                                        onClick={() => setNotificationsPage((prev) => Math.max(1, prev - 1))}
                                        disabled={notificationsPage <= 1}
                                        className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ background: "var(--cor-fundo)", color: "var(--cor-vetores)" }}
                                    >
                                        Anterior
                                    </button>

                                    <span className="text-xs" style={{ color: "var(--cor-textoII)" }}>
                                        Pagina {notificationsPage} de {notificationsTotalPages}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setNotificationsPage((prev) => Math.min(notificationsTotalPages, prev + 1))}
                                        disabled={notificationsPage >= notificationsTotalPages}
                                        className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ background: "var(--cor-fundo)", color: "var(--cor-vetores)" }}
                                    >
                                        Proxima
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/*
                 * ── INFO DO USUÁRIO ──────────────────────────────────────
                 * Texto com nome e cargo. Oculto em telas muito pequenas (`hidden sm:flex`).
                 */}
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-lg font-semibold text-white leading-tight">
                        {user.name}
                    </span>
                    <span className="text-sm text-(--cor-accentII)">
                        {user.role}
                    </span>
                </div>

                {/*
                 * ── AVATAR DO USUÁRIO ────────────────────────────────────
                 * Se o usuário tiver foto (`avatar`), mostramos a imagem.
                 * Se não tiver, mostramos um círculo colorido com as iniciais.
                 *
                 * `object-cover` garante que a foto preencha o círculo sem distorção.
                 */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsUserMenuOpen((prev) => !prev);
                            setIsNotificationsOpen(false);
                        }}
                        className="rounded-full focus:outline-none focus:ring-2 focus:ring-(--cor-accent)/30 transition-all duration-300 hover:scale-105"
                        aria-expanded={isUserMenuOpen}
                        aria-label="Abrir menu do usuario"
                    >
                        {avatar ? (
                            <img
                                src={avatar}
                                alt={user.name}
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-(--cor-logo2)/30"
                            />
                        ) : (
                            <div className="
                                w-9 h-9 rounded-full
                                bg-(--cor-foto) text-white
                                flex items-center justify-center
                                text-sm font-bold
                                ring-2 ring-(--cor-logo2)/30
                            ">
                                {getInitials(user.name)}
                            </div>
                        )}
                    </button>

                    <UserDropdownMenu
                        user={user}
                        isOpen={isUserMenuOpen}
                        currentStatus={currentStatus}
                        onStatusChange={(status) => {
                            setCurrentStatus(status);

                            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

                            void fetch('/presence/status', {
                                method: 'POST',
                                headers: {
                                    Accept: 'application/json',
                                    'Content-Type': 'application/json',
                                    'X-Requested-With': 'XMLHttpRequest',
                                    'X-CSRF-TOKEN': csrfToken,
                                },
                                body: JSON.stringify({ status }),
                            });

                            window.dispatchEvent(new CustomEvent('presence:status-updated', {
                                detail: { status },
                            }));
                        }}
                        onLogoutClick={() => router.post("/logout")}
                    />
                </div>
            </div>
        </header>
    );
}
