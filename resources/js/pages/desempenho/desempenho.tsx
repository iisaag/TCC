import DashboardLayout from "@/layouts/DashboardLayout";
import { apiRoutes } from "@/lib/routes";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Download, ChevronDown, Search, X } from "lucide-react";
import {
    Area,
    AreaChart,
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

type BoardStatus = "TO_DO" | "DOING" | "TESTE" | "APROVADO";

interface TarefaApi {
    id_tarefa: number;
    id_projeto?: number | null;
    prioridade_task?: string | null;
    tipo_task?: string | null;
    data_inicio?: string | null;
    data_prevista_termino?: string | null;
    prazo?: string | null;
    progresso?: number | null;
    bloqueada?: boolean | null;
    status_task?: string | null;
}

interface ProjetoApi {
    id_projeto: number;
    nome_projeto: string;
}

interface ApiEnvelope<T> {
    data?: T;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function normalizeStatus(status?: string | null): BoardStatus {
    const value = (status ?? "").toUpperCase().trim();

    if (["DOING", "EM ANDAMENTO"].includes(value)) {
        return "DOING";
    }

    if (["TESTE", "EM TESTE", "REVIEW"].includes(value)) {
        return "TESTE";
    }

    if (["APROVADO", "CONCLUIDA", "CONCLUÍDA", "DONE"].includes(value)) {
        return "APROVADO";
    }

    return "TO_DO";
}

function normalizePriority(priority?: string | null): "BAIXA" | "MEDIA" | "ALTA" | "CRITICA" {
    const raw = (priority ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();

    if (raw.includes("CRIT")) {
        return "CRITICA";
    }

    if (raw.includes("ALTA")) {
        return "ALTA";
    }

    if (raw.includes("BAIXA")) {
        return "BAIXA";
    }

    return "MEDIA";
}

function normalizeType(type?: string | null): "FRONT" | "BACK" | "FULLSTACK" {
    const raw = (type ?? "").toUpperCase().trim();

    if (raw.includes("FULL")) {
        return "FULLSTACK";
    }

    if (raw.includes("BACK")) {
        return "BACK";
    }

    return "FRONT";
}

function displayWithoutAccents(value?: string | null): string {
    return (value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\bSistem(?:a|o|u)?\b/gi, "Sistema")
        .replace(/\bGest(?:a|u)?o\b/gi, "Gestao")
        .replace(/\s+/g, " ")
        .trim();
}

function parseDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function taskMonthIndex(task: TarefaApi): number {
    const date = parseDate(task.data_inicio) ?? parseDate(task.data_prevista_termino) ?? parseDate(task.prazo) ?? new Date();
    return date.getMonth();
}

function formatNumericTooltip(
    value: string | number | null | undefined | readonly (string | number)[],
    locale = "pt-BR",
): string {
    if (Array.isArray(value)) {
        return value.map((item) => formatNumericTooltip(item, locale)).join(" / ");
    }

    if (typeof value === "number") {
        return value.toLocaleString(locale);
    }

    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced.toLocaleString(locale) : "0";
}

function ChartCard({
    title,
    children,
    className,
}: {
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-2xl border p-4 shadow-sm ${className ?? ""}`}
            style={{
                borderColor: "var(--cor-borda)",
                backgroundColor: "var(--cor-widgets)",
            }}
        >
            {title ? (
                <h2 className="mb-2 text-center text-sm tracking-wide" style={{ color: "var(--cor-textoI)" }}>
                    {title}
                </h2>
            ) : null}
            {children}
        </section>
    );
}

export default function Desempenho() {
    const [tarefas, setTarefas] = useState<TarefaApi[]>([]);
    const [projetos, setProjetos] = useState<ProjetoApi[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProjetoId, setSelectedProjetoId] = useState<number | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);

            try {
                const [tarefasResponse, projetosResponse] = await Promise.all([
                    fetch(apiRoutes.tarefas, { headers: { Accept: "application/json" } }),
                    fetch(apiRoutes.projetos, { headers: { Accept: "application/json" } }),
                ]);

                const tarefasPayload = (await tarefasResponse.json()) as ApiEnvelope<{ tarefas?: TarefaApi[] }>;
                const projetosPayload = (await projetosResponse.json()) as ApiEnvelope<{ projetos?: ProjetoApi[] }>;

                setTarefas(tarefasPayload.data?.tarefas ?? []);
                setProjetos(projetosPayload.data?.projetos ?? []);
            } catch {
                setTarefas([]);
                setProjetos([]);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchDashboardData();
    }, []);

    const tarefasFiltradas = useMemo(() => {
        if (!selectedProjetoId) {
            return tarefas;
        }
        return tarefas.filter(t => Number(t.id_projeto) === selectedProjetoId);
    }, [tarefas, selectedProjetoId]);

    const projetoFiltrado = projetos.find(p => p.id_projeto === selectedProjetoId);

    const projetosOrdenados = useMemo(() => {
        return projetos
            .filter(p => 
                displayWithoutAccents(p.nome_projeto).toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => displayWithoutAccents(a.nome_projeto).localeCompare(displayWithoutAccents(b.nome_projeto)));
    }, [projetos, searchTerm]);

    const lineData = useMemo(() => {
        const base = MONTH_LABELS.map((mes) => ({ mes, total: 0, front: 0, back: 0, fullstack: 0 }));

        tarefasFiltradas.forEach((task) => {
            const monthIndex = taskMonthIndex(task);
            const row = base[monthIndex];
            row.total += 1;

            const type = normalizeType(task.tipo_task);
            if (type === "FRONT") {
                row.front += 1;
            } else if (type === "BACK") {
                row.back += 1;
            } else {
                row.fullstack += 1;
            }
        });

        return base;
    }, [tarefasFiltradas]);

    const areaData = useMemo(() => {
        const base = MONTH_LABELS.map((mes) => ({ mes, baixa: 0, media: 0, alta: 0, critica: 0 }));

        tarefasFiltradas.forEach((task) => {
            const monthIndex = taskMonthIndex(task);
            const row = base[monthIndex];
            const priority = normalizePriority(task.prioridade_task);

            if (priority === "BAIXA") {
                row.baixa += 1;
            } else if (priority === "MEDIA") {
                row.media += 1;
            } else if (priority === "ALTA") {
                row.alta += 1;
            } else {
                row.critica += 1;
            }
        });

        return base;
    }, [tarefasFiltradas]);

    const pieData = useMemo(() => {
        const counts = {
            toDo: 0,
            doing: 0,
            teste: 0,
            aprovado: 0,
            bloqueadas: 0,
        };

        tarefasFiltradas.forEach((task) => {
            const status = normalizeStatus(task.status_task);
            if (status === "TO_DO") {
                counts.toDo += 1;
            } else if (status === "DOING") {
                counts.doing += 1;
            } else if (status === "TESTE") {
                counts.teste += 1;
            } else {
                counts.aprovado += 1;
            }

            if (task.bloqueada) {
                counts.bloqueadas += 1;
            }
        });

        return [
            { nome: "To Do", valor: counts.toDo, cor: "#f4c04f" },
            { nome: "Doing", valor: counts.doing, cor: "#46d5be" },
            { nome: "Teste", valor: counts.teste, cor: "#39a4f8" },
            { nome: "Aprovado", valor: counts.aprovado, cor: "#6fae5a" },
            { nome: "Bloqueadas", valor: counts.bloqueadas, cor: "#ec6f86" },
        ].filter((item) => item.valor > 0);
    }, [tarefasFiltradas]);

    const barData = useMemo(() => {
        if (selectedProjetoId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const atrasadas = tarefasFiltradas.filter((task) => {
                const dueDate = parseDate(task.data_prevista_termino) ?? parseDate(task.prazo);
                const isDone = normalizeStatus(task.status_task) === "APROVADO";
                return Boolean(dueDate && dueDate < today && !isDone);
            }).length;

            const emDia = tarefasFiltradas.length - atrasadas;

            return [{ projeto: projetoFiltrado?.nome_projeto ?? "Projeto", atrasadas, emDia }];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const grouped = new Map<string, { projeto: string; atrasadas: number; emDia: number }>();

        tarefasFiltradas.forEach((task) => {
            const key = task.id_projeto ? String(task.id_projeto) : "sem-projeto";
            const nomeProjeto = task.id_projeto ? (projetos.find(p => p.id_projeto === task.id_projeto)?.nome_projeto ?? `Projeto ${task.id_projeto}`) : "Sem projeto";

            if (!grouped.has(key)) {
                grouped.set(key, { projeto: nomeProjeto, atrasadas: 0, emDia: 0 });
            }

            const row = grouped.get(key);
            if (!row) {
                return;
            }

            const dueDate = parseDate(task.data_prevista_termino) ?? parseDate(task.prazo);
            const isDone = normalizeStatus(task.status_task) === "APROVADO";
            const isLate = Boolean(dueDate && dueDate < today && !isDone);

            if (isLate) {
                row.atrasadas += 1;
            } else {
                row.emDia += 1;
            }
        });

        return Array.from(grouped.values()).slice(0, 8);
    }, [tarefasFiltradas, selectedProjetoId, projetos, projetoFiltrado]);

    const kpisExecutivos = useMemo(() => {
        const total = tarefasFiltradas.length;
        const atrasadas = tarefasFiltradas.filter((task) => {
            const dueDate = parseDate(task.data_prevista_termino) ?? parseDate(task.prazo);
            const isDone = normalizeStatus(task.status_task) === "APROVADO";

            if (!dueDate || isDone) {
                return false;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return dueDate < today;
        }).length;

        const taxaAtraso = total > 0 ? (atrasadas / total) * 100 : 0;

        const approvedWithDates = tarefasFiltradas.filter((task) => {
            const start = parseDate(task.data_inicio);
            const end = parseDate(task.data_prevista_termino) ?? parseDate(task.prazo);
            return normalizeStatus(task.status_task) === "APROVADO" && Boolean(start && end && end >= start);
        });

        const leadTime = approvedWithDates.length > 0
            ? approvedWithDates.reduce((acc, task) => {
                const start = parseDate(task.data_inicio) as Date;
                const end = (parseDate(task.data_prevista_termino) ?? parseDate(task.prazo)) as Date;
                const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                return acc + days;
            }, 0) / approvedWithDates.length
            : 0;

        const activeTasks = tarefasFiltradas.filter((task) => normalizeStatus(task.status_task) !== "APROVADO");
        const ocupacao = activeTasks.length > 0
            ? activeTasks.reduce((acc, task) => acc + Number(task.progresso ?? 0), 0) / activeTasks.length
            : 0;

        const risco = taxaAtraso >= 35 ? "Alto" : taxaAtraso >= 20 ? "Moderado" : "Baixo";

        return [
            { titulo: "Taxa de atraso", valor: `${taxaAtraso.toFixed(1)}%`, apoio: `${atrasadas} de ${total} tarefas atrasadas` },
            { titulo: "Lead time medio", valor: `${leadTime.toFixed(1)} dias`, apoio: "tarefas aprovadas com datas" },
            { titulo: "Capacidade ocupada", valor: `${ocupacao.toFixed(0)}%`, apoio: "media de progresso das tarefas ativas" },
            { titulo: "Risco preditivo", valor: risco, apoio: "baseado na taxa atual de atrasos" },
        ];
    }, [tarefasFiltradas]);

    return (
        <DashboardLayout currentPage="performance">
            <div className="space-y-4">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <h1 className="text-4xl" style={{ color: "var(--cor-textoI)" }}>
                        Desempenho
                    </h1>

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-start">
                        <button
                            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 transition hover:brightness-95"
                            style={{
                                borderColor: "var(--cor-borda)",
                                backgroundColor: "var(--cor-botao)",
                                color: "var(--cor-textoI)",
                            }}
                            type="button"
                        >
                            <Download size={18} />
                            Exportar dados
                        </button>

                        <div className="relative w-full sm:w-64">
                            <button
                                onClick={() => setSearchOpen(!searchOpen)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-2 transition"
                                style={{
                                    borderColor: "var(--cor-borda)",
                                    backgroundColor: "var(--cor-botao)",
                                    color: "var(--cor-textoI)",
                                }}
                            >
                                <span className="truncate">
                                    {projetoFiltrado ? displayWithoutAccents(projetoFiltrado.nome_projeto) : "Todos os projetos"}
                                </span>
                                <ChevronDown size={18} className={`transition ${searchOpen ? "rotate-180" : ""}`} />
                            </button>

                            {searchOpen && (
                                <div
                                    className="absolute top-full z-10 mt-2 w-full rounded-lg border shadow-lg"
                                    style={{
                                        borderColor: "var(--cor-borda)",
                                        backgroundColor: "var(--cor-widgets)",
                                    }}
                                >
                                    <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--cor-borda)" }}>
                                        <Search size={16} style={{ color: "var(--cor-logo2)" }} />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar projeto..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="flex-1 bg-transparent outline-none"
                                            style={{ color: "var(--cor-textoI)" }}
                                        />
                                    </div>

                                    <div className="max-h-48 overflow-y-auto">
                                        <button
                                            onClick={() => {
                                                setSelectedProjetoId(null);
                                                setSearchOpen(false);
                                                setSearchTerm("");
                                            }}
                                            className="w-full px-4 py-2 text-left transition hover:brightness-110"
                                            style={{
                                                backgroundColor: !selectedProjetoId ? "var(--cor-borda)" : "transparent",
                                                color: "var(--cor-textoI)",
                                            }}
                                        >
                                            Todos os projetos
                                        </button>

                                        {projetosOrdenados.map((projeto) => (
                                            <button
                                                key={projeto.id_projeto}
                                                onClick={() => {
                                                    setSelectedProjetoId(projeto.id_projeto);
                                                    setSearchOpen(false);
                                                    setSearchTerm("");
                                                }}
                                                className="w-full px-4 py-2 text-left transition hover:brightness-110"
                                                style={{
                                                    backgroundColor:
                                                        selectedProjetoId === projeto.id_projeto ? "var(--cor-borda)" : "transparent",
                                                    color: "var(--cor-textoI)",
                                                }}
                                            >
                                                {displayWithoutAccents(projeto.nome_projeto)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}>
                        Carregando graficos com dados reais...
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {kpisExecutivos.map((kpi) => (
                        <ChartCard key={kpi.titulo}>
                            <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
                                {kpi.titulo}
                            </p>
                            <p className="text-3xl leading-tight" style={{ color: "var(--cor-textoI)" }}>
                                {kpi.valor}
                            </p>
                            <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
                                {kpi.apoio}
                            </p>
                        </ChartCard>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="space-y-4">
                        <ChartCard title="Produtividade mensal por tipo de tarefa">
                            <div className="h-[380px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d6dbe1" />
                                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip formatter={(value) => `${formatNumericTooltip(value)} tarefas`} />
                                        <Line type="monotone" dataKey="total" name="Total" stroke="#4aa7ff" strokeWidth={3} dot={false} />
                                        <Line type="monotone" dataKey="front" name="Front" stroke="#6fae5a" strokeWidth={2.3} dot={false} />
                                        <Line type="monotone" dataKey="back" name="Back" stroke="#8f84d8" strokeWidth={2.3} dot={false} />
                                        <Line type="monotone" dataKey="fullstack" name="Full Stack" stroke="#e56a63" strokeWidth={2.3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <ChartCard className="w-full xl:max-w-md">
                            <div className="h-[230px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="valor"
                                            nameKey="nome"
                                            cx="45%"
                                            cy="50%"
                                            outerRadius={68}
                                            innerRadius={0}
                                            label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                                            labelLine={false}
                                        >
                                            {pieData.map((entry) => (
                                                <Cell key={entry.nome} fill={entry.cor} />
                                            ))}
                                        </Pie>
                                        <Legend
                                            align="right"
                                            verticalAlign="middle"
                                            layout="vertical"
                                            iconType="circle"
                                            formatter={(value) => <span style={{ color: "var(--cor-textoI)", fontSize: 12 }}>{value}</span>}
                                        />
                                        <Tooltip formatter={(value) => `${formatNumericTooltip(value)} tarefas`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>

                    <div className="space-y-4">
                        <ChartCard title="Demanda mensal por prioridade">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={areaData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d6dbe1" />
                                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip formatter={(value) => `${formatNumericTooltip(value)} tarefas`} />
                                        <Area type="monotone" dataKey="baixa" stackId="1" name="Baixa" stroke="#5aa7e2" fill="#5aa7e2" />
                                        <Area type="monotone" dataKey="media" stackId="1" name="Media" stroke="#e4884d" fill="#e4884d" />
                                        <Area type="monotone" dataKey="alta" stackId="1" name="Alta" stroke="#989898" fill="#989898" />
                                        <Area type="monotone" dataKey="critica" stackId="1" name="Critica" stroke="#f2c11e" fill="#f2c11e" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <ChartCard title="Atrasadas x em dia por projeto">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} barGap={24} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d6dbe1" />
                                        <XAxis dataKey="projeto" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip formatter={(value) => `${formatNumericTooltip(value)} tarefas`} />
                                        <Legend />
                                        <Bar dataKey="atrasadas" name="Atrasadas" fill="#e979a0" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="emDia" name="Em dia" fill="#7ca1cf" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}