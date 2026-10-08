import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowRight, BarChart3, BriefcaseBusiness, LayoutDashboard, UsersRound } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { frontRoutes } from "@/lib/routes";

interface PageProps {
    [key: string]: unknown;
    auth?: {
        user?: {
            name: string;
        } | null;
    };
}

const shortcuts = [
    {
        title: "Projetos",
        description: "Organize tarefas e acompanhe o andamento do trabalho.",
        href: frontRoutes.projetos,
        icon: BriefcaseBusiness,
        tone: "blue",
    },
    {
        title: "Equipe",
        description: "Encontre as pessoas e veja quem faz parte do time.",
        href: frontRoutes.equipe,
        icon: UsersRound,
        tone: "green",
    },
    {
        title: "Desempenho",
        description: "Acompanhe a evolução e os resultados da equipe.",
        href: frontRoutes.desempenho,
        icon: BarChart3,
        tone: "purple",
    },
] as const;

export default function Home() {
    const { auth } = usePage<PageProps>().props;
    const firstName = auth?.user?.name.trim().split(/\s+/)[0] || "por aqui";

    return (
        <>
            <Head title="Início" />
            <DashboardLayout currentPage="home">
                <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-10 py-8">
                    <section className="relative overflow-hidden rounded-3xl border border-(--cor-borda) bg-(--cor-widgets) px-7 py-10 shadow-sm sm:px-10 sm:py-12">
                        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-(--cor-accent)/10 blur-3xl" />
                        <div className="relative max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--cor-logo2)">
                                AivyPM · Seu espaço de trabalho
                            </p>
                            <h1 className="mt-5 text-4xl font-bold leading-tight text-(--cor-logo) sm:text-5xl">
                                Olá, {firstName}!
                            </h1>
                            <p className="mt-4 max-w-xl text-lg leading-relaxed text-(--cor-logo2)">
                                Tudo pronto para continuar. Escolha por onde começar e mantenha seu trabalho em movimento.
                            </p>
                            <Link
                                href={frontRoutes.projetos}
                                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-(--cor-accent) px-5 py-3 font-semibold text-white transition hover:brightness-95"
                            >
                                Ir para projetos
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </section>

                    <section aria-labelledby="atalhos-titulo">
                        <div className="mb-5">
                            <h2 id="atalhos-titulo" className="text-xl font-bold text-(--cor-logo)">
                                Acesso rápido
                            </h2>
                            <p className="mt-1 text-sm text-(--cor-logo2)">
                                Suas áreas principais, sem distrações.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {shortcuts.map(({ title, description, href, icon: Icon, tone }) => (
                                <Link
                                    key={title}
                                    href={href}
                                    className="group rounded-2xl border border-(--cor-borda) bg-(--cor-widgets) p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <span className={`inline-flex size-11 items-center justify-center rounded-xl ${
                                        tone === "blue"
                                            ? "bg-blue-500/10 text-blue-600"
                                            : tone === "green"
                                              ? "bg-emerald-500/10 text-emerald-600"
                                              : "bg-violet-500/10 text-violet-600"
                                    }`}>
                                        <Icon size={22} />
                                    </span>
                                    <span className="mt-5 flex items-center justify-between">
                                        <span className="text-lg font-bold text-(--cor-logo)">{title}</span>
                                        <ArrowRight size={18} className="text-(--cor-logo2) transition group-hover:translate-x-1" />
                                    </span>
                                    <span className="mt-2 block text-sm leading-relaxed text-(--cor-logo2)">
                                        {description}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <Link
                        href={frontRoutes.dashboard}
                        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-(--cor-logo2) transition hover:text-(--cor-accent)"
                    >
                        <LayoutDashboard size={17} />
                        Precisa de uma visão completa? Acesse o dashboard
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </DashboardLayout>
        </>
    );
}
