import { Head, usePage } from "@inertiajs/react";
import {
    Briefcase,
    Building2,
    CornerDownRight,
    History,
    MoreVertical,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    Undo2,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
    X,
    BriefcaseBusiness,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
    id_equipe?: number | null;
    equipe_relation?: { id_equipe: number; nome: string; tipo?: string | null } | null;
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
    criado_por?: number | null;
    equipe_pai?: number | null;
    tipo?: string | null;
    id_lider?: number | null;
    data_criacao?: string | null;
    membros?: number[];
}

interface UsuarioExcluido {
    id: number;
    nome: string;
    email: string;
    cargo?: string | null;
    nivel?: string | null;
    nivel_acesso?: string | null;
    projetos_afetados: number;
    equipes_afetadas: number;
    excluido_em: string;
    expira_em: string;
}

interface ApiEnvelope<T> {
    data?: T;
    message?: string;
    success?: boolean;
}

interface UserForm {
    nome: string;
    email: string;
    cargo: string;
    id_equipe: string;
    nivel: string;
    senha: string;
    nivel_acesso: AccessLevel;
    telefone?: string;
    localizacao?: string;
    status_atual: string;
}

// ─────────────────────────── Constants ───────────────────────────

const EMPTY_USER_FORM: UserForm = {
    nome: "",
    email: "",
    cargo: "",
    id_equipe: "",
    nivel: "",
    senha: "",
    nivel_acesso: "usuario",
    telefone: "",
    localizacao: "",
    status_atual: "Ativo",
};

const EMPTY_CARGO = { nome_cargo: "" };
const EMPTY_EQUIPE = { nome: "", equipe_pai: "", tipo: "SUBEQUIPE", id_lider: "", membros: [] as number[] };
const PAGE_SIZE = 10;

// ─────────────────────────── Helpers ───────────────────────────

function toAccessLevel(raw?: string | null): AccessLevel {
    const n = (raw ?? "").toLowerCase();
    return ["adm", "admin", "administrador", "total", "geral"].includes(n) ? "admin" : "usuario";
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

function getRemainingDaysLabel(expiraEm?: string | null): string {
    if (!expiraEm) return "tempo restante indisponível";
    const expiration = new Date(expiraEm).getTime();
    if (Number.isNaN(expiration)) return "tempo restante indisponível";
    const remainingMs = expiration - Date.now();
    if (remainingMs <= 0) return "expira hoje";
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return `expira em ${days} dia${days === 1 ? "" : "s"}`;
}

const ACTIVE_PRESENCE_WINDOW_MS = 45 * 1000;

function hasRecentAccess(ultimoAcesso?: string | null): boolean {
    if (!ultimoAcesso) return false;
    const timestamp = new Date(ultimoAcesso).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= ACTIVE_PRESENCE_WINDOW_MS;
}

function isUsuarioAtivo(usuario: Usuario): boolean {
    const status = usuario.status_atual?.trim().toLowerCase();
    if (status === "inativo") return false;
    if (hasRecentAccess(usuario.ultimo_acesso)) return true;
    return !status || status === "ativo";
}

async function readApiMessage(response: Response, fallback: string): Promise<string> {
    try {
        const payload = (await response.json()) as { message?: string };
        return payload.message ?? fallback;
    } catch {
        return fallback;
    }
}

function readApiMessageSync(payload: unknown, fallback: string): string {
    if (payload && typeof payload === "object" && "message" in payload) {
        const msg = (payload as { message?: unknown }).message;
        if (typeof msg === "string" && msg.trim()) return msg;
    }
    return fallback;
}

// ─────────────────────────── Sub-components ───────────────────────────

function Avatar({ nome, foto }: { nome: string; foto?: string | null }) {
    const color = getAvatarColor(nome);
    return (
        <span
            className="inline-flex items-center justify-center overflow-hidden rounded-full text-xs font-semibold transition-all duration-200 hover:shadow-md"
            style={{ width: 32, height: 32, backgroundColor: color.bg, color: color.text, flexShrink: 0 }}
        >
            {foto ? <img src={foto} alt={nome} className="h-full w-full object-cover" /> : getInitials(nome)}
        </span>
    );
}

function PermissionBadge({ access }: { access: AccessLevel }) {
    if (access === "admin") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#1a1a2e] dark:bg-[#2c5a7e] text-white">
                <Shield size={10} /> Administrador
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold border-[#bbb] text-[#444] dark:border-(--cor-borda) dark:text-(--cor-logo2)">
            Usuário
        </span>
    );
}

function StatusBadge({ user, onClick, disabled }: { user: Usuario; onClick?: () => void; disabled?: boolean }) {
    const isAtivo = isUsuarioAtivo(user);
    const st = isAtivo
        ? { borderColor: "#4caf85", color: "#1d6a45" }
        : { borderColor: "#e07070", color: "#a02020" };
    if (onClick) {
        return (
            <button type="button" onClick={onClick} disabled={disabled}
                className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:shadow-md disabled:opacity-60"
                style={st}
            >
                {isAtivo ? "Ativo" : "Inativo"}
            </button>
        );
    }
    return (
        <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={st}>
            {isAtivo ? "Ativo" : "Inativo"}
        </span>
    );
}

function SelectFilter({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void;
    options: { label: string; value: string }[]; placeholder: string;
}) {
    return (
        <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
            <SelectTrigger
                size="sm"
                className="min-w-[140px] rounded-lg border text-sm transition-all duration-200 hover:shadow-md"
                style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}>
                <SelectItem value="__all__" style={{ color: "var(--cor-logo2)" }}>{placeholder}</SelectItem>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value} style={{ color: "var(--cor-logo)" }}>{o.label}</SelectItem>
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
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="flex items-center justify-center rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md active:scale-95"
                style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
            >
                <MoreVertical size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-8 z-30 min-w-[130px] rounded-xl border py-1 shadow-lg animate-in zoom-in-95 fade-in duration-150"
                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                    <button type="button" className="w-full px-4 py-2 text-left text-sm" style={{ color: "var(--cor-logo)" }}
                        onClick={() => { setOpen(false); onEdit(); }}>Editar</button>
                    <button type="button" className="w-full px-4 py-2 text-left text-sm" style={{ color: "#c0392b" }}
                        onClick={() => { setOpen(false); onDelete(); }}>Excluir</button>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--cor-logo2)" }}>
                {icon} {label}
            </div>
            <p className="mt-2 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>{value}</p>
        </div>
    );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className="rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-95"
            style={{
                borderColor: active ? "var(--cor-logo)" : "var(--cor-borda)",
                backgroundColor: active ? "var(--cor-logo)" : "var(--cor-widgets)",
                color: active ? "#ffffff" : "var(--cor-logo)",
            }}>
            {label}
        </button>
    );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border p-2" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                {icon}
            </div>
            <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--cor-logo)" }}>{title}</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--cor-logo2)" }}>{subtitle}</p>
            </div>
        </div>
    );
}

function FieldLabel({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
            <span>{label}</span>
            {description && <span className="text-xs font-normal" style={{ color: "var(--cor-logo2)" }}>{description}</span>}
            {children}
        </label>
    );
}

function IconButton({ children, onClick, title, danger = false, disabled = false }: {
    children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; disabled?: boolean;
}) {
    return (
        <button type="button" onClick={onClick} title={title} disabled={disabled}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition hover:-translate-y-0.5 disabled:opacity-60"
            style={{
                borderColor: danger ? "rgba(176, 58, 58, 0.4)" : "var(--cor-borda)",
                backgroundColor: danger ? "rgba(176, 58, 58, 0.1)" : "var(--cor-fundo)",
                color: danger ? "#c55" : "var(--cor-logo)",
            }}>
            {children}
        </button>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed px-4 py-6 text-sm" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}>
            {text}
        </div>
    );
}

// ─────────────────────────── Main Component ───────────────────────────

export default function GestaoPage() {
    const page = usePage<PageProps>();
    const isAdmin = Boolean(page.props.auth?.user?.permissions?.total);

    // ── Tab ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"usuarios" | "cargos" | "equipes">("usuarios");

    // ── Shared ───────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ── Usuários state ───────────────────────────────────────────
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [permissoes, setPermissoes] = useState<Record<string, AccessLevel>>({});
    const [projetos, setProjetos] = useState<ProjetoItem[]>([]);
    const [savingUser, setSavingUser] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [filterCargo, setFilterCargo] = useState("");
    const [filterNivel, setFilterNivel] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPermissao, setFilterPermissao] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER_FORM);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [deletingUser, setDeletingUser] = useState<Usuario | null>(null);
    const [statusUser, setStatusUser] = useState<Usuario | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
    const [deletedHistory, setDeletedHistory] = useState<UsuarioExcluido[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [restoringDeletedId, setRestoringDeletedId] = useState<number | null>(null);

    // ── Cargos state ─────────────────────────────────────────────
    const [cargos, setCargos] = useState<CargoItem[]>([]);
    const [cargoForm, setCargoForm] = useState(EMPTY_CARGO);
    const [editingCargo, setEditingCargo] = useState<CargoItem | null>(null);
    const [savingCargo, setSavingCargo] = useState(false);
    const [deletingCargoId, setDeletingCargoId] = useState<number | null>(null);

    // ── Equipes state ─────────────────────────────────────────────
    const [equipes, setEquipes] = useState<EquipeItem[]>([]);
    const [equipeForm, setEquipeForm] = useState(EMPTY_EQUIPE);
    const [editingEquipe, setEditingEquipe] = useState<EquipeItem | null>(null);
    const [savingEquipe, setSavingEquipe] = useState(false);
    const [deletingEquipeId, setDeletingEquipeId] = useState<number | null>(null);
    const [membrosSearch, setMembrosSearch] = useState("");

    const csrfToken = useMemo(
        () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "",
        [],
    );

    const authHeaders = useMemo(() => ({
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(csrfToken ? { "X-CSRF-TOKEN": csrfToken } : {}),
    }), [csrfToken]);

    // ── Fetch ─────────────────────────────────────────────────────

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usuariosRes, cargosRes, equipesRes] = await Promise.all([
                fetch(apiRoutes.usuarios, { headers: { Accept: "application/json" } }),
                fetch(apiRoutes.cargos, { headers: { Accept: "application/json" } }),
                fetch(apiRoutes.equipes, { headers: { Accept: "application/json" } }),
            ]);

            const uPayload = (await usuariosRes.json().catch(() => ({}))) as ApiEnvelope<{ usuarios?: Usuario[] }>;
            const cPayload = (await cargosRes.json().catch(() => ({}))) as ApiEnvelope<{ cargos?: CargoItem[] }>;
            const ePayload = (await equipesRes.json().catch(() => ({}))) as ApiEnvelope<{ equipes?: EquipeItem[] }>;

            setUsuarios(uPayload.data?.usuarios ?? []);
            setCargos(cPayload.data?.cargos ?? []);
            setEquipes(ePayload.data?.equipes ?? []);

            try {
                const [senhasRes, projetosRes] = await Promise.all([
                    fetch(apiRoutes.senhas, { headers: { Accept: "application/json" } }),
                    fetch(apiRoutes.projetos, { headers: { Accept: "application/json" } }),
                ]);
                if (senhasRes.ok) {
                    const sPayload = (await senhasRes.json()) as ApiEnvelope<{ senhas?: SenhaRegistro[] }>;
                    const map: Record<string, AccessLevel> = {};
                    (sPayload.data?.senhas ?? []).forEach((r) => { map[r.email.toLowerCase()] = toAccessLevel(r.nivel_acesso); });
                    setPermissoes(map);
                }
                if (projetosRes.ok) {
                    const pPayload = (await projetosRes.json()) as ApiEnvelope<{ projetos?: ProjetoItem[] }>;
                    setProjetos(pPayload.data?.projetos ?? []);
                }
            } catch { /* permissoes e projetos são opcionais */ }
        } catch {
            setError("Não foi possível carregar os dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (isAdmin) void fetchData(); }, [isAdmin]);

    useEffect(() => {
        if (!success) return;
        const t = window.setTimeout(() => setSuccess(null), 3000);
        return () => window.clearTimeout(t);
    }, [success]);

    // ── Usuários computed ─────────────────────────────────────────

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

    // ── Equipes computed ──────────────────────────────────────────

    const totalSubequipes = useMemo(() => equipes.filter((e) => (e.tipo ?? "SUBEQUIPE") === "SUBEQUIPE").length, [equipes]);
    const totalEmpresas = useMemo(() => equipes.filter((e) => (e.tipo ?? "SUBEQUIPE") === "EMPRESA").length, [equipes]);

    // ── Usuários actions ──────────────────────────────────────────

    const closeUserModal = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setEditingUser(null);
        setUserForm(EMPTY_USER_FORM);
        setQuery(""); setFilterCargo(""); setFilterNivel(""); setFilterStatus(""); setFilterPermissao("");
        setCurrentPage(1);
    };

    const openEdit = (user: Usuario) => {
        setEditingUser(user);
        setUserForm({
            nome: user.nome,
            email: user.email ?? "",
            cargo: user.cargo ?? "",
            id_equipe: user.id_equipe ? String(user.id_equipe) : "",
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
        const projetosAssociados = projetos.filter((p) => p.id_responsavel === user.id_usuario);
        const equipesAssociadas = equipes.filter((e) => e.criado_por === user.id_usuario);
        const projetosAtivos = projetosAssociados.filter((p) => {
            const s = (p.status_projeto ?? "").trim().toLowerCase();
            return !["concluído", "concluida", "cancelado", "cancelada"].includes(s);
        });
        const score = projetosAtivos.length * 5 + equipesAssociadas.length * 2;
        return { projetosAssociados, equipesAssociadas, projetosAtivos, nivel: score >= 10 ? "Alto" : score >= 4 ? "Médio" : "Baixo" };
    };

    const onCreate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingUser(true);
        setError(null);
        try {
            const res = await fetch(apiRoutes.usuarios, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                    nome: userForm.nome, email: userForm.email,
                    cargo: userForm.cargo || null,
                    id_equipe: userForm.id_equipe ? Number(userForm.id_equipe) : null,
                    nivel: userForm.nivel || null,
                    status_atual: userForm.status_atual,
                    telefone: userForm.telefone || null,
                    localizacao: userForm.localizacao || null,
                    senha: userForm.senha,
                    nivel_acesso: userForm.nivel_acesso,
                }),
            });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível cadastrar o funcionário."));
            closeUserModal();
            setSuccess("Funcionário cadastrado com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível cadastrar o funcionário.");
        } finally {
            setSavingUser(false);
        }
    };

    const onSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUser) return;
        setSavingUser(true);
        setError(null);
        try {
            const res = await fetch(`${apiRoutes.usuarios}/${editingUser.id_usuario}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                    nome: userForm.nome, email: userForm.email,
                    cargo: userForm.cargo || null,
                    id_equipe: userForm.id_equipe ? Number(userForm.id_equipe) : null,
                    nivel: userForm.nivel || null,
                    status_atual: userForm.status_atual,
                    telefone: userForm.telefone || null,
                    localizacao: userForm.localizacao || null,
                }),
            });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível atualizar o funcionário."));
            await fetch(`${apiRoutes.senhas}/${encodeURIComponent(userForm.email)}/nivel-acesso`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ nivel_acesso: userForm.nivel_acesso }),
            });
            if (userForm.senha.trim()) {
                await fetch(`${apiRoutes.senhas}/${encodeURIComponent(userForm.email)}/senha`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", ...authHeaders },
                    body: JSON.stringify({ senha: userForm.senha.trim() }),
                });
            }
            closeUserModal();
            setSuccess("Funcionário atualizado com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível atualizar o funcionário.");
        } finally {
            setSavingUser(false);
        }
    };

    const onDeleteUser = async () => {
        if (!deletingUser) return;
        setDeletingUserId(deletingUser.id_usuario);
        setError(null);
        try {
            const res = await fetch(`${apiRoutes.usuarios}/${deletingUser.id_usuario}`, {
                method: "DELETE", headers: authHeaders,
            });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível excluir o funcionário."));
            if (deletingUser.email) {
                await fetch(`${apiRoutes.senhas}/${encodeURIComponent(deletingUser.email)}`, {
                    method: "DELETE", headers: authHeaders,
                });
            }
            setIsDeleteOpen(false);
            setDeletingUser(null);
            setSuccess("Funcionário excluído com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível excluir o funcionário.");
        } finally {
            setDeletingUserId(null);
        }
    };

    const onToggleStatus = async () => {
        if (!statusUser) return;
        const nextStatus = isUsuarioAtivo(statusUser) ? "Inativo" : "Ativo";
        setStatusUpdatingId(statusUser.id_usuario);
        setError(null);
        try {
            const res = await fetch(`${apiRoutes.usuarios}/${statusUser.id_usuario}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ status_atual: nextStatus }),
            });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível alterar o status."));
            setSuccess(`Funcionário marcado como ${nextStatus.toLowerCase()} com sucesso.`);
            setIsStatusConfirmOpen(false);
            setStatusUser(null);
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível alterar o status.");
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const loadDeletedHistory = async () => {
        setHistoryLoading(true);
        setError(null);
        try {
            const res = await fetch(apiRoutes.usuariosExcluidosHistorico, { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível carregar o histórico."));
            const payload = (await res.json()) as ApiEnvelope<{ usuarios_excluidos?: UsuarioExcluido[] }>;
            setDeletedHistory(payload.data?.usuarios_excluidos ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
        } finally {
            setHistoryLoading(false);
        }
    };

    const openDeletedHistory = async () => { setIsHistoryOpen(true); await loadDeletedHistory(); };

    const restoreDeletedUser = async (registro: UsuarioExcluido) => {
        setRestoringDeletedId(registro.id);
        setError(null);
        try {
            const res = await fetch(apiRoutes.usuariosExcluidosRestaurar(registro.id), {
                method: "POST", headers: authHeaders,
            });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível restaurar o usuário."));
            setSuccess(`Usuário ${registro.nome} restaurado com sucesso.`);
            await Promise.all([fetchData(), loadDeletedHistory()]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível restaurar o usuário.");
        } finally {
            setRestoringDeletedId(null);
        }
    };

    // ── Cargos actions ────────────────────────────────────────────

    const resetCargoForm = () => { setEditingCargo(null); setCargoForm(EMPTY_CARGO); };

    const submitCargo = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingCargo(true);
        setError(null);
        try {
            const url = editingCargo ? `${apiRoutes.cargos}/${editingCargo.id_cargo}` : apiRoutes.cargos;
            const res = await fetch(url, {
                method: editingCargo ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ nome_cargo: cargoForm.nome_cargo }),
            });
            if (!res.ok) {
                const p = await res.json().catch(() => null);
                throw new Error(readApiMessageSync(p, "Não foi possível salvar o cargo."));
            }
            setSuccess(editingCargo ? "Cargo atualizado com sucesso." : "Cargo criado com sucesso.");
            resetCargoForm();
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível salvar o cargo.");
        } finally {
            setSavingCargo(false);
        }
    };

    const removeCargo = async (id: number) => {
        setDeletingCargoId(id);
        setError(null);
        try {
            const res = await fetch(`${apiRoutes.cargos}/${id}`, { method: "DELETE", headers: authHeaders });
            if (!res.ok) {
                const p = await res.json().catch(() => null);
                throw new Error(readApiMessageSync(p, "Não foi possível excluir o cargo."));
            }
            setSuccess("Cargo excluído com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível excluir o cargo.");
        } finally {
            setDeletingCargoId(null);
        }
    };

    // ── Equipes actions ───────────────────────────────────────────

    const resetEquipeForm = () => { setEditingEquipe(null); setEquipeForm(EMPTY_EQUIPE); setMembrosSearch(""); };

    const toggleMembro = (id: number) => {
        setEquipeForm((c) => ({
            ...c,
            membros: c.membros.includes(id) ? c.membros.filter((m) => m !== id) : [...c.membros, id],
        }));
    };

    const submitEquipe = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSavingEquipe(true);
        setError(null);
        try {
            const authUserId = page.props.auth?.user?.id;
            const payload = {
                nome: equipeForm.nome,
                criado_por: editingEquipe ? (editingEquipe.criado_por ?? authUserId) : authUserId,
                equipe_pai: equipeForm.equipe_pai ? Number(equipeForm.equipe_pai) : null,
                tipo: equipeForm.tipo,
                id_lider: equipeForm.id_lider ? Number(equipeForm.id_lider) : null,
                membros: equipeForm.membros,
            };
            const url = editingEquipe ? `${apiRoutes.equipes}/${editingEquipe.id_equipe}` : apiRoutes.equipes;
            const res = await fetch(url, {
                method: editingEquipe ? "PUT" : "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const p = await res.json().catch(() => null);
                throw new Error(readApiMessageSync(p, "Não foi possível salvar a equipe."));
            }
            setSuccess(editingEquipe ? "Equipe atualizada com sucesso." : "Equipe criada com sucesso.");
            resetEquipeForm();
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível salvar a equipe.");
        } finally {
            setSavingEquipe(false);
        }
    };

    const removeEquipe = async (id: number) => {
        setDeletingEquipeId(id);
        setError(null);
        try {
            const res = await fetch(`${apiRoutes.equipes}/${id}`, { method: "DELETE", headers: authHeaders });
            if (!res.ok) {
                const p = await res.json().catch(() => null);
                throw new Error(readApiMessageSync(p, "Não foi possível excluir a equipe."));
            }
            setSuccess("Equipe excluída com sucesso.");
            await fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Não foi possível excluir a equipe.");
        } finally {
            setDeletingEquipeId(null);
        }
    };

    // ── Access guard ──────────────────────────────────────────────

    if (!isAdmin) {
        return (
            <DashboardLayout currentPage="gestao">
                <Head title="Gestão" />
                <div className="rounded-3xl border p-6" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                    <p style={{ color: "var(--cor-logo)" }}>Acesso restrito a administradores.</p>
                </div>
            </DashboardLayout>
        );
    }

    // ── Render ────────────────────────────────────────────────────

    return (
        <DashboardLayout currentPage="gestao">
            <Head title="Gestão" />

            <div className="space-y-6 pb-8">

                {/* Toasts */}
                {success && (
                    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(74,185,110,0.5)", backgroundColor: "rgba(74,185,110,0.1)", color: "#2e9e56" }}>
                        {success}
                    </div>
                )}
                {error && (
                    <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(192,57,43,0.5)", backgroundColor: "rgba(192,57,43,0.1)", color: "#c05050" }}>
                        {error}
                    </div>
                )}

                {/* Header banner */}
                <section className="gestao-banner relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_22px_60px_rgba(25,42,67,0.12)]" style={{ borderColor: "var(--cor-borda)" }}>
                    <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,rgba(92,127,168,0.16),transparent_70%)] md:block" />
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-2xl space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" style={{ borderColor: "#d4e0eb", color: "var(--cor-logo2)" }}>
                                <Shield size={14} />
                                Gestão da empresa
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--cor-logo)" }}>
                                    Usuários, cargos e equipes em um único painel
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm md:text-base" style={{ color: "var(--cor-logo2)" }}>
                                    Gerencie todo o quadro de funcionários, os cargos e a estrutura de equipes da empresa em um único lugar.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <StatCard icon={<Users size={18} />} label="Usuários" value={stats.total} />
                            <StatCard icon={<BriefcaseBusiness size={18} />} label="Cargos" value={cargos.length} />
                            <StatCard icon={<Building2 size={18} />} label="Equipes" value={equipes.length} />
                            <StatCard icon={<CornerDownRight size={18} />} label="Subequipes" value={totalSubequipes} />
                        </div>
                    </div>
                </section>

                {/* Tabs */}
                <div className="flex flex-wrap gap-3">
                    <TabButton active={activeTab === "usuarios"} onClick={() => setActiveTab("usuarios")} label="Usuários" />
                    <TabButton active={activeTab === "cargos"} onClick={() => setActiveTab("cargos")} label="Cargos" />
                    <TabButton active={activeTab === "equipes"} onClick={() => setActiveTab("equipes")} label="Equipes" />
                </div>

                {loading && (
                    <div className="rounded-3xl border p-6" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                        <p style={{ color: "var(--cor-logo2)" }}>Carregando...</p>
                    </div>
                )}

                {/* ══════════════════ TAB: USUÁRIOS ══════════════════ */}
                {activeTab === "usuarios" && !loading && (
                    <div className="space-y-6 animate-in fade-in duration-200">

                        {/* Stat cards — mesma linha do header banner */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {[
                                { label: "Total de Usuários", value: stats.total, icon: <Users size={18} /> },
                                { label: "Administradores", value: stats.admins, icon: <Shield size={18} /> },
                                { label: "Ativos", value: stats.ativos, icon: <UserCheck size={18} /> },
                                { label: "Inativos", value: stats.inativos, icon: <UserMinus size={18} /> },
                            ].map((card) => (
                                <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
                            ))}
                        </div>

                        {/* Table section — mesmo padrão de Cargos/Equipes */}
                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>

                            {/* Section header + actions */}
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <SectionHeader
                                    icon={<Users size={18} />}
                                    title="Funcionários cadastrados"
                                    subtitle="Gerencie o cadastro, permissões e status dos colaboradores."
                                />
                                <div className="flex flex-wrap gap-3">
                                    <button type="button" onClick={() => void openDeletedHistory()}
                                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>
                                        <History size={15} /> Histórico de excluídos
                                    </button>
                                    <button type="button" onClick={() => { setUserForm(EMPTY_USER_FORM); setIsCreateOpen(true); }}
                                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>
                                        <UserPlus size={15} /> Adicionar funcionário
                                    </button>
                                </div>
                            </div>

                            {/* Filter bar */}
                            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border p-3" style={{ borderColor: "var(--cor-borda)" }}>
                                <div className="relative flex-1" style={{ minWidth: 180 }}>
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--cor-logo2)" }} />
                                    <input value={query} onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Pesquisar por nome, email ou cargo"
                                        className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition-all duration-200"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }} />
                                </div>
                                <SelectFilter value={filterCargo} onChange={setFilterCargo} placeholder="Todos os cargos" options={cargosUnicos.map((c) => ({ label: c, value: c }))} />
                                <SelectFilter value={filterNivel} onChange={setFilterNivel} placeholder="Todos os níveis" options={niveisUnicos.map((n) => ({ label: n, value: n }))} />
                                <SelectFilter value={filterStatus} onChange={setFilterStatus} placeholder="Todas" options={[{ label: "Ativo", value: "ativo" }, { label: "Inativo", value: "inativo" }]} />
                                <SelectFilter value={filterPermissao} onChange={setFilterPermissao} placeholder="Todos" options={[{ label: "Administrador", value: "admin" }, { label: "Usuário", value: "usuario" }]} />
                            </div>

                            {/* Table */}
                            <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--cor-borda)" }}>
                                {filteredUsers.length === 0 ? (
                                    <EmptyState text="Nenhum usuário encontrado." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}>
                                                    {["Nome", "Email", "Telefone", "Localização", "Cargo", "Nível", "Permissão", "Status", "Último Acesso", "Data de Criação", "Ações"].map((h) => (
                                                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedUsers.map((user) => {
                                                    const access = permissoes[(user.email ?? "").toLowerCase()] ?? "usuario";
                                                    return (
                                                        <tr key={user.id_usuario} className="border-b last:border-b-0 transition hover:-translate-y-px hover:shadow-sm" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar nome={user.nome} foto={user.foto_perfil} />
                                                                    <span className="whitespace-nowrap font-medium" style={{ color: "var(--cor-logo)" }}>{user.nome}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs" style={{ color: "var(--cor-logo2)" }}>{user.email ?? "—"}</td>
                                                            <td className="px-4 py-3 text-xs" style={{ color: "var(--cor-logo2)" }}>{(user as any).telefone ?? "—"}</td>
                                                            <td className="px-4 py-3 text-xs" style={{ color: "var(--cor-logo2)" }}>{(user as any).localizacao ?? "—"}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--cor-logo)" }}>{user.cargo ?? "—"}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--cor-logo)" }}>{user.nivel ?? "—"}</td>
                                                            <td className="px-4 py-3"><PermissionBadge access={access} /></td>
                                                            <td className="px-4 py-3">
                                                                <StatusBadge user={user} disabled={statusUpdatingId === user.id_usuario}
                                                                    onClick={() => { setStatusUser(user); setIsStatusConfirmOpen(true); }} />
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--cor-logo2)" }}>{formatDateTime(user.ultimo_acesso)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--cor-logo2)" }}>{formatDateTime(user.data_criacao)}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <button type="button" onClick={() => { setDeletingUser(user); setIsDeleteOpen(true); }}
                                                                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5"
                                                                        style={{ borderColor: "#efb4b4", backgroundColor: "#fff4f4", color: "#b23b3b" }}>
                                                                        <Trash2 size={12} /> Excluir
                                                                    </button>
                                                                    <ActionMenu onEdit={() => openEdit(user)} onDelete={() => { setDeletingUser(user); setIsDeleteOpen(true); }} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {filteredUsers.length > 0 && (
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <span className="text-xs" style={{ color: "var(--cor-logo2)" }}>
                                        Mostrando {pagedUsers.length} de {filteredUsers.length} resultado{filteredUsers.length !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                                            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>Anterior</button>
                                        <span className="text-sm font-medium" style={{ color: "var(--cor-logo)" }}>Página {safePage} de {totalPages}</span>
                                        <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                                            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>Próxima</button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* ══════════════════ TAB: CARGOS ══════════════════ */}
                {activeTab === "cargos" && !loading && (
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] animate-in fade-in duration-200">
                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                            <SectionHeader icon={<Plus size={18} />} title={editingCargo ? "Editar cargo" : "Novo cargo"} subtitle="Cadastre cargos para organizar a hierarquia da empresa." />
                            <form onSubmit={submitCargo} className="mt-5 space-y-4">
                                <FieldLabel label="Nome do cargo">
                                    <input value={cargoForm.nome_cargo} onChange={(e) => setCargoForm({ nome_cargo: e.target.value })}
                                        placeholder="Ex.: Diretoria, Analista, Designer"
                                        className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }} />
                                </FieldLabel>
                                <div className="flex flex-wrap gap-3">
                                    <button type="submit" disabled={savingCargo}
                                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 disabled:opacity-60"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>
                                        <Plus size={16} />
                                        {savingCargo ? "Salvando..." : editingCargo ? "Salvar cargo" : "Criar cargo"}
                                    </button>
                                    {editingCargo && (
                                        <button type="button" onClick={resetCargoForm}
                                            className="rounded-xl border px-4 py-2.5 text-sm"
                                            style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>
                                            Cancelar edição
                                        </button>
                                    )}
                                </div>
                            </form>
                        </section>

                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                            <SectionHeader icon={<BriefcaseBusiness size={18} />} title="Cargos cadastrados" subtitle="Edite ou remova cargos existentes." />
                            <div className="mt-5 space-y-3">
                                {cargos.length === 0 ? <EmptyState text="Nenhum cargo cadastrado ainda." /> : cargos.map((cargo) => (
                                    <div key={cargo.id_cargo} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                                        <div>
                                            <p className="font-medium" style={{ color: "var(--cor-logo)" }}>{cargo.nome_cargo}</p>
                                            <p className="text-xs" style={{ color: "var(--cor-logo2)" }}>ID {cargo.id_cargo}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => { setEditingCargo(cargo); setCargoForm({ nome_cargo: cargo.nome_cargo }); }}
                                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                                                style={{ borderColor: "#cfe0ef", backgroundColor: "#eef5fb", color: "var(--cor-logo)" }}>
                                                <Pencil size={14} /> Editar
                                            </button>
                                            <button type="button" onClick={() => void removeCargo(cargo.id_cargo)} disabled={deletingCargoId === cargo.id_cargo}
                                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:opacity-60"
                                                style={{ borderColor: "#efb4b4", backgroundColor: "#fff4f4", color: "#b23b3b" }}>
                                                {deletingCargoId === cargo.id_cargo ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                {deletingCargoId === cargo.id_cargo ? "Excluindo..." : "Excluir"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {/* ══════════════════ TAB: EQUIPES ══════════════════ */}
                {activeTab === "equipes" && !loading && (
                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] animate-in fade-in duration-200">
                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                            <SectionHeader icon={<Plus size={18} />} title={editingEquipe ? "Editar equipe" : "Nova equipe"} subtitle="Crie equipes principais ou subequipes dentro da empresa." />
                            <form onSubmit={submitEquipe} className="mt-5 grid gap-4 md:grid-cols-2">
                                {/* Row 1: Nome + Tipo (mesmo nível, sem descrição) */}
                                <FieldLabel label="Nome da equipe">
                                    <input value={equipeForm.nome} onChange={(e) => setEquipeForm((c) => ({ ...c, nome: e.target.value }))}
                                        placeholder="Ex.: Produto, Marketing, Operações"
                                        className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }} />
                                </FieldLabel>

                                <FieldLabel label="Tipo">
                                    <select value={equipeForm.tipo} onChange={(e) => setEquipeForm((c) => ({ ...c, tipo: e.target.value }))}
                                        className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                        <option value="EMPRESA">Equipe principal</option>
                                        <option value="SUBEQUIPE">Subequipe</option>
                                    </select>
                                </FieldLabel>

                                {/* Row 2: Equipe pai (linha própria) */}
                                <div className="md:col-span-2">
                                    <FieldLabel label="Equipe pai" description="Opcional — selecione caso seja uma subequipe de outra.">
                                        <select value={equipeForm.equipe_pai} onChange={(e) => setEquipeForm((c) => ({ ...c, equipe_pai: e.target.value }))}
                                            className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                            <option value="">Nenhuma</option>
                                            {equipes.map((e) => <option key={e.id_equipe} value={e.id_equipe}>{e.nome}</option>)}
                                        </select>
                                    </FieldLabel>
                                </div>

                                {/* Row 3: Líder (linha própria) */}
                                <div className="md:col-span-2">
                                    <FieldLabel label="Líder" description="O usuário selecionado receberá acesso de administrador automaticamente.">
                                        <select value={equipeForm.id_lider} onChange={(e) => setEquipeForm((c) => ({ ...c, id_lider: e.target.value }))}
                                            className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                            <option value="">Sem líder</option>
                                            {usuarios.map((u) => (
                                                <option key={u.id_usuario} value={u.id_usuario}>
                                                    {u.nome}{permissoes[(u.email ?? "").toLowerCase()] === "admin" ? " ★" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </FieldLabel>
                                </div>

                                {/* Row 4: Membros */}
                                <div className="md:col-span-2">
                                    <FieldLabel label="Membros da equipe" description="Selecione os usuários que farão parte desta equipe.">
                                        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--cor-borda)" }}>
                                            <div className="border-b px-2 py-2" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar usuário..."
                                                    value={membrosSearch}
                                                    onChange={(e) => setMembrosSearch(e.target.value)}
                                                    className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition"
                                                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
                                                />
                                            </div>
                                            <div className="max-h-40 divide-y overflow-y-auto" style={{ backgroundColor: "var(--cor-widgets)" }}>
                                                {(membrosSearch.trim()
                                                    ? usuarios.filter((u) => u.nome.toLowerCase().includes(membrosSearch.toLowerCase()))
                                                    : usuarios
                                                ).map((u) => (
                                                    <label key={u.id_usuario} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:opacity-75">
                                                        <input
                                                            type="checkbox"
                                                            checked={equipeForm.membros.includes(u.id_usuario)}
                                                            onChange={() => toggleMembro(u.id_usuario)}
                                                            className="h-4 w-4 rounded accent-[var(--cor-accent)]"
                                                        />
                                                        <span className="flex-1 text-sm" style={{ color: "var(--cor-logo)" }}>{u.nome}</span>
                                                        {u.cargo && <span className="text-xs" style={{ color: "var(--cor-logo2)" }}>{u.cargo}</span>}
                                                    </label>
                                                ))}
                                            </div>
                                            {equipeForm.membros.length > 0 && (
                                                <div className="border-t px-4 py-2 text-xs" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo2)" }}>
                                                    {equipeForm.membros.length} {equipeForm.membros.length === 1 ? "membro selecionado" : "membros selecionados"}
                                                </div>
                                            )}
                                        </div>
                                    </FieldLabel>
                                </div>

                                <div className="md:col-span-2 flex flex-wrap gap-3">
                                    <button type="submit" disabled={savingEquipe}
                                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 disabled:opacity-60"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>
                                        <Plus size={16} />
                                        {savingEquipe ? "Salvando..." : editingEquipe ? "Salvar equipe" : "Criar equipe"}
                                    </button>
                                    {editingEquipe && (
                                        <button type="button" onClick={resetEquipeForm}
                                            className="rounded-xl border px-4 py-2.5 text-sm"
                                            style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>
                                            Cancelar edição
                                        </button>
                                    )}
                                </div>
                            </form>
                        </section>

                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                            <SectionHeader icon={<Users size={18} />} title="Equipes cadastradas" subtitle="Visualize as equipes principais e suas subequipes." />
                            <div className="mt-5 space-y-3">
                                {equipes.length === 0 ? <EmptyState text="Nenhuma equipe cadastrada ainda." /> : equipes.map((equipe) => {
                                    const owner = usuarios.find((u) => u.id_usuario === equipe.criado_por)?.nome ?? "Não informado";
                                    const parent = equipes.find((e) => e.id_equipe === equipe.equipe_pai)?.nome ?? null;
                                    return (
                                        <div key={equipe.id_equipe} className="rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-medium" style={{ color: "var(--cor-logo)" }}>{equipe.nome}</p>
                                                        <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]" style={{ borderColor: "#c7d6e5", color: "var(--cor-logo2)" }}>
                                                            {equipe.tipo ?? "SUBEQUIPE"}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs" style={{ color: "var(--cor-logo2)" }}>Criada por {owner}</p>
                                                    <p className="text-xs" style={{ color: "var(--cor-logo2)" }}>
                                                        {parent ? `Subequipe de ${parent}` : "Equipe principal"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <IconButton onClick={() => {
                                                        setEditingEquipe(equipe);
                                                        setEquipeForm({ nome: equipe.nome, equipe_pai: equipe.equipe_pai ? String(equipe.equipe_pai) : "", tipo: equipe.tipo ?? "SUBEQUIPE", id_lider: equipe.id_lider ? String(equipe.id_lider) : "", membros: equipe.membros ?? [] });
                                                    }} title="Editar equipe"><Pencil size={14} /></IconButton>
                                                    <IconButton onClick={() => void removeEquipe(equipe.id_equipe)} title="Excluir equipe" danger disabled={deletingEquipeId === equipe.id_equipe}>
                                                        {deletingEquipeId === equipe.id_equipe ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {/* ══════════════════ MODALS ══════════════════ */}

                {/* Create / Edit User */}
                {(isCreateOpen || isEditOpen) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <form onSubmit={isCreateOpen ? onCreate : onSaveEdit}
                            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
                                    {isCreateOpen ? "Adicionar funcionário" : "Editar funcionário"}
                                </h2>
                                <button type="button" onClick={closeUserModal}
                                    className="rounded-lg border p-1.5 transition hover:shadow-md active:scale-90"
                                    style={{ borderColor: "var(--cor-borda)" }}>
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {([
                                    { label: "Nome", field: "nome" as const, type: "text", required: true, placeholder: "Ex: João Silva" },
                                    { label: "Email", field: "email" as const, type: "email", required: true, placeholder: "Ex: joao@email.com" },
                                    { label: "Nível", field: "nivel" as const, type: "text", required: false, placeholder: "Ex: Pleno" },
                                ]).map(({ label, field, type, required, placeholder }) => (
                                    <label key={field} className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                        {label}
                                        <input type={type} required={required} value={userForm[field]} placeholder={placeholder}
                                            onChange={(e) => setUserForm((f) => ({ ...f, [field]: e.target.value }))}
                                            className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }} />
                                    </label>
                                ))}

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Cargo
                                    <select value={userForm.cargo} onChange={(e) => setUserForm((f) => ({ ...f, cargo: e.target.value }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                        <option value="">Selecione</option>
                                        {cargos.map((c) => <option key={c.id_cargo} value={c.nome_cargo}>{c.nome_cargo}</option>)}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Equipe
                                    <select value={userForm.id_equipe} onChange={(e) => setUserForm((f) => ({ ...f, id_equipe: e.target.value }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                        <option value="">Sem equipe</option>
                                        {equipes.map((e) => <option key={e.id_equipe} value={e.id_equipe}>{e.nome}</option>)}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Permissão
                                    <select value={userForm.nivel_acesso} onChange={(e) => setUserForm((f) => ({ ...f, nivel_acesso: e.target.value as AccessLevel }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                        <option value="usuario">Usuário</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Status
                                    <select value={userForm.status_atual} onChange={(e) => setUserForm((f) => ({ ...f, status_atual: e.target.value }))}
                                        className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                    </select>
                                </label>

                                {isCreateOpen && (
                                    <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                        Senha
                                        <input type="password" required value={userForm.senha} placeholder="Senha de acesso"
                                            onChange={(e) => setUserForm((f) => ({ ...f, senha: e.target.value }))}
                                            className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }} />
                                    </label>
                                )}

                                {isEditOpen && (
                                    <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                        Nova senha <span className="text-xs font-normal" style={{ color: "var(--cor-logo2)" }}>(deixe em branco para manter)</span>
                                        <input type="password" value={userForm.senha} placeholder="Nova senha"
                                            onChange={(e) => setUserForm((f) => ({ ...f, senha: e.target.value }))}
                                            className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }} />
                                    </label>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button type="button" onClick={closeUserModal}
                                    className="rounded-xl border px-4 py-2 text-sm transition hover:shadow-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>Cancelar</button>
                                <button type="submit" disabled={savingUser}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white dark:text-(--cor-fundo) transition hover:shadow-lg disabled:opacity-60 bg-[#1a1a2e] dark:bg-(--cor-accentII)">
                                    {savingUser ? "Salvando..." : isCreateOpen ? "Cadastrar" : "Salvar"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Delete User */}
                {isDeleteOpen && deletingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold" style={{ color: "#9f2f2f" }}>Excluir funcionário</h2>
                                <button type="button" onClick={() => { setIsDeleteOpen(false); setDeletingUser(null); }}
                                    className="rounded-lg border p-1.5 transition hover:shadow-md"
                                    style={{ borderColor: "var(--cor-borda)" }}>
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>
                            <p className="mb-3 text-sm" style={{ color: "var(--cor-logo)" }}>
                                Tem certeza que deseja excluir <strong>{deletingUser.nome}</strong>?
                            </p>
                            {(() => {
                                const impacto = getImpactoExclusao(deletingUser);
                                return impacto.projetosAtivos.length > 0 || impacto.equipesAssociadas.length > 0 ? (
                                    <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(218,165,32,0.5)", backgroundColor: "rgba(218,165,32,0.1)", color: "#b8900a" }}>
                                        <p className="font-medium">Impacto: {impacto.nivel}</p>
                                        {impacto.projetosAtivos.length > 0 && <p>• {impacto.projetosAtivos.length} projeto(s) ativo(s) afetado(s)</p>}
                                        {impacto.equipesAssociadas.length > 0 && <p>• {impacto.equipesAssociadas.length} equipe(s) afetada(s)</p>}
                                    </div>
                                ) : null;
                            })()}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsDeleteOpen(false); setDeletingUser(null); }}
                                    className="rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>Cancelar</button>
                                <button type="button" onClick={() => void onDeleteUser()} disabled={deletingUserId === deletingUser.id_usuario}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:shadow-lg disabled:opacity-60"
                                    style={{ backgroundColor: "#c0392b" }}>
                                    {deletingUserId === deletingUser.id_usuario ? "Excluindo..." : "Confirmar exclusão"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Confirm */}
                {isStatusConfirmOpen && statusUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>Alterar status</h2>
                                <button type="button" onClick={() => { setIsStatusConfirmOpen(false); setStatusUser(null); }}
                                    className="rounded-lg border p-1.5 transition hover:shadow-md" style={{ borderColor: "var(--cor-borda)" }}>
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>
                            <p className="mb-5 text-sm" style={{ color: "var(--cor-logo)" }}>
                                Deseja marcar <strong>{statusUser.nome}</strong> como{" "}
                                <strong>{isUsuarioAtivo(statusUser) ? "inativo" : "ativo"}</strong>?
                            </p>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsStatusConfirmOpen(false); setStatusUser(null); }}
                                    className="rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>Cancelar</button>
                                <button type="button" onClick={() => void onToggleStatus()} disabled={statusUpdatingId === statusUser.id_usuario}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white dark:text-(--cor-fundo) transition hover:shadow-lg disabled:opacity-60 bg-[#1a1a2e] dark:bg-(--cor-accentII)">
                                    {statusUpdatingId === statusUser.id_usuario ? "Salvando..." : "Confirmar"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* History */}
                {isHistoryOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <div className="flex h-full max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "var(--cor-borda)" }}>
                                <h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>Histórico de excluídos</h2>
                                <button type="button" onClick={() => setIsHistoryOpen(false)}
                                    className="rounded-lg border p-1.5 transition hover:shadow-md" style={{ borderColor: "var(--cor-borda)" }}>
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5">
                                {historyLoading ? (
                                    <p className="text-center text-sm" style={{ color: "var(--cor-logo2)" }}>Carregando...</p>
                                ) : deletedHistory.length === 0 ? (
                                    <p className="text-center text-sm" style={{ color: "var(--cor-logo2)" }}>Nenhum usuário excluído recentemente.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {deletedHistory.map((registro) => (
                                            <div key={registro.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--cor-borda)" }}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium" style={{ color: "var(--cor-logo)" }}>{registro.nome}</p>
                                                        <p className="text-xs" style={{ color: "var(--cor-logo2)" }}>{registro.email}</p>
                                                        <p className="mt-1 text-xs" style={{ color: "var(--cor-logo2)" }}>
                                                            {registro.cargo ?? "—"} · {getRemainingDaysLabel(registro.expira_em)}
                                                        </p>
                                                    </div>
                                                    <button type="button" onClick={() => void restoreDeletedUser(registro)}
                                                        disabled={restoringDeletedId === registro.id}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:shadow-md disabled:opacity-60"
                                                        style={{ borderColor: "#c3e6cb", backgroundColor: "#eefbf3", color: "#1b6d3f" }}>
                                                        {restoringDeletedId === registro.id ? <RefreshCw size={12} className="animate-spin" /> : <Undo2 size={12} />}
                                                        Restaurar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
