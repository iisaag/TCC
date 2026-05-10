import DashboardLayout from "@/layouts/DashboardLayout";
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    Clock,
    Download,
    FolderOpen,
    TrendingDown,
    TrendingUp,
    UserX,
    Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface Kpis {
    projetos_ativos: number;
    projetos_em_risco: number;
    tarefas_pendentes: number;
    tarefas_atrasadas: number;
    tarefas_concluidas: number;
    progresso_medio: number;
}

interface ProjetoSaude {
    id: number;
    nome: string;
    progresso: number;
    prazo: string | null;
    responsavel: string | null;
    status: "EM_DIA" | "EM_RISCO" | "ATRASADO";
}

interface EvolucaoPonto {
    semana: string;
    concluidas: number;
    criadas: number;
}

interface ProdutividadePonto {
    equipe: string;
    concluidas: number;
}

interface DistribuicaoPonto {
    status: string;
    valor: number;
}

interface Alerta {
    tipo: string;
    titulo: string;
    mensagem: string;
    nivel: "danger" | "warning" | "info";
}

interface TarefaResumo {
    titulo: string;
    projeto: string;
    responsavel?: string;
    prazo?: string | null;
}

interface TarefaSemResp {
    titulo: string;
    projeto: string;
}

interface ResumoOperacional {
    atrasadas: TarefaResumo[];
    vencendo_7dias: TarefaResumo[];
    sem_responsavel: TarefaSemResp[];
}

interface DashboardData {
    kpis: Kpis;
    saude_projetos: ProjetoSaude[];
    evolucao_semanal: EvolucaoPonto[];
    produtividade_equipe: ProdutividadePonto[];
    distribuicao_status: DistribuicaoPonto[];
    alertas: Alerta[];
    resumo_operacional: ResumoOperacional;
}

// ---------------------------------------------------------------------------
// CONSTANTES DE ESTILO
// ---------------------------------------------------------------------------

const DONUT_COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899"];

const PERIODO_OPTIONS = [
    { label: "7 dias", value: 7 },
    { label: "30 dias", value: 30 },
    { label: "Trimestre", value: 90 },
];

// Paleta de cores para avatares gerados por nome
const AVATAR_PALETTE = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
    "#22c55e", "#14b8a6", "#f59e0b", "#ef4444",
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function formatDate(date: string | null | undefined): string {
    if (!date) return "-";
    const d = new Date(date.includes("T") ? date : date + "T00:00:00");
    return d.toLocaleDateString("pt-BR");
}

function formatDateShort(date: string | null | undefined): string {
    if (!date) return "-";
    const d = new Date(date.includes("T") ? date : date + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function statusLabel(s: ProjetoSaude["status"]): { label: string; color: string; bg: string; icon: React.ReactNode } {
    switch (s) {
        case "ATRASADO":
            return { label: "Atrasado", color: "#ef4444", bg: "#fef2f2", icon: <AlertTriangle size={12} /> };
        case "EM_RISCO":
            return { label: "Em risco", color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={12} /> };
        default:
            return { label: "No prazo", color: "#22c55e", bg: "#f0fdf4", icon: <CheckCircle2 size={12} /> };
    }
}

function progressColor(p: number): string {
    if (p >= 75) return "#22c55e";
    if (p >= 40) return "#f59e0b";
    return "#ef4444";
}

function avatarColor(name: string | null | undefined): string {
    if (!name) return "#94a3b8";
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string | null | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function alertIcon(nivel: Alerta["nivel"]) {
    if (nivel === "danger") return <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "#ef4444" }} />;
    if (nivel === "warning") return <TrendingDown size={16} className="mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />;
    return <Users size={16} className="mt-0.5 shrink-0" style={{ color: "#3b82f6" }} />;
}

function alertStyle(nivel: Alerta["nivel"]) {
    if (nivel === "danger") {
        return {
            bg: "color-mix(in srgb, var(--cor-atrasoI) 10%, var(--cor-widgets))",
            border: "color-mix(in srgb, var(--cor-atrasoI) 32%, var(--cor-borda))",
            title: "var(--cor-atrasoII)",
            text: "var(--cor-atrasoI)",
        };
    }
    if (nivel === "warning") {
        return {
            bg: "color-mix(in srgb, var(--cor-ausente) 14%, var(--cor-widgets))",
            border: "color-mix(in srgb, var(--cor-ausente) 36%, var(--cor-borda))",
            title: "var(--cor-logo)",
            text: "var(--cor-logo2)",
        };
    }
    return {
        bg: "color-mix(in srgb, var(--cor-accent) 12%, var(--cor-widgets))",
        border: "color-mix(in srgb, var(--cor-accent) 34%, var(--cor-borda))",
        title: "var(--cor-logo)",
        text: "var(--cor-logo2)",
    };
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------------------

/** Card KPI com ícone em bloco colorido à direita */
function KpiCard({
    icon,
    label,
    value,
    trend,
    trendUp,
    iconBg,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    iconBg: string;
}) {
    return (
        <div className="dashboard-print-card group flex items-start justify-between gap-3 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ background: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}>
            <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold" style={{ color: "var(--cor-logo2)" }}>{label}</span>
                <span className="text-4xl font-bold" style={{ color: "var(--cor-logo)" }}>{value}</span>
                {trend && (
                    <span
                        className="flex items-center gap-1 text-sm font-semibold"
                        style={{ color: trendUp ? "#22c55e" : "#ef4444" }}
                    >
                        {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {trend}
                    </span>
                )}
            </div>
            <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:scale-105"
                style={{ background: iconBg }}
            >
                {icon}
            </div>
        </div>
    );
}

/** Card de seção branco com título */
function SectionCard({ title, children, noPad }: { title?: string; children: React.ReactNode; noPad?: boolean }) {
    return (
        <div className="dashboard-print-card rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ background: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}>
            {title && (
                <div className="border-b px-6 py-4" style={{ borderColor: "var(--cor-borda)" }}>
                    <h2 className="text-base font-bold" style={{ color: "var(--cor-logo)" }}>{title}</h2>
                </div>
            )}
            <div className={noPad ? "" : "p-6"}>{children}</div>
        </div>
    );
}

/** Avatar circular com iniciais */
function Avatar({ name, size = 32 }: { name: string | null | undefined; size?: number }) {
    return (
        <div
            className="flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.35 }}
        >
            {initials(name)}
        </div>
    );
}

/** Dropdown simples de filtro */
function SelectFilter({
    value,
    options,
    onChange,
    icon,
}: {
    value: string;
    options: { label: string; value: string | number }[];
    onChange: (v: string) => void;
    icon?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        const handleOutsideClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);

        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [open]);

    const selected = options.find((o) => String(o.value) === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="relative flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-base font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: "var(--cor-borda)", background: "var(--cor-botao)", color: "var(--cor-logo)" }}
            >
                {icon}
                <span>{selected?.label ?? "Selecione"}</span>
                <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-2.5"
                    style={{
                        color: "var(--cor-logo2)",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                    }}
                />
            </button>

            {open && (
                <div
                    className="absolute right-0 z-[200] mt-1 w-full overflow-hidden rounded-xl border shadow-xl"
                    style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}
                >
                    {options.map((o) => {
                        const isActive = String(o.value) === value;

                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => {
                                    onChange(String(o.value));
                                    setOpen(false);
                                }}
                                className="w-full px-3.5 py-2.5 text-left text-base transition-colors"
                                style={{
                                    color: "var(--cor-logo)",
                                    backgroundColor: isActive ? "var(--cor-botao)" : "transparent",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = "var(--cor-fundo)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                }}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// PÁGINA PRINCIPAL
// ---------------------------------------------------------------------------

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dias, setDias] = useState(30);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/dashboard?dias=${dias}`)
            .then((r) => r.json())
            .then((json) => {
                if (json.success) setData(json.data as DashboardData);
                else setError(json.message ?? "Erro desconhecido");
            })
            .catch(() => setError("Falha ao conectar com o servidor"))
            .finally(() => setLoading(false));
    }, [dias]);

    useEffect(() => {
        const handleBeforePrint = () => {
            setIsPrinting(true);
            window.dispatchEvent(new Event("resize"));
        };

        const handleAfterPrint = () => {
            setIsPrinting(false);
            window.dispatchEvent(new Event("resize"));
        };

        window.addEventListener("beforeprint", handleBeforePrint);
        window.addEventListener("afterprint", handleAfterPrint);

        return () => {
            window.removeEventListener("beforeprint", handleBeforePrint);
            window.removeEventListener("afterprint", handleAfterPrint);
        };
    }, []);

    const handleExportPdf = () => {
        setIsPrinting(true);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event("resize"));
                window.print();
            });
        });
    };

    return (
        <DashboardLayout currentPage="dashboard">
            {/* fundo levemente azulado como nas imagens */}
            <div className="dashboard-print-root min-h-full" style={{ background: "linear-gradient(180deg, #eef4fb 0%, #f7fafe 35%, #f1f5fb 100%)" }}>
                <div className="flex flex-col gap-6 pb-12">

                    {/* ── HEADER ── */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                        <h1 className="text-4xl" style={{ color: "var(--cor-logo)" }}>Dashboard</h1>
                            <p className="text-lg" style={{ color: "var(--cor-logo2)" }}>Visão estratégica e resumo operacional</p>
                        </div>

                        <div className="dashboard-print-actions flex items-center gap-3">
                            <button
                                className="flex h-10 items-center gap-2 rounded-xl border px-4 text-base font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:opacity-95"
                                style={{ background: "var(--cor-botao)", borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                onClick={handleExportPdf}
                            >
                                <Download size={16} />
                                Exportar dados
                            </button>
                            <SelectFilter
                                icon={<CalendarClock size={16} style={{ color: "var(--cor-logo2)" }} />}
                                value={String(dias)}
                                options={PERIODO_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                                onChange={(v) => setDias(Number(v))}
                            />
                        </div>
                    </div>

                    {loading && (
                        <div className="flex h-40 items-center justify-center" style={{ color: "var(--cor-logo2)" }}>
                            Carregando dados...
                        </div>
                    )}
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* ── KPI CARDS ── */}
                            <div className="dashboard-print-kpis grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                                <KpiCard
                                    label="Projetos Ativos"
                                    value={data.kpis.projetos_ativos}
                                    icon={<FolderOpen size={20} />}
                                    iconBg="#3b82f6"
                                    trendUp
                                    trend="8.3%"
                                />
                                <KpiCard
                                    label="Projetos em Risco"
                                    value={data.kpis.projetos_em_risco}
                                    icon={<AlertTriangle size={20} />}
                                    iconBg="#6366f1"
                                    trendUp={false}
                                    trend="15.2%"
                                />
                                <KpiCard
                                    label="Tarefas Pendentes"
                                    value={data.kpis.tarefas_pendentes}
                                    icon={<Clock size={20} />}
                                    iconBg="#0ea5e9"
                                    trendUp={false}
                                    trend="5.1%"
                                />
                                <KpiCard
                                    label="Tarefas Atrasadas"
                                    value={data.kpis.tarefas_atrasadas}
                                    icon={<AlertTriangle size={20} />}
                                    iconBg="#14b8a6"
                                    trendUp
                                    trend="12.5%"
                                />
                                <KpiCard
                                    label={`Concluídas (${dias}d)`}
                                    value={data.kpis.tarefas_concluidas}
                                    icon={<CheckCircle2 size={20} />}
                                    iconBg="#22c55e"
                                    trendUp
                                    trend="22.8%"
                                />
                                <KpiCard
                                    label="Progresso Médio"
                                    value={`${data.kpis.progresso_medio}%`}
                                    icon={<TrendingUp size={20} />}
                                    iconBg="#8b5cf6"
                                    trendUp
                                    trend="6.2%"
                                />
                            </div>

                            {/* ── SAÚDE DOS PROJETOS ── */}
                            <SectionCard>
                                <h3 className="mb-3 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>
                                    Saúde dos Projetos
                                </h3>
                                {data.saude_projetos.length === 0 ? (
                                    <p className="text-base" style={{ color: "var(--cor-logo2)" }}>Nenhum projeto ativo encontrado.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-base">
                                            <thead>
                                                <tr className="border-b text-left text-sm uppercase tracking-wide" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}>
                                                    <th className="pb-3 font-semibold">Projeto</th>
                                                    <th className="pb-3 font-semibold">Progresso</th>
                                                    <th className="pb-3 font-semibold">Prazo</th>
                                                    <th className="pb-3 font-semibold">Responsável</th>
                                                    <th className="pb-3 font-semibold">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.saude_projetos.map((p) => {
                                                    const st = statusLabel(p.status);
                                                    return (
                                                        <tr
                                                            key={p.id}
                                                            className="border-b transition-colors duration-200 hover:bg-white/60 last:border-0"
                                                            style={{ borderColor: "var(--cor-borda)" }}
                                                        >
                                                            <td className="py-3 font-semibold" style={{ color: "var(--cor-logo)" }}>
                                                                {p.nome}
                                                            </td>
                                                            <td className="py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-28 overflow-hidden rounded-full" style={{ background: "var(--cor-borda)" }}>
                                                                        <div
                                                                            className="h-full rounded-full"
                                                                            style={{
                                                                                width: `${p.progresso}%`,
                                                                                background: progressColor(p.progresso),
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-sm font-semibold" style={{ color: "var(--cor-logo)" }}>
                                                                        {p.progresso}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3" style={{ color: "var(--cor-logo)" }}>
                                                                {formatDate(p.prazo)}
                                                            </td>
                                                            <td className="py-3">
                                                                {p.responsavel ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar name={p.responsavel} size={30} />
                                                                        <span style={{ color: "var(--cor-logo)" }}>
                                                                            {p.responsavel}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ color: "var(--cor-logo2)" }}>—</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3">
                                                                <span
                                                                    className="flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold"
                                                                    style={{ background: st.bg, color: st.color }}
                                                                >
                                                                    {st.icon}
                                                                    {st.label}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </SectionCard>

                            {/* ── GRÁFICOS ── */}
                            <div className={isPrinting ? "grid grid-cols-1 gap-4" : "dashboard-print-chart-grid grid grid-cols-1 gap-4 lg:grid-cols-3"}>
                                {/* Evolução de Tarefas */}
                                <SectionCard>
                                    <h3 className="mb-3 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>
                                        Evolução de Tarefas
                                    </h3>
                                    {isPrinting ? (
                                        <LineChart width={720} height={260} data={data.evolucao_semanal}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: "#7c3aed" }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="criadas" name="Criadas" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4, fill: "#a78bfa" }} strokeDasharray="4 2" />
                                        </LineChart>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <LineChart data={data.evolucao_semanal}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                                <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: "#7c3aed" }} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="criadas" name="Criadas" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4, fill: "#a78bfa" }} strokeDasharray="4 2" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </SectionCard>

                                {/* Produtividade por Equipe */}
                                <SectionCard>
                                    <h3 className="mb-3 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>
                                        Produtividade por Equipe
                                    </h3>
                                    {data.produtividade_equipe.length === 0 ? (
                                        <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>Sem dados de produtividade.</p>
                                    ) : (
                                        isPrinting ? (
                                            <BarChart width={720} height={260} data={data.produtividade_equipe} barSize={28}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="equipe" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                                                <Bar dataKey="concluidas" name="Concluídas" fill="#f97316" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={data.produtividade_equipe} barSize={28}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                    <XAxis dataKey="equipe" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                                                    <Bar dataKey="concluidas" name="Concluídas" fill="#f97316" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )
                                    )}
                                </SectionCard>

                                {/* Distribuição por Status */}
                                <SectionCard>
                                    <h3 className="mb-3 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>
                                        Distribuição de Tarefas
                                    </h3>
                                    {isPrinting ? (
                                        <PieChart width={720} height={280}>
                                            <Pie
                                                data={data.distribuicao_status}
                                                dataKey="valor"
                                                nameKey="status"
                                                cx={280}
                                                cy={110}
                                                innerRadius={58}
                                                outerRadius={85}
                                                paddingAngle={3}
                                            >
                                                {data.distribuicao_status.map((_, idx) => (
                                                    <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                                            <Legend
                                                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                                formatter={(value) => (
                                                    <span style={{ fontSize: 11, color: "#475569" }}>{value}</span>
                                                )}
                                            />
                                        </PieChart>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={data.distribuicao_status}
                                                    dataKey="valor"
                                                    nameKey="status"
                                                    cx="50%"
                                                    cy="45%"
                                                    innerRadius={58}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                >
                                                    {data.distribuicao_status.map((_, idx) => (
                                                        <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                                                <Legend
                                                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                                    formatter={(value) => (
                                                        <span style={{ fontSize: 11, color: "#475569" }}>{value}</span>
                                                    )}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </SectionCard>
                            </div>

                            {/* ── ALERTAS INTELIGENTES ── */}
                            {data.alertas.length > 0 && (
                                <div
                                    className="dashboard-print-card rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.9)",
                                        border: "1px solid var(--cor-borda)",
                                    }}
                                >
                                    <h2 className="mb-4 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>
                                        Alertas Inteligentes
                                    </h2>
                                    <div className="flex flex-col gap-3">
                                        {data.alertas.map((a, i) => {
                                            const s = alertStyle(a.nivel);
                                            return (
                                                <div
                                                    key={i}
                                                    className="dashboard-print-alert flex items-start gap-3 rounded-xl border px-5 py-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                                                    style={{
                                                        background: s.bg,
                                                        borderColor: s.border,
                                                        boxShadow: "0 6px 18px rgba(23, 62, 91, 0.06)",
                                                    }}
                                                >
                                                    {alertIcon(a.nivel)}
                                                    <div>
                                                        <p className="text-base font-bold" style={{ color: s.title }}>
                                                            {a.titulo}
                                                        </p>
                                                        <p className="text-sm" style={{ color: s.text }}>
                                                            {a.mensagem}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── RESUMO OPERACIONAL ── */}
                            <div>
                                <h2 className="mb-3 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>Resumo Operacional</h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                                    {/* Atrasadas */}
                                    <div
                                        className="dashboard-print-summary-card overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        style={{
                                            background: "var(--cor-widgets)",
                                            border: "1px solid var(--cor-borda)",
                                            borderLeft: "4px solid var(--cor-atrasoI)",
                                            boxShadow: "0 12px 24px rgba(23, 62, 91, 0.12)",
                                        }}
                                    >
                                        <div className="px-6 pb-3 pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm" style={{ background: "var(--cor-atrasoI)" }}>
                                                    <AlertTriangle size={16} style={{ color: "#fff" }} />
                                                </div>
                                                <span className="text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>Tarefas Atrasadas</span>
                                            </div>
                                        </div>
                                        <div className="px-6 pb-3">
                                            {data.resumo_operacional.atrasadas.length === 0 ? (
                                                <p className="py-4 text-base" style={{ color: "var(--cor-logo2)" }}>Nenhuma tarefa atrasada 🎉</p>
                                            ) : (
                                                data.resumo_operacional.atrasadas.map((t, i) => (
                                                    <div key={i} className="border-b py-3 last:border-0" style={{ borderColor: "var(--cor-borda)" }}>
                                                        <p className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>{t.titulo}</p>
                                                        <p className="text-sm" style={{ color: "var(--cor-atrasoI)" }}>{t.projeto}</p>
                                                        <div className="mt-1 flex items-center justify-between">
                                                            <span className="text-sm" style={{ color: "var(--cor-logo2)" }}>{t.responsavel}</span>
                                                            <span
                                                                className="rounded-lg px-2.5 py-0.5 text-base font-bold"
                                                                style={{
                                                                    background: "color-mix(in srgb, var(--cor-atrasoI) 22%, var(--cor-widgets))",
                                                                    color: "var(--cor-atrasoII)",
                                                                }}
                                                            >
                                                                {formatDateShort(t.prazo)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Vencendo em 7 dias */}
                                    <div
                                        className="dashboard-print-summary-card overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        style={{
                                            background: "var(--cor-widgets)",
                                            border: "1px solid var(--cor-borda)",
                                            borderLeft: "4px solid var(--cor-ausente)",
                                            boxShadow: "0 12px 24px rgba(23, 62, 91, 0.12)",
                                        }}
                                    >
                                        <div className="px-6 pb-3 pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm" style={{ background: "var(--cor-ausente)" }}>
                                                    <CalendarClock size={16} style={{ color: "#fff" }} />
                                                </div>
                                                <span className="text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>Vencendo em 7 dias</span>
                                            </div>
                                        </div>
                                        <div className="px-6 pb-3">
                                            {data.resumo_operacional.vencendo_7dias.length === 0 ? (
                                                <p className="py-4 text-base" style={{ color: "var(--cor-logo2)" }}>Nenhuma tarefa vencendo em breve.</p>
                                            ) : (
                                                data.resumo_operacional.vencendo_7dias.map((t, i) => (
                                                    <div key={i} className="border-b py-3 last:border-0" style={{ borderColor: "var(--cor-borda)" }}>
                                                        <p className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>{t.titulo}</p>
                                                        <p className="text-sm" style={{ color: "var(--cor-ausente)" }}>{t.projeto}</p>
                                                        <div className="mt-1 flex items-center justify-between">
                                                            <span className="text-sm" style={{ color: "var(--cor-logo2)" }}>{t.responsavel}</span>
                                                            <span
                                                                className="rounded-lg px-2.5 py-0.5 text-base font-bold"
                                                                style={{
                                                                    background: "color-mix(in srgb, var(--cor-ausente) 22%, var(--cor-widgets))",
                                                                    color: "var(--cor-logo)",
                                                                }}
                                                            >
                                                                {formatDateShort(t.prazo)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Sem Responsável */}
                                    <div
                                        className="dashboard-print-summary-card overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        style={{
                                            background: "var(--cor-widgets)",
                                            border: "1px solid var(--cor-borda)",
                                            borderLeft: "4px solid var(--cor-offline)",
                                            boxShadow: "0 12px 24px rgba(23, 62, 91, 0.12)",
                                        }}
                                    >
                                        <div className="px-6 pb-3 pt-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm" style={{ background: "var(--cor-offline)" }}>
                                                    <UserX size={16} style={{ color: "#f8fafc" }} />
                                                </div>
                                                <span className="text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>Sem Responsável</span>
                                            </div>
                                        </div>
                                        <div className="px-6 pb-3">
                                            {data.resumo_operacional.sem_responsavel.length === 0 ? (
                                                <p className="py-4 text-base" style={{ color: "var(--cor-logo2)" }}>Todas as tarefas têm responsável.</p>
                                            ) : (
                                                data.resumo_operacional.sem_responsavel.map((t, i) => (
                                                    <div key={i} className="border-b py-3 last:border-0" style={{ borderColor: "var(--cor-borda)" }}>
                                                        <p className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>{t.titulo}</p>
                                                        <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>{t.projeto}</p>
                                                        <span
                                                            className="mt-1.5 inline-block rounded-lg px-2.5 py-0.5 text-base font-semibold"
                                                            style={{
                                                                background: "color-mix(in srgb, var(--cor-offline) 20%, var(--cor-widgets))",
                                                                color: "var(--cor-logo2)",
                                                            }}
                                                        >
                                                            Aguardando atribuição
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
