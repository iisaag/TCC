// =============================================================
// 📁 ActiveUsers.tsx
// =============================================================
// Painel lateral de "Usuários Ativos" com:
//  - Lista de usuários com avatar, nome, cargo e status
//  - Indicador de status online (bolinha verde animada)
//  - Status customizável por usuário (ex: "em reunião", "disponível")
//
// 💡 COMO USAR:
//   <ActiveUsers users={activeUsers} />
//
// O array `users` pode vir de uma API, de props do Inertia,
// ou de um estado global (ex: broadcasting com Pusher/Echo).
// =============================================================

import { Users, Moon, CircleMinus, Phone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import UserProfileCard from "@/components/UserProfileCard";

// ------------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------------
interface ActiveUser {
    id: number;
    name: string;          // Ex: "Isabelli Arantes"
    role: string;          // Ex: "Chefe - Design & Front-End"
    status: string;        // Ex: "em reunião no Teams"
    avatar?: string;       // URL da foto. Se não tiver, mostra as iniciais.
}

interface ActiveUsersProps {
    users: ActiveUser[];
}

interface UserGroup {
    groupLabel: string;
    users: ActiveUser[];
}

// ------------------------------------------------------------------
// FUNÇÕES AUXILIARES
// ------------------------------------------------------------------
function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

function getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes("online") || statusLower.includes("disponível")) {
        return "var(--cor-disponivel)";  // Verde
    } else if (statusLower.includes("reunião") || statusLower.includes("busy") || statusLower.includes("ocupado")) {
        return "var(--cor-ocupado)";     // Laranja
    } else if (statusLower.includes("ausente") || statusLower.includes("away")) {
        return "var(--cor-ausente)";     // Amarelo
    } else if (statusLower.includes("perturbe") || statusLower.includes("dnd")) {
        return "var(--cor-nperturbe)";   // Vermelho
    }
    
    return "var(--cor-offline)";         // Cinza padrão
}

function getStatusIcon(status: string) {
    const statusLower = status.toLowerCase();
    const size = 8;
    
    if (statusLower.includes("online") || statusLower.includes("disponível")) {
        return null;  // Sem ícone para online
    } else if (statusLower.includes("reunião") || statusLower.includes("busy") || statusLower.includes("ocupado")) {
        return <Phone size={size} />;
    } else if (statusLower.includes("ausente") || statusLower.includes("away")) {
        return <Moon size={size} />;
    } else if (statusLower.includes("perturbe") || statusLower.includes("dnd")) {
        return <CircleMinus size={size} />;
    }
    
    return null;
}

function resolveAvatarUrl(avatar?: string): string | undefined {
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

function rolePriority(role: string): number {
    const normalized = role.toLowerCase();

    if (normalized.includes("chefe")) {
        return 0;
    }

    if (normalized.includes("owner") || normalized.includes("admin")) {
        return 1;
    }

    if (normalized.includes("leader") || normalized.includes("lider") || normalized.includes("gerente")) {
        return 2;
    }

    if (normalized.includes("moderator") || normalized.includes("moderador")) {
        return 3;
    }

    if (normalized.includes("operator") || normalized.includes("operador")) {
        return 4;
    }

    return 5;
}

function roleGroupLabel(role: string): string {
    const normalized = role.toLowerCase();

    if (normalized.includes("chefe")) {
        return "CHEFE";
    }

    return role.toUpperCase();
}

function statusPriority(status: string): number {
    return status.toLowerCase().includes("online") ? 0 : 1;
}

// ------------------------------------------------------------------
// COMPONENTE — ITEM DE USUÁRIO
// ------------------------------------------------------------------
// Separamos o item individual em seu próprio componente.
// Isso é uma boa prática: mantém o código organizado e reutilizável.
function UserItem({ user, onClick }: { user: ActiveUser; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
    const avatar = resolveAvatarUrl(user.avatar);

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-[#c9deff]/30 transition-all duration-300 hover:shadow-md hover:scale-105"
        >

            {/*
             * ─── AVATAR COM INDICADOR DE ONLINE ──────────────────────────
             * O `relative` no container permite posicionar o indicador verde
             * no canto inferior direito do avatar com `absolute`.
             */}
            <div className="relative shrink-0">
                {avatar ? (
                    <img
                        src={avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover"
                    />
                ) : (
                    // Avatar com iniciais quando não há foto
                    <div className="
                        w-9 h-9 rounded-full text-white
                        flex items-center justify-center
                        text-xs font-bold
                    "
                    style={{ backgroundColor: 'var(--cor-foto)' }}>
                        {getInitials(user.name)}
                    </div>
                )}

                {/*
                 * ── INDICADOR DE STATUS ONLINE ───────────────────────────
                 * Bolinha dinâmica com cor baseada no status.
                 *
                 * `animate-ping` → anel externo que pulsa e desaparece
                 * O círculo interno fica fixo sobre o anel pulsante
                 *
                 * O `ring-2 ring-white` cria uma borda branca ao redor,
                 * separando visualmente a bolinha do avatar.
                 */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                    <span 
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                        style={{ backgroundColor: getStatusColor(user.status) }}
                    />
                    <span 
                        className="relative inline-flex rounded-full h-3.5 w-3.5 ring-2 ring-(--cor-widgets) items-center justify-center"
                        style={{ backgroundColor: getStatusColor(user.status) }}
                    >
                        <span style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getStatusIcon(user.status)}
                        </span>
                    </span>
                </span>
            </div>

            {/*
             * ─── INFORMAÇÕES DO USUÁRIO ───────────────────────────────────
             * `min-w-0` + `truncate` garantem que textos longos não quebrem o layout.
             * Sem isso, um nome muito longo empurraria os outros elementos.
             */}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-(--cor-textoII) truncate">
                    {user.name}
                </p>
                <p className="text-xs text-(--cor-accent) truncate">
                    {user.role}
                </p>
                {/* Status atual — cor dinâmica baseada no status */}
                <p className="text-xs truncate mt-0.5" style={{ color: getStatusColor(user.status) }}>
                    {user.status}
                </p>
            </div>
        </button>
    );
}

// ------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ------------------------------------------------------------------
export default function ActiveUsers({ users }: ActiveUsersProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedUser, setSelectedUser] = useState<ActiveUser | null>(null);
    const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);

    const groupedUsers = useMemo<UserGroup[]>(() => {
        const groupMap = new Map<string, { role: string; users: ActiveUser[] }>();

        for (const user of users) {
            const role = user.role && user.role.trim() !== "" ? user.role : "Sem cargo";
            const groupLabel = roleGroupLabel(role);
            const current = groupMap.get(groupLabel) ?? { role, users: [] };

            current.users.push(user);
            groupMap.set(groupLabel, current);
        }

        const groups = Array.from(groupMap.entries()).map(([groupLabel, group]) => ({
            groupLabel,
            users: [...group.users].sort((left, right) => {
                const statusDiff = statusPriority(left.status) - statusPriority(right.status);

                if (statusDiff !== 0) {
                    return statusDiff;
                }

                return left.name.localeCompare(right.name, "pt-BR");
            }),
        }));

        return groups.sort((left, right) => {
            const roleDiff = rolePriority(left.groupLabel) - rolePriority(right.groupLabel);

            if (roleDiff !== 0) {
                return roleDiff;
            }

            return left.groupLabel.localeCompare(right.groupLabel, "pt-BR");
        });
    }, [users]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && popupRef.current.contains(event.target as Node)) {
                return;
            }

            if (
                panelRef.current &&
                !panelRef.current.contains(event.target as Node)
            ) {
                setSelectedUser(null);
            }
        }

        if (selectedUser) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedUser]);

    return (
        /*
         * ─── CONTAINER DO PAINEL ──────────────────────────────────────
         * `w-64` → largura fixa de 256px, igual à sidebar expandida.
         * Ajuste conforme necessário para o seu layout.
         */
        <div className="relative" ref={panelRef}>
            <aside className={`shrink-0 flex flex-col gap-2 transition-all duration-300 ${isExpanded ? "w-64" : "w-20"}`}>

            {/*
             * ─── CABEÇALHO ────────────────────────────────────────────
             * Botão/título "Usuários Ativos" com borda arredondada,
             * fiel ao design original.
             */}
            <div
                className={`
                flex items-center
                bg-(--cor-widgets) border border-(--cor-borda) rounded-full
                text-sm font-semibold text-(--cor-textoII)
                transition-colors duration-200
                ${isExpanded ? "w-full justify-between p-2.5" : "w-full justify-center p-2 mt-2"}
            `}
            >
                <span className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setIsExpanded((prev) => !prev);
                            setSelectedUser(null);
                        }}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-[#c9deff]/30 hover:shadow-md hover:scale-110 transition-all duration-300"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Recolher usuários ativos" : "Expandir usuários ativos"}
                    >
                        {isExpanded ? "<" : ">"}
                    </button>
                    <Users size={16} />
                    {isExpanded && <span>Usuários Ativos</span>}
                </span>
                {/*
                 * Badge com a contagem de usuários online.
                 * Atualiza automaticamente conforme o array `users` muda.
                 */}
                <span className={`
                    bg-green-100 text-green-700
                    text-xs font-bold
                    px-2 py-0.5 rounded-full
                    ${isExpanded ? "" : "hidden"}
                `}>
                    {users.length}
                </span>
            </div>

            {/*
             * ─── LISTA DE USUÁRIOS ────────────────────────────────────
             * Iteramos sobre o array `users` e renderizamos um `UserItem` para cada.
             * `key={user.id}` é obrigatório no React para listas — ajuda na performance.
             */}
            <div className={`
                flex flex-col
                bg-(--cor-widgets) border border-(--cor-borda) 200 rounded-2xl
                p-2 gap-1
                overflow-hidden transition-all duration-300
                ${isExpanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0 p-0 border-transparent pointer-events-none"}
            `}>
                {groupedUsers.length === 0 ? (
                    // Estado vazio — nenhum usuário online
                    <p className="text-sm text-gray-400 text-center py-4">
                        Nenhum usuário disponível
                    </p>
                ) : (
                    groupedUsers.map((group) => (
                        <div key={group.groupLabel} className="space-y-1 pt-1">
                            <div className="flex items-center justify-between px-2 py-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-(--cor-accent)">
                                    {group.groupLabel}
                                </p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                    {group.users.length}
                                </span>
                            </div>

                            {group.users.map((user) => (
                                <div key={user.id}>
                                    <UserItem
                                        user={user}
                                        onClick={(event) => {
                                        const rect = event.currentTarget.getBoundingClientRect();
                                        const panelRect = panelRef.current?.getBoundingClientRect();

                                        if (!panelRect) {
                                            return;
                                        }

                                        const cardWidth = 352;
                                        const cardHeight = 520;
                                        const gap = 16;

                                        // Sempre abre no lado esquerdo do painel de usuários ativos.
                                        const left = panelRect.left - cardWidth - gap;

                                        const maxTop = Math.max(12, window.innerHeight - cardHeight);
                                        const top = Math.min(Math.max(80, rect.top - 12), maxTop);

                                        setPopupPosition({ top, left });
                                        setSelectedUser(user);
                                    }}
                                />
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>

            </aside>

            {selectedUser && (
                <div key={selectedUser.id} ref={popupRef}>
                    <UserProfileCard
                        user={selectedUser}
                        isOpen={Boolean(selectedUser)}
                        positionClassName="fixed z-[9999]"
                        style={popupPosition ? { top: popupPosition.top, left: popupPosition.left } : undefined}
                    />
                </div>
            )}
        </div>
    );
}
