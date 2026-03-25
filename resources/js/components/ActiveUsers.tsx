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

import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
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

// ------------------------------------------------------------------
// FUNÇÃO AUXILIAR — Gerar iniciais do nome
// ------------------------------------------------------------------
function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

// ------------------------------------------------------------------
// COMPONENTE — ITEM DE USUÁRIO
// ------------------------------------------------------------------
// Separamos o item individual em seu próprio componente.
// Isso é uma boa prática: mantém o código organizado e reutilizável.
function UserItem({ user, onClick }: { user: ActiveUser; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-[#c9deff]/30 transition-colors duration-200"
        >

            {/*
             * ─── AVATAR COM INDICADOR DE ONLINE ──────────────────────────
             * O `relative` no container permite posicionar o indicador verde
             * no canto inferior direito do avatar com `absolute`.
             */}
            <div className="relative shrink-0">
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover"
                    />
                ) : (
                    // Avatar com iniciais quando não há foto
                    <div className="
                        w-9 h-9 rounded-full
                        bg-[#6c63ff] text-white
                        flex items-center justify-center
                        text-xs font-bold
                    ">
                        {getInitials(user.name)}
                    </div>
                )}

                {/*
                 * ── INDICADOR DE STATUS ONLINE ───────────────────────────
                 * Bolinha verde com animação de "pulso" (ping).
                 *
                 * `animate-ping` → anel externo que pulsa e desaparece
                 * O círculo interno fica fixo sobre o anel pulsante
                 *
                 * O `ring-2 ring-white` cria uma borda branca ao redor,
                 * separando visualmente a bolinha do avatar.
                 */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 ring-2 ring-white" />
                </span>
            </div>

            {/*
             * ─── INFORMAÇÕES DO USUÁRIO ───────────────────────────────────
             * `min-w-0` + `truncate` garantem que textos longos não quebrem o layout.
             * Sem isso, um nome muito longo empurraria os outros elementos.
             */}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">
                    {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    {user.role}
                </p>
                {/* Status atual (ex: "em reunião no Teams") */}
                <p className="text-xs text-[#6c63ff]/80 truncate mt-0.5">
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
                bg-white border border-gray-200 rounded-full
                text-sm font-semibold text-gray-700
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
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-[#c9deff]/30 transition-colors duration-200"
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
                bg-white border border-gray-200 rounded-2xl
                p-2 gap-1
                overflow-hidden transition-all duration-300
                ${isExpanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0 p-0 border-transparent pointer-events-none"}
            `}>
                {users.length === 0 ? (
                    // Estado vazio — nenhum usuário online
                    <p className="text-sm text-gray-400 text-center py-4">
                        Nenhum usuário ativo
                    </p>
                ) : (
                    users.map((user) => (
                        <UserItem
                            key={user.id}
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
                    ))
                )}
            </div>

            </aside>

            {selectedUser && (
                <div ref={popupRef}>
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
