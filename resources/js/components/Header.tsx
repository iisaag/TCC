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

import { Bell, Search } from "lucide-react";

// ------------------------------------------------------------------
// TIPOS
// ------------------------------------------------------------------
interface User {
    name: string;       // Ex: "Isabelli Arantes"
    role: string;       // Ex: "Chefe - Design & Front"
    avatar?: string;    // URL da foto. Se não tiver, mostra as iniciais.
}

interface HeaderProps {
    user: User;
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
            bg-white border-b border-gray-200
        ">
            {/*
             * ─── LOGO + SAUDAÇÃO ─────────────────────────────────────────
             * Bloco da esquerda: logo da aplicação e saudação ao usuário.
             * `shrink-0` evita que o bloco seja comprimido em telas menores.
             */}
            <div className="flex flex-col shrink-0">
                {/* Nome do sistema — destaque em roxo */}
                <span className="text-[#6c63ff] font-bold text-lg leading-tight tracking-tight">
                    AivyPM
                </span>
                {/* Saudação personalizada */}
                <span className="text-gray-700 text-sm font-medium">
                    Olá, {user.name.split(" ")[0]}! 👋
                </span>
            </div>

            {/*
             * ─── CAMPO DE BUSCA ──────────────────────────────────────────
             * `flex-1` faz o campo crescer e ocupar o espaço disponível no centro.
             * `max-w-xl` limita o tamanho máximo para não ficar enorme em telas grandes.
             */}
            <div className="flex-1 flex justify-center">
                <div className="relative w-full max-w-xl">
                    {/*
                     * Ícone de lupa posicionado absolutamente dentro do campo.
                     * `pointer-events-none` garante que o ícone não intercepte cliques.
                     */}
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Pesquisar projetos, metas, pessoas..."
                        className="
                            w-full
                            pl-9 pr-4 py-2
                            text-sm text-gray-700
                            bg-gray-100 rounded-full
                            border border-transparent
                            focus:outline-none focus:border-[#6c63ff]/40 focus:bg-white
                            transition-colors duration-200
                            placeholder:text-gray-400
                        "
                    />
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
                <button className="
                    relative
                    flex items-center justify-center
                    w-9 h-9 rounded-full
                    text-gray-500 hover:text-gray-800 hover:bg-gray-100
                    transition-colors duration-200
                ">
                    <Bell size={18} />
                    {/* Ponto vermelho de notificação não lida */}
                    <span className="
                        absolute top-1.5 right-1.5
                        w-2 h-2 rounded-full
                        bg-red-500
                        ring-2 ring-white
                    " />
                </button>

                {/*
                 * ── INFO DO USUÁRIO ──────────────────────────────────────
                 * Texto com nome e cargo. Oculto em telas muito pequenas (`hidden sm:flex`).
                 */}
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-800 leading-tight">
                        {user.name}
                    </span>
                    <span className="text-xs text-gray-500">
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
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6c63ff]/30"
                    />
                ) : (
                    <div className="
                        w-9 h-9 rounded-full
                        bg-[#6c63ff] text-white
                        flex items-center justify-center
                        text-sm font-bold
                        ring-2 ring-[#6c63ff]/30
                    ">
                        {getInitials(user.name)}
                    </div>
                )}
            </div>
        </header>
    );
}
