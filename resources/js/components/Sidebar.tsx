// =============================================================
// 📁 Sidebar.tsx
// =============================================================
// Componente de barra lateral navegável com:
//  - Animação de página ativa (círculo com cor-accent no ícone)
//  - Animação de abrir/fechar mostrando os nomes das páginas
//  - Botão de toggle no topo
//
// 💡 COMO USAR:
//   Importe e coloque no seu layout principal:
//   <Sidebar currentPage="dashboard" />
//
// 💡 DEPENDÊNCIAS NECESSÁRIAS:
//   npm install lucide-react
// =============================================================


import { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import {
    LayoutDashboard,
    BarChart2,
    ClipboardList,
    Users,
    Settings,
    Moon,
    Sun,
    Menu,
    X,
} from "lucide-react";

// TIPOS

type PageName = "dashboard" | "performance" | "tasks" | "team" | "settings";

interface SidebarProps {

    currentPage: PageName;
}

// ------------------------------------------------------------------
// CONFIGURAÇÃO DAS PÁGINAS
// ------------------------------------------------------------------
// Centralizamos aqui todos os itens de navegação.
// Para adicionar uma nova página: basta adicionar um novo objeto nessa lista!
const navItems = [
    { name: "dashboard"   as PageName, label: "Dashboard",  href: "/dashboard",  icon: <LayoutDashboard size={20} /> },
    { name: "performance" as PageName, label: "Desempenho", href: "/desempenho", icon: <BarChart2 size={20} /> },
    { name: "tasks"       as PageName, label: "Projetos",   href: "/projetos",   icon: <ClipboardList size={20} /> },
    { name: "team"        as PageName, label: "Equipe",     href: "/equipe",     icon: <Users size={20} /> },
];

// ------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ------------------------------------------------------------------
export default function Sidebar({ currentPage }: SidebarProps) {
    // `isOpen` controla se a sidebar está expandida (mostrando texto) ou colapsada (só ícones).
    // Começa fechada (false). Troque para `true` se quiser que inicie aberta.
    const [isOpen, setIsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        if (!isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // Carrega o tema salvo no localStorage ao montar o componente
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    return (
        <>
            {/*
             * ─── OVERLAY ESCURO (mobile) ─────────────────────────────────
             * No mobile, quando a sidebar abre, aparece um fundo escuro atrás
             * para dar foco na sidebar. Clicar nele fecha a sidebar.
             * No desktop (md:hidden) isso não aparece.
             */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/*
             * ─── SIDEBAR CONTAINER ───────────────────────────────────────
             * `w-16`  → largura colapsada (só ícones)
             * `w-56`  → largura expandida (ícones + textos)
             *
             * A transição `transition-all duration-300 ease-in-out` faz a
             * animação suave de abertura/fechamento.
             *
             * `overflow-hidden` garante que o texto não "vaze" durante a animação.
             */}
            <aside
                className={`
                    fixed top-0 left-0 h-full z-30
                    flex flex-col
                    bg-(--cor-secundaria)
                    transition-all duration-300 ease-in-out
                    overflow-hidden
                    ${isOpen ? "w-56" : "w-16"}
                `}
            >
                {/*
                 * ─── BOTÃO DE TOGGLE ─────────────────────────────────────
                 * Alterna entre abrir (Menu ☰) e fechar (X) a sidebar.
                 * `shrink-0` evita que o botão seja comprimido.
                 */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="
                        flex items-center justify-center
                        h-16 w-full shrink-0
                        text-gray-500 hover:text-gray-800
                        transition-colors duration-200
                        
                    "
                    aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
                >
                    {/* Troca o ícone dependendo do estado */}
                    {isOpen ? <X size={22} /> : <Menu size={22} />}
                </button>

                {/*
                 * ─── ITENS DE NAVEGAÇÃO ──────────────────────────────────
                 * `flex-1` faz essa seção crescer para ocupar o espaço disponível,
                 * empurrando os itens do rodapé para baixo.
                 */}
                <nav className="flex-1 flex flex-col gap-1 py-4 px-2">
                    {navItems.map((item) => {
                        // Verifica se este item é a página atual
                        const isActive = currentPage === item.name;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`
                                    relative
                                    flex items-center gap-3
                                    h-11 px-2 rounded-lg
                                    transition-colors duration-200
                                    whitespace-nowrap
                                    ${isActive
                                        ? "text-white"          // cor do texto ativo
                                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                    }
                                `}
                            >
                                {/*
                                 * ── CÍRCULO COM COR-ACCENT (página ativa) ──────────
                                 *
                                 * Quando `isActive` é true, renderizamos um círculo
                                 * colorido ao redor do ícone.
                                 *
                                 * Como funciona a animação:
                                 *  - `scale-0 opacity-0` → estado inicial (invisível, encolhido)
                                 *  - `scale-100 opacity-100` → estado ativo (visível, tamanho normal)
                                 *  - `transition-all duration-300` → anima entre os dois estados
                                 *
                                 * O wrapper `relative` no ícone permite usar `absolute` no círculo.
                                 */}
                                <span className="relative flex items-center justify-center w-8 h-8 shrink-0">
                                    {/* Círculo de fundo — só aparece na página ativa */}
                                    <span
                                        className={`
                                            absolute inset-0 rounded-full
                                            bg-(--cor-accent)
                                            transition-all duration-300
                                            ${isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"}
                                        `}
                                    />
                                    {/* Ícone em si — fica por cima do círculo */}
                                    <span className="relative z-10">
                                        {item.icon}
                                    </span>
                                </span>

                                {/*
                                 * ── LABEL (texto da página) ──────────────────────
                                 *
                                 * Como funciona a animação do texto:
                                 *  - `opacity-0 w-0`   → colapsado (invisível e sem largura)
                                 *  - `opacity-100 w-auto` → expandido (visível com largura natural)
                                 *  - `transition-all duration-300` → anima suavemente
                                 *
                                 * `overflow-hidden` e `whitespace-nowrap` evitam quebra de linha
                                 * durante a animação.
                                 */}
                                <span
                                    className={`
                                        text-sm font-medium
                                        overflow-hidden whitespace-nowrap
                                        transition-all duration-300
                                        ${isOpen ? "opacity-100 max-w-30" : "opacity-0 max-w-0"}
                                    `}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/*
                 * ─── RODAPÉ DA SIDEBAR ───────────────────────────────────
                 * Itens utilitários ficam fixados no fundo: modo escuro e configurações.
                 */}
                <div className="flex flex-col gap-1 py-4 px-2 border-t border-gray-100">
                    {/* Botão de modo escuro */}
                    <button
                        onClick={toggleDarkMode}
                        className="
                            flex items-center gap-3 h-11 px-2 rounded-lg
                            text-gray-500 hover:text-gray-800 hover:bg-gray-100
                            transition-colors duration-200
                            whitespace-nowrap
                        "
                    >
                        <span className="flex items-center justify-center w-8 h-8 shrink-0">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </span>
                        <span
                            className={`
                                text-sm font-medium overflow-hidden whitespace-nowrap
                                transition-all duration-300
                                ${isOpen ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0"}
                            `}
                        >
                            {isDarkMode ? "Modo Claro" : "Modo Escuro"}
                        </span>
                    </button>

                    {/* Link para configurações */}
                    <Link
                        href="/settings"
                        className={`
                            flex items-center gap-3 h-11 px-2 rounded-lg
                            transition-colors duration-200
                            whitespace-nowrap
                            ${currentPage === "settings"
                                ? "text-[#6c63ff]"
                                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                            }
                        `}
                    >
                        <span className="relative flex items-center justify-center w-8 h-8 shrink-0">
                            <span
                                className={`
                                    absolute inset-0 rounded-full bg-[#6c63ff]/15
                                    transition-all duration-300
                                    ${currentPage === "settings" ? "scale-100 opacity-100" : "scale-0 opacity-0"}
                                `}
                            />
                            <span className="relative z-10">
                                <Settings size={20} />
                            </span>
                        </span>
                        <span
                            className={`
                                text-sm font-medium overflow-hidden whitespace-nowrap
                                transition-all duration-300
                                ${isOpen ? "opacity-100 max-w-30" : "opacity-0 max-w-0"}
                            `}
                        >
                            Configurações
                        </span>
                    </Link>
                </div>
            </aside>

            {/*
             * ─── ESPAÇADOR ───────────────────────────────────────────────
             * Este div "empurra" o conteúdo da página para a direita,
             * deixando espaço para a sidebar fixa.
             *
             * Ele acompanha a mesma largura da sidebar com a mesma transição.
             */}
            <div
                className={`
                    shrink-0 transition-all duration-300 ease-in-out
                    ${isOpen ? "w-56" : "w-16"}
                `}
            />
        </>
    );
}
