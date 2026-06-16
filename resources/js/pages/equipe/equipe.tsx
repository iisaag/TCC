import { usePage } from "@inertiajs/react";
import { ChevronRight, Layers3, Users2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { apiRoutes } from "@/lib/routes";

type PresenceStatus = "online" | "ocupado" | "ausente" | "não perturbe" | "offline";

type TeamUser = {
    id: number;
    name: string;
    role: string;
    status: string;
    is_admin?: boolean;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    avatar?: string;
    id_equipe?: number | null;
    equipe_relation?: {
        id_equipe: number;
        nome: string;
        tipo?: string | null;
    } | null;
};

type TeamRecord = {
    id_equipe: number;
    nome: string;
    criado_por?: number | null;
    equipe_pai?: number | null;
    tipo?: string | null;
    data_criacao?: string | null;
};

type TeamMember = {
    id: number;
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    location: string;
    avatar?: string;
    status: PresenceStatus;
};

type TeamPageProps = {
    projectUsers?: TeamUser[];
    auth?: {
        user?: {
            id?: number;
            permissions?: {
                total?: boolean;
            };
        } | null;
    };
};

type ApiEnvelope<T> = {
    data?: T;
};

type PresenceUsersResponse = {
    data?: {
        users?: TeamUser[];
    };
};

const statusClass: Record<PresenceStatus, string> = {
    online: "bg-emerald-500",
    ocupado: "bg-amber-500",
    ausente: "bg-yellow-400",
    "não perturbe": "bg-rose-500",
    offline: "bg-slate-400",
};

const statusLabel: Record<PresenceStatus, string> = {
    online: "Online",
    ocupado: "Ocupado",
    ausente: "Ausente",
    "não perturbe": "Não perturbe",
    offline: "Offline",
};

function toPresenceStatus(rawStatus?: string): PresenceStatus {
    if (rawStatus === "online" || rawStatus === "ocupado" || rawStatus === "ausente" || rawStatus === "não perturbe" || rawStatus === "offline") {
        return rawStatus;
    }

    return "offline";
}

function inferDepartment(role: string): string {
    const lower = role.toLowerCase();

    if (lower.includes("design")) return "Design";
    if (lower.includes("opera")) return "Operações";
    if (lower.includes("desenv") || lower.includes("dev") || lower.includes("tech") || lower.includes("engen")) return "Desenvolvimento";
    if (lower.includes("dire") || lower.includes("ceo") || lower.includes("fundador")) return "Direção";

    return "Equipe";
}

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function resolveTeamName(user: TeamUser, teams: TeamRecord[]): string {
    if (user.equipe_relation?.nome) {
        return user.equipe_relation.nome;
    }

    const role = normalizeText(user.role);
    const userName = normalizeText(user.name);

    if (typeof user.id_equipe === "number") {
        const directTeam = teams.find((team) => team.id_equipe === user.id_equipe);
        if (directTeam) {
            return directTeam.nome;
        }
    }

    const createdTeam = teams.find((team) => team.criado_por === user.id);
    if (createdTeam) {
        return createdTeam.nome;
    }

    const matchedByRole = teams.find((team) => {
        const teamName = normalizeText(team.nome);

        return (
            role.includes(teamName)
            || teamName.includes(role)
            || (role.includes("desenvol") && teamName.includes("back"))
            || (role.includes("desenvol") && teamName.includes("dev"))
            || (role.includes("design") && teamName.includes("design"))
            || (role.includes("analis") && teamName.includes("analise"))
            || (role.includes("gerent") && teamName.includes("produto"))
            || (role.includes("gerent") && teamName.includes("oper"))
            || (userName.includes("ana clara") && teamName.includes("desenvol"))
        );
    });

    if (matchedByRole) {
        return matchedByRole.nome;
    }

    if (role.includes("desenvol")) {
        return "Equipe de Desenvolvimento";
    }

    if (role.includes("design")) {
        return "Equipe de Design";
    }

    if (role.includes("analis")) {
        return "Equipe de Analise";
    }

    if (role.includes("gerent")) {
        return "Equipe de Gestao";
    }

    return inferDepartment(user.role);
}

function classifyLeader(role: string): "ceo" | "manager" | "member" {
    const lower = role.toLowerCase();

    if (/(ceo|fundador|fundadora|diretor|diretora|president)/.test(lower)) {
        return "ceo";
    }

    if (/(gerente|coordenador|coordenadora|lider|líder|head|chefe|manager)/.test(lower)) {
        return "manager";
    }

    return "member";
}

function buildHierarchy(users: TeamUser[]): { ceo: TeamMember; managers: TeamMember[]; members: TeamMember[] } {
    const baseMembers = users.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        department: inferDepartment(user.role),
        email: user.email?.trim() || "Não informado",
        phone: user.phone?.trim() || "Não informado",
        location: user.location?.trim() || "Não informado",
        avatar: user.avatar,
        status: toPresenceStatus(user.status),
        isAdmin: Boolean(user.is_admin),
    }));

    if (baseMembers.length === 0) {
        return {
            ceo: {
                id: 1,
                name: "Isabela Analista",
                role: "CEO & Fundadora",
                department: "Direção",
                email: "isabela@idvymp.com",
                phone: "+55 11 98888-8888",
                location: "São Paulo, SP",
                status: "online",
            },
            managers: [
                {
                    id: 2,
                    name: "Ana Clara",
                    role: "Gerente de Desenvolvimento",
                    department: "Desenvolvimento",
                    email: "ana.clara@idvymp.com",
                    phone: "+55 11 98888-8888",
                    location: "São Paulo, SP",
                    status: "offline",
                },
                {
                    id: 3,
                    name: "Isabeli Arantes",
                    role: "Designer Chefe",
                    department: "Design",
                    email: "isabeli@idvymp.com",
                    phone: "+55 11 97777-7777",
                    location: "São Paulo, SP",
                    status: "ocupado",
                },
                {
                    id: 4,
                    name: "Roberto Almeida",
                    role: "Gerente de Operações",
                    department: "Operações",
                    email: "roberto@idvymp.com",
                    phone: "+55 11 96666-6666",
                    location: "São Paulo, SP",
                    status: "online",
                },
            ],
            members: [
                {
                    id: 5,
                    name: "Carlos Silva",
                    role: "Desenvolvedor Full Stack",
                    department: "Desenvolvimento",
                    email: "carlos.silva@idvymp.com",
                    phone: "+55 11 95555-5555",
                    location: "São Paulo, SP",
                    status: "online",
                },
                {
                    id: 6,
                    name: "Marina Santos",
                    role: "Desenvolvedora Frontend",
                    department: "Desenvolvimento",
                    email: "marina.santos@idvymp.com",
                    phone: "+55 11 94444-4444",
                    location: "São Paulo, SP",
                    status: "offline",
                },
                {
                    id: 7,
                    name: "Lucas Oliveira",
                    role: "UX Designer",
                    department: "Design",
                    email: "lucas.oliveira@idvymp.com",
                    phone: "+55 11 93333-3333",
                    location: "São Paulo, SP",
                    status: "ocupado",
                },
                {
                    id: 8,
                    name: "Juliana Costa",
                    role: "UI Designer",
                    department: "Design",
                    email: "juliana.costa@idvymp.com",
                    phone: "+55 11 92222-2222",
                    location: "São Paulo, SP",
                    status: "ausente",
                },
                {
                    id: 9,
                    name: "Fernanda Lima",
                    role: "Analista de Processos",
                    department: "Operações",
                    email: "fernanda.lima@idvymp.com",
                    phone: "+55 11 91111-1111",
                    location: "São Paulo, SP",
                    status: "online",
                },
            ],
        };
    }

    const admins = baseMembers.filter((member) => member.isAdmin);

    if (admins.length > 0) {
        const [ceo, ...managers] = admins;
        const managerIds = new Set(managers.map((manager) => manager.id));
        const members = baseMembers.filter((member) => !member.isAdmin && member.id !== ceo.id && !managerIds.has(member.id));

        return { ceo, managers, members };
    }

    let ceo = baseMembers.find((member) => classifyLeader(member.role) === "ceo") ?? baseMembers[0];
    const remaining = baseMembers.filter((member) => member.id !== ceo.id);
    let managers = remaining.filter((member) => classifyLeader(member.role) === "manager");

    if (managers.length === 0 && remaining.length > 0) {
        managers = remaining.slice(0, Math.min(3, remaining.length));
    }

    const managerIds = new Set(managers.map((manager) => manager.id));
    const members = remaining.filter((member) => !managerIds.has(member.id));

    return { ceo, managers, members };
}

function formatDate(raw?: string | null): string {
    if (!raw) {
        return "—";
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return parsed.toLocaleDateString("pt-BR");
}

function TeamTreeCard({
    team,
    ownerName,
    subteams,
}: {
    team: TeamRecord;
    ownerName: string;
    subteams: TeamRecord[];
}) {
    return (
        <article className="rounded-2xl border border-[#d7e4f0] bg-white/95 p-5 shadow-[0_12px_30px_rgba(28,76,130,0.1)] dark:border-[#2d4353] dark:bg-[#1c2a35]/95">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-[#0f2746] dark:text-[#d8ecfb]">{team.nome}</h3>
                        <span className="rounded-full border border-[#c9d9e8] bg-[#eef5fb] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5b728e] dark:border-[#395669] dark:bg-[#22313d] dark:text-[#c6e7ff]">
                            {team.tipo ?? "SUBEQUIPE"}
                        </span>
                    </div>
                    <p className="mt-1 text-sm text-[#47658f] dark:text-[#9fc0d8]">Criada por {ownerName}</p>
                    <p className="text-sm text-[#47658f] dark:text-[#9fc0d8]">Data de criação: {formatDate(team.data_criacao)}</p>
                </div>

                <div className="rounded-full bg-[#eaf3ff] p-2 text-[#2f5ea6] dark:bg-[#22313d] dark:text-[#c6e7ff]">
                    <Layers3 size={18} />
                </div>
            </div>

            {subteams.length > 0 ? (
                <div className="mt-5 space-y-3 border-t border-[#dbe7fb] pt-4 dark:border-[#2d4353]">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#61799d] dark:text-[#9fc0d8]">
                        <ChevronRight size={14} />
                        Subequipes
                    </div>

                    <div className="space-y-2">
                        {subteams.map((subteam) => (
                            <div
                                key={subteam.id_equipe}
                                className="flex items-center justify-between rounded-xl border border-[#dbe7fb] bg-[#f8fbff] px-4 py-3 dark:border-[#2d4353] dark:bg-[#22313d]"
                            >
                                <div>
                                    <p className="font-medium text-[#12284a] dark:text-[#d8ecfb]">{subteam.nome}</p>
                                    <p className="text-xs text-[#61799d] dark:text-[#9fc0d8]">
                                        Tipo: {subteam.tipo ?? "SUBEQUIPE"} · Criada em {formatDate(subteam.data_criacao)}
                                    </p>
                                </div>

                                <span className="rounded-full bg-[#edf3fb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4f6788] dark:bg-[#1c2a35] dark:text-[#c6e7ff]">
                                    ID {subteam.id_equipe}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="mt-4 border-t border-[#dbe7fb] pt-4 text-sm text-[#61799d] dark:border-[#2d4353] dark:text-[#9fc0d8]">
                    Nenhuma subequipe vinculada.
                </p>
            )}
        </article>
    );
}

function MemberCard({ member, compact = false }: { member: TeamMember; compact?: boolean }) {
    const initials = member.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    return (
        <article className="group relative w-full rounded-2xl border border-[#d8e7ff] bg-white/90 p-5 shadow-[0_10px_30px_rgba(22,84,186,0.12)] backdrop-blur transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(45,87,196,0.2)] dark:border-[#2d4353] dark:bg-[#1c2a35]/95 dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.48)]">
            <div className="mx-auto flex w-fit items-center justify-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-[#d2e6ff] bg-[#eaf3ff] dark:border-[#3c5e78] dark:bg-[#243845]">
                    {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#2f5ea6] dark:text-[#c6e7ff]">{initials}</div>
                    )}
                </div>

                <span className={`absolute ml-14 mt-14 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#1c2a35] ${statusClass[member.status]}`} />
            </div>

            <div className="mt-3 text-center">
                <h3 className="text-[26px] font-semibold tracking-tight text-[#0f2746] dark:text-[#d8ecfb]" style={{ fontFamily: "'Belanosima', sans-serif" }}>
                    {member.name}
                </h3>
                <p className="text-lg font-medium text-[#2563eb] dark:text-[#9cc4df]">{member.role}</p>
                <span className="mt-2 inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-sm font-medium text-[#61799d] dark:bg-[#243845] dark:text-[#c6e7ff]">
                    {member.department}
                </span>
            </div>

            <div
                className={`mt-4 overflow-hidden border-t border-[#dbe7fb] pt-3 text-[#334e73] transition-[max-height,opacity] duration-[620ms] ease-in-out dark:border-[#2d4353] dark:text-[#b8d5eb] ${
                    compact ? "max-h-0 opacity-0 group-hover:max-h-52 group-hover:opacity-100" : "max-h-52 opacity-100"
                }`}
            >
                <p className="flex items-center gap-2 text-sm"><span>✉</span>{member.email}</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm"><span>📞</span>{member.phone}</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm"><span>📍</span>{member.location}</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm"><span>●</span>{statusLabel[member.status]}</p>
            </div>
        </article>
    );
}

export default function Equipe() {
    const page = usePage<TeamPageProps>();
    const [users, setUsers] = useState<TeamUser[]>(page.props.projectUsers ?? []);
    const [equipes, setEquipes] = useState<TeamRecord[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(true);

    useEffect(() => {
        setUsers(page.props.projectUsers ?? []);
    }, [page.props.projectUsers]);

    useEffect(() => {
        let isMounted = true;

        const loadTeams = async () => {
            setLoadingTeams(true);

            try {
                const response = await fetch(apiRoutes.equipes, {
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!response.ok || !isMounted) {
                    return;
                }

                const payload = (await response.json()) as ApiEnvelope<{ equipes?: TeamRecord[] }>;
                if (isMounted) {
                    setEquipes(payload.data?.equipes ?? []);
                }
            } catch {
                if (isMounted) {
                    setEquipes([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingTeams(false);
                }
            }
        };

        void loadTeams();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const syncUsers = async () => {
            try {
                const response = await fetch("/presence/users", {
                    headers: {
                        Accept: "application/json",
                    },
                });

                if (!response.ok || !isMounted) {
                    return;
                }

                const payload = (await response.json()) as PresenceUsersResponse;
                const liveUsers = payload.data?.users ?? [];

                if (isMounted && liveUsers.length > 0) {
                    setUsers(liveUsers);
                }
            } catch {
                // Se a atualização falhar, mantém os dados atuais na tela.
            }
        };

        void syncUsers();

        const interval = window.setInterval(() => {
            void syncUsers();
        }, 3000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, []);

    const { ceo, managers, members } = buildHierarchy(users);

    const teamLabels = useMemo(() => {
        const map = new Map<number, string>();

        for (const user of users) {
            map.set(user.id, resolveTeamName(user, equipes));
        }

        return map;
    }, [users, equipes]);

    const teamsByParent = useMemo(() => {
        const grouped = new Map<number | null, TeamRecord[]>();

        for (const team of equipes) {
            const parent = team.equipe_pai ?? null;
            const current = grouped.get(parent) ?? [];
            current.push(team);
            grouped.set(parent, current);
        }

        for (const entry of grouped.values()) {
            entry.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        }

        return grouped;
    }, [equipes]);

    const rootTeams = useMemo(() => teamsByParent.get(null) ?? [], [teamsByParent]);

    return (
        <DashboardLayout currentPage="team">
            <section className="relative isolate overflow-hidden rounded-3xl border border-[#d5e4ff] bg-gradient-to-b from-[#edf5ff] via-[#f5f7ff] to-[#f6f2ff] p-4 sm:p-6 lg:p-10 dark:border-[#2d4353] dark:bg-none dark:bg-[#16232d]">
                <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_20%,rgba(120,177,255,0.22),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(118,128,255,0.2),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(162,123,255,0.18),transparent_35%)] dark:opacity-30 dark:[background-image:radial-gradient(circle_at_20%_20%,rgba(67,127,170,0.18),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(61,104,139,0.2),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(49,86,117,0.2),transparent_38%)]" />

                <header className="relative z-10 mb-8 text-center">
                    <h1 className="text-5xl font-semibold tracking-tight text-[#12284a] dark:text-[#d3e8f8]">
                        Nossa Equipe
                    </h1>
                    <p className="mt-2 text-base text-[#47658f] dark:text-[#9fc0d8]">Conheça os profissionais que tornam tudo possível</p>
                </header>

                <div className="relative z-10 mx-auto max-w-6xl">
                    <div className="mx-auto max-w-sm animate-[fadeIn_600ms_ease-out_forwards] opacity-0 [animation-delay:80ms]">
                        <MemberCard member={{ ...ceo, department: teamLabels.get(ceo.id) ?? ceo.department }} compact />
                    </div>

                    {managers.length > 0 && (
                        <>
                            <div className="relative mx-auto mt-8 hidden h-14 w-[88%] lg:block">
                                <div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-[#b8d4ff] dark:bg-[#3a5f7d]" />
                                <div className="absolute left-0 right-0 top-7 h-px bg-[#b8d4ff] dark:bg-[#3a5f7d]" />
                            </div>

                            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-0 lg:grid-cols-3">
                                {managers.map((manager, index) => (
                                    <div
                                        key={manager.id}
                                        className="relative animate-[fadeIn_600ms_ease-out_forwards] opacity-0"
                                        style={{ animationDelay: `${140 + index * 80}ms` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 hidden h-8 w-px -translate-x-1/2 bg-[#b8d4ff] dark:bg-[#3a5f7d] lg:block" />
                                        <MemberCard member={{ ...manager, department: teamLabels.get(manager.id) ?? manager.department }} compact />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {members.length > 0 && (
                        <>
                            <div className="relative mx-auto mt-10 hidden h-14 w-[92%] lg:block">
                                <div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-[#c2d9ff] dark:bg-[#3a5f7d]" />
                                <div className="absolute left-0 right-0 top-7 h-px bg-[#c2d9ff] dark:bg-[#3a5f7d]" />
                            </div>

                            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-0 lg:grid-cols-5">
                                {members.map((member, index) => (
                                    <div
                                        key={member.id}
                                        className="relative animate-[fadeIn_600ms_ease-out_forwards] opacity-0"
                                        style={{ animationDelay: `${260 + index * 70}ms` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 hidden h-8 w-px -translate-x-1/2 bg-[#c2d9ff] dark:bg-[#3a5f7d] lg:block" />
                                        <MemberCard member={{ ...member, department: teamLabels.get(member.id) ?? member.department }} compact />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <section className="mt-12 rounded-[2rem] border border-[#d5e4ff] bg-white/80 p-5 shadow-[0_14px_40px_rgba(20,56,110,0.1)] backdrop-blur dark:border-[#2d4353] dark:bg-[#16232d]/90">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dbe7fb] pb-4 dark:border-[#2d4353]">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#61799d] dark:text-[#9fc0d8]">
                                    <Users2 size={14} />
                                    Estrutura das equipes
                                </div>
                                <h2 className="mt-2 text-2xl font-semibold text-[#12284a] dark:text-[#d3e8f8]">
                                    Equipes principais e subequipes
                                </h2>
                            </div>

                            <div className="rounded-full bg-[#eef5ff] px-4 py-2 text-sm font-medium text-[#355684] dark:bg-[#22313d] dark:text-[#c6e7ff]">
                                {loadingTeams ? "Carregando equipes..." : `${equipes.length} equipe(s) cadastrada(s)`}
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {rootTeams.length > 0 ? (
                                rootTeams.map((team) => {
                                    const subteams = teamsByParent.get(team.id_equipe) ?? [];
                                    const owner = users.find((user) => user.id === team.criado_por)?.name ?? "Nao informado";

                                    return (
                                        <TeamTreeCard
                                            key={team.id_equipe}
                                            team={team}
                                            ownerName={owner}
                                            subteams={subteams}
                                        />
                                    );
                                })
                            ) : (
                                <div className="rounded-2xl border border-dashed border-[#c9d9e8] bg-[#f8fbff] p-6 text-sm text-[#61799d] dark:border-[#2d4353] dark:bg-[#22313d] dark:text-[#9fc0d8]">
                                    Nenhuma equipe principal cadastrada ainda.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </section>

        </DashboardLayout>
    );
}