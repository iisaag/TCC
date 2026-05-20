import { usePage } from "@inertiajs/react";
import {
    MoreVertical,
    Search,
    Shield,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

// HMR trigger comment - no functional change
import DashboardLayout from "@/layouts/DashboardLayout";
import { apiRoutes } from "@/lib/routes";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ─────────────────────────── Types ───────────────────────────

type AccessLevel = "admin" | "usuario";

interface SessionUser {
    id: number;
    name: string;
    permissions?: { total?: boolean };
}

interface PageProps {
    [key: string]: unknown;
    auth?: { user?: SessionUser | null };
}

interface Usuario {
    id_usuario: number;
    nome: string;
    email?: string;
    telefone?: string | null;
    localizacao?: string | null;
    foto_perfil?: string | null;
    cargo?: string | null;
    nivel?: string | null;
    status_atual?: string | null;
    data_criacao?: string | null;
    ultimo_acesso?: string | null;
}

interface SenhaRegistro {
    email: string;
    nivel_acesso: string;
}

interface CargoItem {
    id_cargo: number;
    nome_cargo: string;
}

interface ProjetoItem {
    id_projeto: number;
    nome_projeto: string;
    status_projeto?: string | null;
    id_responsavel?: number | null;
}

interface EquipeItem {
    id_equipe: number;
    nome: string;
    tipo?: string | null;
    criado_por?: number | null;
    equipe_pai?: number | null;
}

interface ApiEnvelope<T> {
    data?: T;
}

interface ApiResponse<T> {
    success?: boolean;
    message?: string;
    data?: T;
}

interface UserForm {
    nome: string;
    email: string;
    cargo: string;
    nivel: string;
    senha: string;
    nivel_acesso: AccessLevel;
    telefone?: string;
    localizacao?: string;
    status_atual: string;
}

const EMPTY_FORM: UserForm = {
    nome: "",
    email: "",
    cargo: "",
    nivel: "",
    senha: "",
    nivel_acesso: "usuario",
    telefone: "",
    localizacao: "",
    status_atual: "Ativo",
};

const PAGE_SIZE = 10;

async function readApiMessage(response: Response, fallback: string): Promise<string> {
    try {
        const payload = (await response.json()) as ApiResponse<unknown>;
        return payload.message ?? fallback;
    } catch {
        return fallback;
    }
}

// ─────────────────────────── Helpers ───────────────────────────

function toAccessLevel(raw?: string | null): AccessLevel {
    const n = (raw ?? "").toLowerCase();
    return ["admin", "administrador", "total", "geral"].includes(n) ? "admin" : "usuario";
}

function getInitials(nome: string): string {
    const parts = nome.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
    { bg: "#e8e4f9", text: "#5b4fcf" },
    { bg: "#d6f0fb", text: "#1a78a8" },
    { bg: "#fde8d8", text: "#b5520a" },
    { bg: "#d4f5e2", text: "#1a7a45" },
    { bg: "#fde4f0", text: "#a03070" },
    { bg: "#e4f0fd", text: "#2256a8" },
    { bg: "#f5f0d4", text: "#7a6010" },
];

function getAvatarColor(nome: string): { bg: string; text: string } {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function formatDateTime(raw?: string | null): string {
    if (!raw) return "—";
    const date = new Date(raw);
    if (isNaN(date.getTime())) return "—";
    return (
        date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
        ", " +
        date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
}

const ACTIVE_PRESENCE_WINDOW_MS = 45 * 1000;

function hasRecentAccess(ultimoAcesso?: string | null): boolean {
    if (!ultimoAcesso) {
        return false;
    }

    const timestamp = new Date(ultimoAcesso).getTime();

    if (Number.isNaN(timestamp)) {
        return false;
    }

    return Date.now() - timestamp <= ACTIVE_PRESENCE_WINDOW_MS;
}

function isUsuarioAtivo(usuario: Usuario): boolean {
    const status = usuario.status_atual?.trim().toLowerCase();

    if (status === "inativo") {
        return false;
    }

    if (hasRecentAccess(usuario.ultimo_acesso)) {
        return true;
    }

    return !status || status === "ativo";
}

// ─────────────────────────── Sub-components ───────────────────────────

function Avatar({ nome, foto }: { nome: string; foto?: string | null }) {
    const color = getAvatarColor(nome);
    return (
        <span
            className="inline-flex items-center justify-center overflow-hidden rounded-full text-xs font-semibold transition-all duration-200 hover:shadow-md"
            style={{ width: 32, height: 32, backgroundColor: color.bg, color: color.text, flexShrink: 0 }}
        >
            {foto ? (
                <img
                    src={foto}
                    alt={nome}
                    className="h-full w-full object-cover"
                />
            ) : (
                getInitials(nome)
            )}
        </span>
    );
}

function PermissionBadge({ access }: { access: AccessLevel }) {
    if (access === "admin") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:shadow-md" style={{ backgroundColor: "#1a1a2e", color: "#fff" }}>
                <Shield size={10} />
                Administrador
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:shadow-md" style={{ borderColor: "#bbb", color: "#444" }}>
            Usuário
        </span>
    );
}

function StatusBadge({ user, onClick, disabled }: { user: Usuario; onClick?: () => void; disabled?: boolean }) {
    const isAtivo = isUsuarioAtivo(user);
    const baseStyle = isAtivo ? { borderColor: "#4caf85", color: "#1d6a45" } : { borderColor: "#e07070", color: "#a02020" };

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                style={baseStyle}
            >
                {isAtivo ? "Ativo" : "Inativo"}
            </button>
        );
    }

    return (
        <span
            className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:shadow-md"
            style={baseStyle}
        >
            {isAtivo ? "Ativo" : "Inativo"}
        </span>
    );
}

function SelectFilter({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    placeholder: string;
}) {
    return (
        <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
            <SelectTrigger
                size="sm"
                className="min-w-[140px] rounded-lg border text-sm transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-0"
                style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent
                className="border"
                style={{
                    borderColor: "var(--cor-borda)",
                    backgroundColor: "var(--cor-widgets)",
                    color: "var(--cor-logo)",
                }}
            >
                <SelectItem value="__all__" style={{ color: "var(--cor-logo2)" }}>{placeholder}</SelectItem>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value} style={{ color: "var(--cor-logo)" }}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center justify-center rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md active:scale-95"
                style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
            >
                <MoreVertical size={15} />
            </button>
            {open && (
                <div
                    className="absolute right-0 top-8 z-30 min-w-[130px] rounded-xl border py-1 shadow-lg animate-in zoom-in-95 fade-in duration-150"
                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                >
                    <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm transition-all duration-150 hover:bg-opacity-5"
                        style={{ color: "var(--cor-logo)" }}
                        onClick={() => { setOpen(false); onEdit(); }}
                    >
                        Editar
                    </button>
                    <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm transition-all duration-150 hover:bg-opacity-5"
                        style={{ color: "#c0392b" }}
                        onClick={() => { setOpen(false); onDelete(); }}
                    >
                        Excluir
                    </button>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────── Main Page ───────────────────────────

export default function UsuariosAdminPage() {
    const page = usePage<PageProps>();
    const isAdmin = Boolean(page.props.auth?.user?.permissions?.total);

    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargos, setCargos] = useState<CargoItem[]>([]);
    const [permissoes, setPermissoes] = useState<Record<string, AccessLevel>>({});
    const [projetos, setProjetos] = useState<ProjetoItem[]>([]);
    const [equipes, setEquipes] = useState<EquipeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Filters
    const [query, setQuery] = useState("");
    const [filterCargo, setFilterCargo] = useState("");
    const [filterNivel, setFilterNivel] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPermissao, setFilterPermissao] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Modals
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

    const [form, setForm] = useState<UserForm>(EMPTY_FORM);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);
    const [statusUser, setStatusUser] = useState<Usuario | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

    const csrfToken = useMemo(
        () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "",
        [],
    );

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const usuariosRes = await fetch(apiRoutes.usuarios, { headers: { Accept: "application/json" } });

            if (!usuariosRes.ok) throw new Error("usuarios");

            const uPayload = (await usuariosRes.json()) as ApiEnvelope<{ usuarios?: Usuario[] }>;
            const users = uPayload.data?.usuarios ?? [];

            let regs: SenhaRegistro[] = [];
            let cargoList: CargoItem[] = [];
            let projectList: ProjetoItem[] = [];
            let teamList: EquipeItem[] = [];

            try {
                const [senhasRes, cargosRes] = await Promise.all([
                    fetch(apiRoutes.senhas, { headers: { Accept: "application/json" } }),
                    fetch(apiRoutes.cargos, { headers: { Accept: "application/json" } }),
                ]);

                if (senhasRes.ok) {
                    const sPayload = (await senhasRes.json()) as ApiEnvelope<{ senhas?: SenhaRegistro[] }>;
                    regs = sPayload.data?.senhas ?? [];
                }

                if (cargosRes.ok) {
                    const cPayload = (await cargosRes.json()) as ApiEnvelope<{ cargos?: CargoItem[] }>;
                    cargoList = cPayload.data?.cargos ?? [];
                }
            } catch {
                regs = [];
                cargoList = [];
            }

            try {
                const [projetosRes, equipesRes] = await Promise.all([
                    fetch(apiRoutes.projetos, { headers: { Accept: "application/json" } }),
                    fetch(apiRoutes.equipes, { headers: { Accept: "application/json" } }),
                ]);

                if (projetosRes.ok) {
                    const pPayload = (await projetosRes.json()) as ApiEnvelope<{ projetos?: ProjetoItem[] }>;
                    projectList = pPayload.data?.projetos ?? [];
                }

                if (equipesRes.ok) {
                    const ePayload = (await equipesRes.json()) as ApiEnvelope<{ equipes?: EquipeItem[] }>;
                    teamList = ePayload.data?.equipes ?? [];
                }
            } catch {
                projectList = [];
                teamList = [];
            }

            const map: Record<string, AccessLevel> = {};
            regs.forEach((r) => { map[r.email.toLowerCase()] = toAccessLevel(r.nivel_acesso); });
            setUsuarios(users);
            setCargos(cargoList);
            setPermissoes(map);
            setProjetos(projectList);
            setEquipes(teamList);
        } catch {
            setError("Não foi possível carregar a lista de usuários.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void fetchData(); }, []);

    useEffect(() => {
        if (!success) return;
        const t = window.setTimeout(() => setSuccess(null), 3000);
        return () => window.clearTimeout(t);
    }, [success]);

    const cargosUnicos = useMemo(() => {
        const set = new Set<string>();
        usuarios.forEach((u) => { if (u.cargo) set.add(u.cargo); });
        return Array.from(set).sort();
    }, [usuarios]);

    const niveisUnicos = useMemo(() => {
        const set = new Set<string>();
        usuarios.forEach((u) => { if (u.nivel) set.add(u.nivel); });
        return Array.from(set).sort();
    }, [usuarios]);

    const stats = useMemo(() => {
        const total = usuarios.length;
        const admins = Object.values(permissoes).filter((v) => v === "admin").length;
        const ativos = usuarios.filter((u) => isUsuarioAtivo(u)).length;
        return { total, admins, ativos, inativos: total - ativos };
    }, [usuarios, permissoes]);

    const filteredUsers = useMemo(() => {
        const term = query.trim().toLowerCase();
        return usuarios.filter((u) => {
            if (term) {
                const n = (u.nome ?? "").toLowerCase();
                const e = (u.email ?? "").toLowerCase();
                const c = (u.cargo ?? "").toLowerCase();
                if (!n.includes(term) && !e.includes(term) && !c.includes(term)) return false;
            }
            if (filterCargo && u.cargo !== filterCargo) return false;
            if (filterNivel && u.nivel !== filterNivel) return false;
            if (filterStatus) {
                const isAtivo = isUsuarioAtivo(u);
                if (filterStatus === "ativo" && !isAtivo) return false;
                if (filterStatus === "inativo" && isAtivo) return false;
            }
            if (filterPermissao) {
                const access = permissoes[(u.email ?? "").toLowerCase()] ?? "usuario";
                if (access !== filterPermissao) return false;
            }
            return true;
        });
    }, [usuarios, permissoes, query, filterCargo, filterNivel, filterStatus, filterPermissao]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    useEffect(() => { setCurrentPage(1); }, [query, filterCargo, filterNivel, filterStatus, filterPermissao]);

    const openCreate = () => { setForm(EMPTY_FORM); setIsCreateOpen(true); };

    const openEdit = (user: Usuario) => {
        setEditingUser(user);
        setForm({
            nome: user.nome,
            email: user.email ?? "",
            cargo: user.cargo ?? "",
            nivel: user.nivel ?? "",
            telefone: (user as any).telefone ?? "",
            localizacao: (user as any).localizacao ?? "",
            senha: "",
            nivel_acesso: permissoes[(user.email ?? "").toLowerCase()] ?? "usuario",
            status_atual: user.status_atual ?? "Ativo",
        });
        setIsEditOpen(true);
    };

    const getImpactoExclusao = (user: Usuario) => {
        const projetosAssociados = projetos.filter((projeto) => projeto.id_responsavel === user.id_usuario);
        const equipesAssociadas = equipes.filter((equipe) => equipe.criado_por === user.id_usuario);
        const projetosAtivos = projetosAssociados.filter((projeto) => {
            const status = (projeto.status_projeto ?? "").trim().toLowerCase();
            return !["concluído", "concluida", "cancelado", "cancelada"].includes(status);
        });

        const score = projetosAtivos.length * 5 + equipesAssociadas.length * 2;
        const nivel = score >= 10 ? "Alto" : score >= 4 ? "Médio" : "Baixo";

        return { projetosAssociados, equipesAssociadas, projetosAtivos, score, nivel };
    };

    const closeModal = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setEditingUser(null);
        setForm(EMPTY_FORM);
        // Reset filters to show new user
        setQuery("");
        setFilterCargo("");
        setFilterNivel("");
        setFilterStatus("");
        setFilterPermissao("");
        setCurrentPage(1);
    };

    const onCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const uRes = await fetch(apiRoutes.usuarios, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-TOKEN": csrfToken },
                body: JSON.stringify({
                    nome: form.nome,
                    email: form.email,
                    cargo: form.cargo || null,
                    nivel: form.nivel || null,
                    status_atual: form.status_atual,
                    telefone: form.telefone || null,
                    localizacao: form.localizacao || null,
                    senha: form.senha,
                    nivel_acesso: form.nivel_acesso,
                }),
            });
            if (!uRes.ok) {
                throw new Error(await readApiMessage(uRes, "Não foi possível cadastrar o funcionário."));
            }

            closeModal();
            setSuccess("Funcionário cadastrado com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível cadastrar o funcionário.");
        } finally {
            setSaving(false);
        }
    };

    const onSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUser) return;
        setSaving(true);
        setError(null);
        try {
            const uRes = await fetch(`${apiRoutes.usuarios}/${editingUser.id_usuario}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-TOKEN": csrfToken },
                body: JSON.stringify({
                    nome: form.nome,
                    email: form.email,
                    cargo: form.cargo || null,
                    nivel: form.nivel || null,
                    status_atual: form.status_atual,
                    telefone: form.telefone || null,
                    localizacao: form.localizacao || null,
                }),
            });
            if (!uRes.ok) throw new Error();
            await fetch(`${apiRoutes.senhas}/${encodeURIComponent(form.email)}/nivel-acesso`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-TOKEN": csrfToken },
                body: JSON.stringify({ nivel_acesso: form.nivel_acesso }),
            });
            if (form.senha.trim()) {
                await fetch(`${apiRoutes.senhas}/${encodeURIComponent(form.email)}/senha`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-TOKEN": csrfToken },
                    body: JSON.stringify({ senha: form.senha.trim() }),
                });
            }
            closeModal();
            setSuccess("Funcionário atualizado com sucesso.");
            await fetchData();
        } catch {
            setError("Não foi possível atualizar o funcionário.");
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async () => {
        if (!deletingUser) return;
        setDeletingId(deletingUser.id_usuario);
        setError(null);
        try {
            const uRes = await fetch(`${apiRoutes.usuarios}/${deletingUser.id_usuario}`, {
                method: "DELETE",
                headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-TOKEN": csrfToken },
            });
            if (!uRes.ok) {
                throw new Error(await readApiMessage(uRes, "Não foi possível excluir o funcionário."));
            }
            if (deletingUser.email) {
                await fetch(`${apiRoutes.senhas}/${encodeURIComponent(deletingUser.email)}`, {
                    method: "DELETE",
                    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-TOKEN": csrfToken },
                });
            }
            setIsDeleteOpen(false);
            setDeletingUser(null);
            setSuccess("Funcionário excluído com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível excluir o funcionário.");
        } finally {
            setDeletingId(null);
        }
    };

    const onToggleStatus = async () => {
        if (!statusUser) return;

        const nextStatus = isUsuarioAtivo(statusUser) ? "Inativo" : "Ativo";

        setStatusUpdatingId(statusUser.id_usuario);
        setError(null);

        try {
            const response = await fetch(`${apiRoutes.usuarios}/${statusUser.id_usuario}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": csrfToken,
                },
                body: JSON.stringify({ status_atual: nextStatus }),
            });

            if (!response.ok) {
                throw new Error(await readApiMessage(response, "Não foi possível alterar o status do funcionário."));
            }

            setSuccess(`Funcionário marcado como ${nextStatus.toLowerCase()} com sucesso.`);
            setIsStatusConfirmOpen(false);
            setStatusUser(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível alterar o status do funcionário.");
        } finally {
            setStatusUpdatingId(null);
        }
    };

    if (!isAdmin) {
        return (
            <DashboardLayout currentPage="users-admin">
                <div className="rounded-2xl border p-6" style={{ borderColor: "#f3d594", backgroundColor: "#fff8e8", color: "#8a5a00" }}>
                    Acesso restrito: esta área é exclusiva para administradores.
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout currentPage="users-admin">
            <div className="space-y-5">

                {/* Toasts */}
                {success && (
                    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#9ed7b0", backgroundColor: "#effbf3", color: "#1b6d3f" }}>
                        {success}
                    </div>
                )}
                {error && (
                    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#e2a0a0", backgroundColor: "#fff3f3", color: "#9a2b2b" }}>
                        {error}
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>Usuários</h1>
                        <p className="mt-0.5 text-sm" style={{ color: "var(--cor-logo2)" }}>
                            Área administrativa para cadastro, permissão e exclusão de funcionários.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
                        style={{ backgroundColor: "#1a1a2e", color: "#fff" }}
                    >
                        <UserPlus size={15} />
                        Adicionar funcionário
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        { label: "Total de Usuários", value: stats.total, icon: <Users size={28} style={{ color: "#5b8dee" }} />, iconBg: "#eef2ff" },
                        { label: "Administradores", value: stats.admins, icon: <Shield size={28} style={{ color: "#9b59b6" }} />, iconBg: "#f5eeff" },
                        { label: "Usuários Ativos", value: stats.ativos, icon: <UserCheck size={28} style={{ color: "#27ae60" }} />, iconBg: "#edfbf3" },
                        { label: "Usuários Inativos", value: stats.inativos, icon: <UserMinus size={28} style={{ color: "#aaa" }} />, iconBg: "#f5f5f5" },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="flex items-center justify-between rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg hover:border-opacity-75"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                        >
                            <div>
                                <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>{card.label}</p>
                                <p className="mt-1 text-3xl font-bold" style={{ color: "var(--cor-logo)" }}>{card.value}</p>
                            </div>
                            <div className="flex items-center justify-center rounded-full p-3" style={{ backgroundColor: card.iconBg }}>
                                {card.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table card */}
                <div className="rounded-2xl border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>

                    {/* Filter row */}
                    <div className="flex flex-wrap items-center gap-3 border-b p-4" style={{ borderColor: "var(--cor-borda)" }}>
                        <div className="relative flex-1" style={{ minWidth: 200 }}>
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--cor-logo2)" }} />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Pesquisar por nome, email ou cargo"
                                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-offset-0 focus:border-opacity-0"
                                style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)", "--tw-ring-color": "var(--cor-logo2)" } as any}
                            />
                        </div>
                        <SelectFilter value={filterCargo} onChange={setFilterCargo} placeholder="Todos os cargos" options={cargosUnicos.map((c) => ({ label: c, value: c }))} />
                        <SelectFilter value={filterNivel} onChange={setFilterNivel} placeholder="Todos os níveis" options={niveisUnicos.map((n) => ({ label: n, value: n }))} />
                        <SelectFilter value={filterStatus} onChange={setFilterStatus} placeholder="Todas" options={[{ label: "Ativo", value: "ativo" }, { label: "Inativo", value: "inativo" }]} />
                        <SelectFilter value={filterPermissao} onChange={setFilterPermissao} placeholder="Todos" options={[{ label: "Administrador", value: "admin" }, { label: "Usuário", value: "usuario" }]} />
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-sm" style={{ color: "var(--cor-logo2)" }}>Carregando usuários...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-sm" style={{ color: "var(--cor-logo2)" }}>Nenhum usuário encontrado.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: "var(--cor-borda)" }}>
                                        {["Nome", "Email", "Telefone", "Localização", "Cargo", "Nível", "Permissão", "Status", "Último Acesso", "Data de Criação", "Ações"].map((h) => (
                                            <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedUsers.map((user) => {
                                        const access = permissoes[(user.email ?? "").toLowerCase()] ?? "usuario";
                                        return (
                                            <tr key={user.id_usuario} className="border-b last:border-b-0 transition-all duration-200 hover:shadow-sm" style={{ borderColor: "var(--cor-borda)" }}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar nome={user.nome} foto={user.foto_perfil} />
                                                        <span className="whitespace-nowrap font-medium" style={{ color: "var(--cor-logo)" }}>{user.nome}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs" style={{ color: "var(--cor-logo2)" }}>{user.email ?? "—"}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: "var(--cor-logo2)" }}>{(user as any).telefone ?? '—'}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: "var(--cor-logo2)" }}>{(user as any).localizacao ?? '—'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--cor-logo)" }}>{user.cargo ?? "—"}</td>
                                                <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--cor-logo)" }}>{user.nivel ?? "—"}</td>
                                                <td className="px-4 py-3"><PermissionBadge access={access} /></td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge
                                                        user={user}
                                                        disabled={statusUpdatingId === user.id_usuario}
                                                        onClick={() => {
                                                            setStatusUser(user);
                                                            setIsStatusConfirmOpen(true);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--cor-logo2)" }}>{formatDateTime(user.ultimo_acesso)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--cor-logo2)" }}>{formatDateTime(user.data_criacao)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDeletingUser(user); setIsDeleteOpen(true); }}
                                                            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:shadow-md"
                                                            style={{ borderColor: "#e2a0a0", color: "#a02020" }}
                                                        >
                                                            Excluir
                                                        </button>
                                                        <ActionMenu
                                                            onEdit={() => openEdit(user)}
                                                            onDelete={() => { setDeletingUser(user); setIsDeleteOpen(true); }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && filteredUsers.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" style={{ borderColor: "var(--cor-borda)" }}>
                            <span className="text-xs" style={{ color: "var(--cor-logo2)" }}>
                                Mostrando {pagedUsers.length} de {filteredUsers.length} resultado{filteredUsers.length !== 1 ? "s" : ""}
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className="rounded-lg border px-3 py-1.5 text-sm transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Anterior
                                </button>
                                <span className="text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Página {safePage} de {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className="rounded-lg border px-3 py-1.5 text-sm transition-all duration-200 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Create / Edit Modal */}
                {(isCreateOpen || isEditOpen) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <form
                            onSubmit={isCreateOpen ? onCreate : onSaveEdit}
                            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
                                    {isCreateOpen ? "Adicionar funcionário" : "Editar funcionário"}
                                </h2>
                                <button type="button" onClick={closeModal} className="rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md active:scale-90" style={{ borderColor: "var(--cor-borda)" }}>
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {(
                                    [
                                        { label: "Nome", field: "nome" as const, type: "text", required: true, placeholder: "Ex: João Silva" },
                                        { label: "Email", field: "email" as const, type: "email", required: true, placeholder: "Ex: joao@email.com" },
                                        { label: "Nível", field: "nivel" as const, type: "text", required: false, placeholder: "Ex: Pleno" },
                                    ] as const
                                ).map(({ label, field, type, required, placeholder }) => (
                                    <label key={field} className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                        {label}
                                        <input
                                            type={type}
                                            required={required}
                                            value={form[field]}
                                            placeholder={placeholder}
                                            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                                            className="rounded-xl border px-3 py-2 text-sm outline-none"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                        />
                                    </label>
                                ))}

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Telefone
                                    <input
                                        type="text"
                                        value={form.telefone ?? ""}
                                        placeholder="Ex: +55 11 98888-8888"
                                        onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Localização
                                    <input
                                        type="text"
                                        value={form.localizacao ?? ""}
                                        placeholder="Ex: São Paulo, SP"
                                        onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Cargo
                                    <Select
                                        value={form.cargo || "__none__"}
                                        onValueChange={(v) => setForm((f) => ({ ...f, cargo: v === "__none__" ? "" : v }))}
                                    >
                                        <SelectTrigger
                                            className="w-full rounded-xl border text-sm"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                        >
                                            <SelectValue placeholder="Selecione um cargo" />
                                        </SelectTrigger>
                                        <SelectContent className="border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}>
                                            <SelectItem value="__none__" style={{ color: "var(--cor-logo2)" }}>Sem cargo</SelectItem>
                                            {cargos.map((cargo) => (
                                                <SelectItem key={cargo.id_cargo} value={cargo.nome_cargo} style={{ color: "var(--cor-logo)" }}>
                                                    {cargo.nome_cargo}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Permissão
                                    <Select
                                        value={form.nivel_acesso}
                                        onValueChange={(v) => setForm((f) => ({ ...f, nivel_acesso: v as AccessLevel }))}
                                    >
                                        <SelectTrigger
                                            className="w-full rounded-xl border text-sm"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}>
                                            <SelectItem value="usuario" style={{ color: "var(--cor-logo)" }}>Usuário</SelectItem>
                                            <SelectItem value="admin" style={{ color: "var(--cor-logo)" }}>Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Status
                                    <Select
                                        value={form.status_atual}
                                        onValueChange={(v) => setForm((f) => ({ ...f, status_atual: v }))}
                                    >
                                        <SelectTrigger
                                            className="w-full rounded-xl border text-sm"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}>
                                            <SelectItem value="Ativo" style={{ color: "var(--cor-logo)" }}>Ativo</SelectItem>
                                            <SelectItem value="Inativo" style={{ color: "var(--cor-logo)" }}>Inativo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium md:col-span-2" style={{ color: "var(--cor-logo)" }}>
                                    {isCreateOpen ? "Senha" : "Nova senha (opcional)"}
                                    <input
                                        type="password"
                                        required={isCreateOpen}
                                        minLength={isCreateOpen ? 6 : undefined}
                                        value={form.senha}
                                        placeholder={isCreateOpen ? "Mínimo 6 caracteres" : "Deixe em branco para não alterar"}
                                        onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-offset-0 focus:border-opacity-0"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)", "--tw-ring-color": "var(--cor-logo2)" } as any}
                                    />
                                </label>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl border px-4 py-2 text-sm transition-all duration-200 hover:bg-opacity-5 active:scale-95"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: "#1a1a2e" }}
                                >
                                    {saving ? "Salvando..." : "Salvar"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Delete Modal */}
                {isDeleteOpen && deletingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
                        {(() => {
                            const impacto = getImpactoExclusao(deletingUser);

                            return (
                        <div
                            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <Avatar nome={deletingUser.nome} />
                                <h3 className="text-base font-semibold" style={{ color: "var(--cor-logo)" }}>
                                    Excluir funcionário
                                </h3>
                            </div>
                            <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
                                Deseja excluir{" "}
                                <strong style={{ color: "var(--cor-logo)" }}>{deletingUser.nome}</strong>?
                                {" "}Esta ação remove o funcionário e suas credenciais de login permanentemente.
                            </p>
                            <div className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-semibold">Prejuízo estimado</span>
                                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: impacto.nivel === "Alto" ? "#fde8e8" : impacto.nivel === "Médio" ? "#fff3cd" : "#edf7ed", color: impacto.nivel === "Alto" ? "#9a2b2b" : impacto.nivel === "Médio" ? "#8a5a00" : "#1d6a45" }}>
                                        {impacto.nivel}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs" style={{ color: "var(--cor-logo2)" }}>
                                    Pontuação calculada: {impacto.score}. Baseada em projetos ativos e equipes criadas por este funcionário.
                                </p>
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>Projetos associados</p>
                                        {impacto.projetosAssociados.length > 0 ? (
                                            <ul className="mt-1 space-y-1 text-xs" style={{ color: "var(--cor-logo)" }}>
                                                {impacto.projetosAssociados.map((projeto) => (
                                                    <li key={projeto.id_projeto} className="flex items-center justify-between gap-2">
                                                        <span className="truncate">{projeto.nome_projeto}</span>
                                                        <span style={{ color: "var(--cor-logo2)" }}>{projeto.status_projeto ?? "Sem status"}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-1 text-xs" style={{ color: "var(--cor-logo2)" }}>Nenhum projeto associado.</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>Equipes relacionadas</p>
                                        {impacto.equipesAssociadas.length > 0 ? (
                                            <ul className="mt-1 space-y-1 text-xs" style={{ color: "var(--cor-logo)" }}>
                                                {impacto.equipesAssociadas.map((equipe) => (
                                                    <li key={equipe.id_equipe} className="flex items-center justify-between gap-2">
                                                        <span className="truncate">{equipe.nome}</span>
                                                        <span style={{ color: "var(--cor-logo2)" }}>{equipe.tipo ?? "Equipe"}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-1 text-xs" style={{ color: "var(--cor-logo2)" }}>Nenhuma equipe vinculada.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsDeleteOpen(false); setDeletingUser(null); }}
                                    className="rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void onDelete()}
                                    disabled={deletingId === deletingUser.id_usuario}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                    style={{ backgroundColor: "#c0392b" }}
                                >
                                    {deletingId === deletingUser.id_usuario ? "Excluindo..." : "Excluir"}
                                </button>
                            </div>
                        </div>
                            );
                        })()}
                    </div>
                )}

                {/* Status Confirm Modal */}
                {isStatusConfirmOpen && statusUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
                        <div
                            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <Avatar nome={statusUser.nome} foto={statusUser.foto_perfil} />
                                <h3 className="text-base font-semibold" style={{ color: "var(--cor-logo)" }}>
                                    Confirmar alteração de status
                                </h3>
                            </div>
                            <p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
                                Tem certeza que deseja marcar <strong style={{ color: "var(--cor-logo)" }}>{statusUser.nome}</strong> como{" "}
                                <strong style={{ color: "var(--cor-logo)" }}>{isUsuarioAtivo(statusUser) ? "inativo" : "ativo"}</strong>?
                            </p>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsStatusConfirmOpen(false); setStatusUser(null); }}
                                    className="rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void onToggleStatus()}
                                    disabled={statusUpdatingId === statusUser.id_usuario}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                    style={{ backgroundColor: isUsuarioAtivo(statusUser) ? "#c0392b" : "#1d6a45" }}
                                >
                                    {statusUpdatingId === statusUser.id_usuario
                                        ? "Salvando..."
                                        : isUsuarioAtivo(statusUser)
                                            ? "Confirmar inativação"
                                            : "Confirmar ativação"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
