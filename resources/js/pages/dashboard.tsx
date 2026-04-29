import DashboardLayout from "@/layouts/DashboardLayout";
import { ReactNode } from "react";
import { Download, Upload } from "lucide-react";
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

const progressoProjetos = [
    { mes: "Jan", produto: 14, frontend: 10, backend: 9, dados: 6, qa: 4, design: 7 },
    { mes: "Fev", produto: 16, frontend: 12, backend: 10, dados: 8, qa: 5, design: 8 },
    { mes: "Mar", produto: 19, frontend: 14, backend: 12, dados: 9, qa: 7, design: 10 },
    { mes: "Abr", produto: 22, frontend: 16, backend: 13, dados: 10, qa: 8, design: 11 },
    { mes: "Mai", produto: 24, frontend: 18, backend: 15, dados: 12, qa: 9, design: 12 },
    { mes: "Jun", produto: 26, frontend: 19, backend: 16, dados: 13, qa: 10, design: 13 },
    { mes: "Jul", produto: 27, frontend: 21, backend: 18, dados: 14, qa: 11, design: 15 },
    { mes: "Ago", produto: 29, frontend: 22, backend: 19, dados: 15, qa: 12, design: 16 },
    { mes: "Set", produto: 31, frontend: 24, backend: 21, dados: 16, qa: 13, design: 17 },
    { mes: "Out", produto: 32, frontend: 25, backend: 22, dados: 17, qa: 14, design: 18 },
    { mes: "Nov", produto: 34, frontend: 26, backend: 23, dados: 18, qa: 15, design: 19 },
    { mes: "Dez", produto: 36, frontend: 28, backend: 25, dados: 19, qa: 16, design: 21 },
];

const previsaoDemanda = [
    { mes: "Jan", baixa: 8, media: 13, alta: 6, critica: 4 },
    { mes: "Fev", baixa: 7, media: 12, alta: 5, critica: 3 },
    { mes: "Mar", baixa: 9, media: 14, alta: 7, critica: 4 },
    { mes: "Abr", baixa: 10, media: 15, alta: 8, critica: 5 },
    { mes: "Mai", baixa: 9, media: 14, alta: 8, critica: 4 },
    { mes: "Jun", baixa: 11, media: 16, alta: 9, critica: 6 },
];

const distribuicaoTarefas = [
    { nome: "Em execucao", valor: 41, cor: "#46d5be" },
    { nome: "Em revisao", valor: 22, cor: "#39a4f8" },
    { nome: "Bloqueadas", valor: 11, cor: "#ec6f86" },
    { nome: "Planejadas", valor: 26, cor: "#f4c04f" },
];

const riscoPorSquad = [
    { squad: "Sistema Web", previsto: 8, realizado: 7 },
    { squad: "App Mobile", previsto: 6, realizado: 9 },
    { squad: "Dados", previsto: 5, realizado: 6 },
];

const kpisExecutivos = [
    { titulo: "Taxa de atraso", valor: "18%", apoio: "-4 p.p. vs ultimo ciclo" },
    { titulo: "Lead time medio", valor: "6,2 dias", apoio: "tarefas concluidas" },
    { titulo: "Capacidade ocupada", valor: "82%", apoio: "equipe dentro do limite" },
    { titulo: "Risco preditivo", valor: "Moderado", apoio: "2 projetos em alerta" },
];

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

export default function Dashboard() {
    return (
        <DashboardLayout currentPage="dashboard">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-4xl" style={{ color: "var(--cor-textoI)" }}>
                        Dashboard
                    </h1>
                </div>

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
                        <ChartCard title="Produtividade mensal por equipe (tarefas concluidas)">
                            <div className="h-[380px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={progressoProjetos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d6dbe1" />
                                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value) => formatNumericTooltip(value)} />
                                        <Line type="monotone" dataKey="produto" stroke="#4aa7ff" strokeWidth={3} dot={false} />
                                        <Line type="monotone" dataKey="frontend" stroke="#6fae5a" strokeWidth={2.3} dot={false} />
                                        <Line type="monotone" dataKey="backend" stroke="#8f84d8" strokeWidth={2.3} dot={false} />
                                        <Line type="monotone" dataKey="dados" stroke="#e6ab4d" strokeWidth={2.3} dot={false} />
                                        <Line type="monotone" dataKey="qa" stroke="#b6be50" strokeWidth={2.3} dot={false} />
                                        <Line type="monotone" dataKey="design" stroke="#e56a63" strokeWidth={2.3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                            <div className="flex gap-3 xl:w-[390px] xl:flex-nowrap">
                                <button
                                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-lg transition hover:brightness-95"
                                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-textoI)" }}
                                    type="button"
                                >
                                    <Upload size={18} />
                                    Importar dados
                                </button>
                                <button
                                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-lg transition hover:brightness-95"
                                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-textoI)" }}
                                    type="button"
                                >
                                    <Download size={18} />
                                    Exportar dados
                                </button>
                            </div>

                            <ChartCard className="w-full xl:max-w-md">
                                <div className="h-[230px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distribuicaoTarefas}
                                                dataKey="valor"
                                                nameKey="nome"
                                                cx="45%"
                                                cy="50%"
                                                outerRadius={68}
                                                innerRadius={0}
                                                label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                                                labelLine={false}
                                            >
                                                {distribuicaoTarefas.map((entry) => (
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
                                            <Tooltip formatter={(value) => `${formatNumericTooltip(value)}%`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <ChartCard title="Previsao de demanda por prioridade">
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={previsaoDemanda} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d6dbe1" />
                                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(value) => `${formatNumericTooltip(value)} tarefas`} />
                                        <Area type="monotone" dataKey="baixa" stackId="1" stroke="#5aa7e2" fill="#5aa7e2" />
                                        <Area type="monotone" dataKey="media" stackId="1" stroke="#e4884d" fill="#e4884d" />
                                        <Area type="monotone" dataKey="alta" stackId="1" stroke="#989898" fill="#989898" />
                                        <Area type="monotone" dataKey="critica" stackId="1" stroke="#f2c11e" fill="#f2c11e" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <ChartCard title="Atrasos previstos x realizados por projeto">
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={riscoPorSquad} barGap={24} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#d6dbe1" />
                                        <XAxis dataKey="squad" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="previsto" fill="#e979a0" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="realizado" fill="#7ca1cf" radius={[6, 6, 0, 0]} />
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