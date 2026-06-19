import { usePage } from "@inertiajs/react";
import { ChevronRight, Crown, Layers3, Users2 } from "lucide-react";
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
        id_lider?: number | null;
    } | null;
};

type TeamRecord = {
    id_equipe: number;
    nome: string;
    criado_por?: number | null;
    criador_nome?: string | null;
    equipe_pai?: number | null;
    tipo?: string | null;
    id_lider?: number | null;
    lider_nome?: string | null;
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

type OrgTeam = {
    teamId: number;
    teamName: string;
    leader: TeamMember;
    members: TeamMember[];
};

type OrgData = {
    ceo: TeamMember | null;
    teams: OrgTeam[];
    unassigned: TeamMember[];
};

type TeamPageProps = {
    projectUsers?: TeamUser[];
    auth?: { user?: { id?: number; permissions?: { total?: boolean } } | null };
};

type ApiEnvelope<T> = { data?: T };
type PresenceUsersResponse = { data?: { users?: TeamUser[] } };

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

function toMember(user: TeamUser): TeamMember {
    return {
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.equipe_relation?.nome ?? "Sem equipe",
        email: user.email?.trim() || "Não informado",
        phone: user.phone?.trim() || "Não informado",
        location: user.location?.trim() || "Não informado",
        avatar: user.avatar,
        status: toPresenceStatus(user.status),
    };
}

function buildOrgChart(users: TeamUser[], teams: TeamRecord[]): OrgData {
    if (users.length === 0) return { ceo: null, teams: [], unassigned: [] };

    // CEO = leader of the EMPRESA team
    const empresaTeam = teams.find((t) => t.tipo === "EMPRESA");
    const ceoId = empresaTeam?.id_lider ?? null;
    const ceoUser = ceoId != null ? users.find((u) => u.id === ceoId) : null;
    const ceo = ceoUser ? toMember(ceoUser) : null;

    const assignedIds = new Set<number>(ceoUser ? [ceoUser.id] : []);

    // One group per SUBEQUIPE that has a designated leader
    const teamGroups: OrgTeam[] = teams
        .filter((t) => t.tipo !== "EMPRESA" && t.id_lider != null)
        .flatMap((team) => {
            const leaderId = team.id_lider!;
            const leaderUser = users.find((u) => u.id === leaderId);
            if (!leaderUser) return [];

            assignedIds.add(leaderId);
            const leader = toMember(leaderUser);

            const members = users
                .filter((u) => u.id_equipe === team.id_equipe && u.id !== leaderId)
                .map((u) => { assignedIds.add(u.id); return toMember(u); });

            return [{ teamId: team.id_equipe, teamName: team.nome, leader, members }];
        });

    const unassigned = users.filter((u) => !assignedIds.has(u.id)).map(toMember);

    return { ceo, teams: teamGroups, unassigned };
}

function formatDate(raw?: string | null): string {
    if (!raw) return "—";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("pt-BR");
}

function TeamTreeCard({ team, subteams }: { team: TeamRecord; subteams: TeamRecord[] }) {
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
                    {team.lider_nome && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#47658f] dark:text-[#9fc0d8]">
                            <Crown size={12} className="text-amber-500" />
                            Líder: {team.lider_nome}
                        </p>
                    )}
                    <p className="text-sm text-[#47658f] dark:text-[#9fc0d8]">
                        Criada por {team.criador_nome ?? "Não informado"} · {formatDate(team.data_criacao)}
                    </p>
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
                            <div key={subteam.id_equipe} className="flex items-center justify-between rounded-xl border border-[#dbe7fb] bg-[#f8fbff] px-4 py-3 dark:border-[#2d4353] dark:bg-[#22313d]">
                                <div>
                                    <p className="font-medium text-[#12284a] dark:text-[#d8ecfb]">{subteam.nome}</p>
                                    <p className="text-xs text-[#61799d] dark:text-[#9fc0d8]">
                                        {subteam.lider_nome ? `Líder: ${subteam.lider_nome} · ` : ""}
                                        {subteam.tipo ?? "SUBEQUIPE"} · Criada em {formatDate(subteam.data_criacao)}
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

function MemberCard({ member, compact = false, isLeader = false }: { member: TeamMember; compact?: boolean; isLeader?: boolean }) {
    const initials = member.name
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase();

    return (
        <article className="group relative w-full rounded-2xl border border-[#d8e7ff] bg-white/90 p-5 shadow-[0_10px_30px_rgba(22,84,186,0.12)] backdrop-blur transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(45,87,196,0.2)] dark:border-[#2d4353] dark:bg-[#1c2a35]/95 dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_18px_36px_rgba(0,0,0,0.48)]">
            {isLeader && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <Crown size={10} />
                        Líder
                    </span>
                </div>
            )}
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
                <h3 className="text-[22px] font-semibold tracking-tight text-[#0f2746] dark:text-[#d8ecfb]" style={{ fontFamily: "'Belanosima', sans-serif" }}>
                    {member.name}
                </h3>
                <p className="text-base font-medium text-[#2563eb] dark:text-[#9cc4df]">{member.role}</p>
                <span className="mt-2 inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-sm font-medium text-[#61799d] dark:bg-[#243845] dark:text-[#c6e7ff]">
                    {member.department}
                </span>
            </div>

            <div className={`mt-4 overflow-hidden border-t border-[#dbe7fb] pt-3 text-[#334e73] transition-[max-height,opacity] duration-[620ms] ease-in-out dark:border-[#2d4353] dark:text-[#b8d5eb] ${compact ? "max-h-0 opacity-0 group-hover:max-h-52 group-hover:opacity-100" : "max-h-52 opacity-100"}`}>
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

    useEffect(() => { setUsers(page.props.projectUsers ?? []); }, [page.props.projectUsers]);

    useEffect(() => {
        let isMounted = true;
        const loadTeams = async () => {
            setLoadingTeams(true);
            try {
                const res = await fetch(apiRoutes.equipes, { headers: { Accept: "application/json" } });
                if (!res.ok || !isMounted) return;
                const payload = (await res.json()) as ApiEnvelope<{ equipes?: TeamRecord[] }>;
                if (isMounted) setEquipes(payload.data?.equipes ?? []);
            } catch {
                if (isMounted) setEquipes([]);
            } finally {
                if (isMounted) setLoadingTeams(false);
            }
        };
        void loadTeams();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const syncUsers = async () => {
            try {
                const res = await fetch("/presence/users", { headers: { Accept: "application/json" } });
                if (!res.ok || !isMounted) return;
                const payload = (await res.json()) as PresenceUsersResponse;
                const liveUsers = payload.data?.users ?? [];
                if (isMounted && liveUsers.length > 0) setUsers(liveUsers);
            } catch { /* mantém dados atuais */ }
        };
        void syncUsers();
        const interval = window.setInterval(() => void syncUsers(), 3000);
        return () => { isMounted = false; window.clearInterval(interval); };
    }, []);

    const { ceo, teams, unassigned } = buildOrgChart(users, equipes);

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

    const teamColStyle = teams.length > 0
        ? { gridTemplateColumns: `repeat(${Math.min(teams.length, 3)}, minmax(0, 1fr))` }
        : undefined;

    return (
        <DashboardLayout currentPage="team">
            <section className="relative isolate overflow-hidden rounded-3xl border border-[#d5e4ff] bg-gradient-to-b from-[#edf5ff] via-[#f5f7ff] to-[#f6f2ff] p-4 sm:p-6 lg:p-10 dark:border-[#2d4353] dark:bg-none dark:bg-[#16232d]">
                <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_20%_20%,rgba(120,177,255,0.22),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(118,128,255,0.2),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(162,123,255,0.18),transparent_35%)] dark:opacity-30 dark:[background-image:radial-gradient(circle_at_20%_20%,rgba(67,127,170,0.18),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(61,104,139,0.2),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(49,86,117,0.2),transparent_38%)]" />

                <header className="relative z-10 mb-8 text-center">
                    <h1 className="text-5xl font-semibold tracking-tight text-[#12284a] dark:text-[#d3e8f8]">Nossa Equipe</h1>
                    <p className="mt-2 text-base text-[#47658f] dark:text-[#9fc0d8]">Conheça os profissionais que tornam tudo possível</p>
                </header>

                <div className="relative z-10 mx-auto max-w-6xl">

                    {/* ── CEO ───────────────────────────────────────────── */}
                    {ceo && (
                        <div className="mx-auto max-w-sm animate-[fadeIn_600ms_ease-out_forwards] opacity-0 [animation-delay:80ms]">
                            <MemberCard member={ceo} compact />
                        </div>
                    )}

                    {/* ── Team columns ──────────────────────────────────── */}
                    {teams.length > 0 && (
                        <>
                            {/* CEO → teams connector */}
                            {ceo && (
                                <div className="relative mx-auto mt-8 hidden h-14 w-[88%] lg:block">
                                    <div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-[#b8d4ff] dark:bg-[#3a5f7d]" />
                                    <div className="absolute left-0 right-0 top-7 h-px bg-[#b8d4ff] dark:bg-[#3a5f7d]" />
                                </div>
                            )}

                            <div className="mt-8 grid gap-6 lg:mt-0" style={teamColStyle}>
                                {teams.map((team, teamIdx) => (
                                    <div
                                        key={team.teamId}
                                        className="relative flex flex-col gap-4 animate-[fadeIn_600ms_ease-out_forwards] opacity-0"
                                        style={{ animationDelay: `${140 + teamIdx * 80}ms` }}
                                    >
                                        {/* Drop line from horizontal bar */}
                                        <div className="absolute -top-8 left-1/2 hidden h-8 w-px -translate-x-1/2 bg-[#b8d4ff] dark:bg-[#3a5f7d] lg:block" />

                                        {/* Team name badge */}
                                        <div className="text-center">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9d9e8] bg-[#eef5fb] px-3 py-1 text-xs font-semibold text-[#355684] dark:border-[#395669] dark:bg-[#22313d] dark:text-[#c6e7ff]">
                                                {team.teamName}
                                            </span>
                                        </div>

                                        {/* Leader card */}
                                        <MemberCard member={team.leader} compact isLeader />

                                        {/* Leader → members drop line */}
                                        {team.members.length > 0 && (
                                            <div className="mx-auto h-6 w-px bg-[#c2d9ff] dark:bg-[#3a5f7d]" />
                                        )}

                                        {/* Members */}
                                        <div className="flex flex-col gap-4">
                                            {team.members.map((member, memberIdx) => (
                                                <div
                                                    key={member.id}
                                                    className="animate-[fadeIn_600ms_ease-out_forwards] opacity-0"
                                                    style={{ animationDelay: `${260 + teamIdx * 80 + memberIdx * 60}ms` }}
                                                >
                                                    <MemberCard member={member} compact />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Unassigned users ──────────────────────────────── */}
                    {unassigned.length > 0 && (
                        <section className="mt-10 rounded-2xl border border-dashed border-[#c9d9e8] bg-white/60 p-5 dark:border-[#2d4353] dark:bg-[#1c2a35]/60">
                            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#61799d] dark:text-[#9fc0d8]">
                                Sem equipe atribuída
                            </p>
                            <div
                                className="grid gap-4"
                                style={{ gridTemplateColumns: `repeat(${Math.min(unassigned.length, 4)}, minmax(0, 1fr))` }}
                            >
                                {unassigned.map((member, idx) => (
                                    <div
                                        key={member.id}
                                        className="animate-[fadeIn_600ms_ease-out_forwards] opacity-0"
                                        style={{ animationDelay: `${320 + idx * 50}ms` }}
                                    >
                                        <MemberCard member={member} compact />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Team tree structure ───────────────────────────── */}
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
                                rootTeams.map((team) => (
                                    <TeamTreeCard
                                        key={team.id_equipe}
                                        team={team}
                                        subteams={teamsByParent.get(team.id_equipe) ?? []}
                                    />
                                ))
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
