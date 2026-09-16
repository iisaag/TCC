import { Head, usePage } from "@inertiajs/react";
import {
    Briefcase,
    Building2,
    ChevronDown,
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
import RequiredMark from "@/components/ui/required-mark";
import DashboardLayout from "@/layouts/DashboardLayout";
import { apiRoutes } from "@/lib/routes";

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
    online_agora?: boolean;
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

type PresenceStatusValue = "online" | "ausente" | "ocupado" | "não perturbe" | "offline";

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
    status_atual: "offline",
};

const PRESENCE_STATUS_OPTIONS: { value: PresenceStatusValue; label: string }[] = [
    { value: "online", label: "Online" },
    { value: "ausente", label: "Ausente" },
    { value: "ocupado", label: "Ocupado" },
    { value: "não perturbe", label: "Não perturbe" },
    { value: "offline", label: "Offline" },
];

const EMPTY_CARGO = { nome_cargo: "" };
const EMPTY_EQUIPE = { nome: "", equipe_pai: "", tipo: "SUBEQUIPE", id_lider: "", membros: [] as number[] };
const PAGE_SIZE = 10;

// ─────────────────────────── Helpers ───────────────────────────

function toAccessLevel(raw?: string | null): AccessLevel {
    const n = (raw ?? "").toLowerCase();
    return ["adm", "admin", "administrador", "total", "geral"].includes(n) ? "admin" : "usuario";
}

function normalizePresenceStatus(status?: string | null): PresenceStatusValue {
    const normalized = (status ?? "").trim().toLowerCase();

    if (normalized === "online" || normalized === "ausente" || normalized === "ocupado" || normalized === "não perturbe" || normalized === "offline") {
        return normalized;
    }

    if (normalized === "ativo") {
        return "online";
    }

    return "offline";
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

function resolveAvatarUrl(foto?: string | null): string | null {
    const value = (foto ?? "").trim();

    if (!value) {
        return null;
    }

    if (value.startsWith("data:image/")) {
        return value;
    }

    const normalized = value.replace(/\\/g, "/");

    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    if (normalized.startsWith("/")) {
        return `${origin}${normalized}`;
    }

    if (normalized.startsWith("storage/")) {
        return `${origin}/${normalized}`;
    }

    if (normalized.startsWith("public/")) {
        return `${origin}/${normalized.replace(/^public\//, "")}`;
    }

    return `${origin}/storage/${normalized}`;
}

type PresenceState = "ONLINE" | "AUSENTE" | "OCUPADO" | "NAO_PERTURBE" | "OFFLINE";

const ACTIVE_PRESENCE_WINDOW_MS = 45 * 1000;

function hasRecentAccess(ultimoAcesso?: string | null): boolean {
    if (!ultimoAcesso) return false;
    const parsed = new Date(ultimoAcesso).getTime();
    const fallback = new Date(ultimoAcesso.replace(" ", "T")).getTime();
    const timestamp = Number.isNaN(parsed) ? fallback : parsed;
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= ACTIVE_PRESENCE_WINDOW_MS;
}

function getPresenceState(usuario: Usuario): PresenceState {
    const normalized = normalizePresenceStatus(usuario.status_atual);

    if (normalized === "offline") return "OFFLINE";
    if (usuario.online_agora === false) return "OFFLINE";
    if (usuario.online_agora === true) {
        if (normalized === "online") return "ONLINE";
        if (normalized === "ausente") return "AUSENTE";
        if (normalized === "ocupado") return "OCUPADO";
        if (normalized === "não perturbe") return "NAO_PERTURBE";
        return "OFFLINE";
    }
    if (!hasRecentAccess(usuario.ultimo_acesso)) return "OFFLINE";

    if (normalized === "online") return "ONLINE";
    if (normalized === "ausente") return "AUSENTE";
    if (normalized === "ocupado") return "OCUPADO";
    if (normalized === "não perturbe") return "NAO_PERTURBE";
    return "OFFLINE";
}

function isUsuarioAtivo(usuario: Usuario): boolean {
    return getPresenceState(usuario) !== "OFFLINE";
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
    const url = resolveAvatarUrl(foto);
    const [imageError, setImageError] = useState(false);

    return (
        <span
            className="inline-flex items-center justify-center overflow-hidden rounded-full text-xs font-semibold transition-all duration-200 hover:shadow-md"
            style={{ width: 32, height: 32, backgroundColor: color.bg, color: color.text, flexShrink: 0 }}
        >
            {url && !imageError ? (
                <img src={url} alt={nome} className="h-full w-full object-cover" onError={() => setImageError(true)} />
            ) : getInitials(nome)}
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
    const presence = getPresenceState(user);
    const badge = presence === "ONLINE"
        ? { borderColor: "#4caf85", color: "#1d6a45", label: "Online" }
        : presence === "AUSENTE"
            ? { borderColor: "#b8a363", color: "#7f6320", label: "Ausente" }
            : presence === "OCUPADO"
                ? { borderColor: "#e07070", color: "#a02020", label: "Ocupado" }
                : presence === "NAO_PERTURBE"
                    ? { borderColor: "#7d67b0", color: "#4b2f8a", label: "Não perturbe" }
                : { borderColor: "#9ea6b2", color: "#5b6470", label: "Offline" };

    if (onClick) {
        return (
            <button type="button" onClick={onClick} disabled={disabled}
                className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 hover:shadow-md disabled:opacity-60"
                style={{ borderColor: badge.borderColor, color: badge.color }}
            >
                {badge.label}
            </button>
        );
    }

    return (
        <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={{ borderColor: badge.borderColor, color: badge.color }}>
            {badge.label}
        </span>
    );
}

function CardSelect({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDocClick = (event: MouseEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }

            setOpen(false);
        };

        document.addEventListener("mousedown", onDocClick);

        return () => {
            document.removeEventListener("mousedown", onDocClick);
        };
    }, []);

    const selected = options.find((option) => option.value === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border px-4 py-2.5 text-left text-sm font-medium outline-none transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
            >
                <span>{selected?.label ?? placeholder ?? "Selecione"}</span>
                <ChevronDown
                    size={18}
                    style={{ transition: "transform 0.24s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--cor-logo2)", flexShrink: 0 }}
                />
            </button>

            {open ? (
                <div
                    className="animate-dropdown absolute z-[200] mt-2 w-full rounded-2xl border p-1.5 shadow-2xl"
                    style={{
                        backgroundColor: "var(--cor-widgets)",
                        borderColor: "var(--cor-borda)",
                        boxShadow: "0 18px 44px rgba(5, 18, 32, 0.28)",
                    }}
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className="w-full rounded-xl px-4 py-2.5 text-left text-[14px] font-medium transition-colors"
                            style={{
                                color: "var(--cor-logo)",
                                backgroundColor: value === option.value
                                    ? "color-mix(in srgb, var(--cor-botao) 78%, var(--cor-fundo))"
                                    : "transparent",
                            }}
                            onMouseEnter={(event) => {
                                if (value !== option.value) {
                                    (event.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--cor-fundo)";
                                }
                            }}
                            onMouseLeave={(event) => {
                                if (value !== option.value) {
                                    (event.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                                }
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function SelectFilter({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void;
    options: { label: string; value: string }[]; placeholder: string;
}) {
    return (
        <div className="min-w-[180px]">
            <CardSelect
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                options={[
                    { value: "", label: placeholder },
                    ...options,
                ]}
            />
        </div>
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
        <div ref={ref} className="relative isolate">
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="relative z-10 flex items-center justify-center rounded-lg border p-1.5 transition-all duration-200 hover:shadow-md active:scale-95"
                style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
            >
                <MoreVertical size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-40 mt-2 min-w-[130px] rounded-xl border py-1 shadow-lg animate-in zoom-in-95 fade-in duration-150"
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
        <div className="rounded-2xl border p-4 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: "var(--cor-borda)", backgroundColor: "color-mix(in srgb, var(--cor-widgets) 88%, transparent)" }}>
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
                borderColor: active ? "var(--cor-botao)" : "var(--cor-borda)",
                backgroundColor: active
                    ? "color-mix(in srgb, var(--cor-botao) 80%, var(--cor-widgets))"
                    : "var(--cor-widgets)",
                color: active ? "var(--cor-logo)" : "var(--cor-logo)",
                boxShadow: active ? "0 8px 20px rgba(8, 24, 40, 0.18)" : "none",
            }}>
            {label}
        </button>
    );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border p-2" style={{ borderColor: "var(--cor-borda)", backgroundColor: "color-mix(in srgb, var(--cor-logo) 10%, var(--cor-widgets))", color: "var(--cor-logo)" }}>
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
                borderColor: danger ? "color-mix(in srgb, var(--cor-atrasoI) 40%, var(--cor-borda))" : "var(--cor-borda)",
                backgroundColor: danger ? "color-mix(in srgb, var(--cor-atrasoI) 12%, var(--cor-widgets))" : "var(--cor-widgets)",
                color: danger ? "var(--cor-atrasoI)" : "var(--cor-logo)",
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
    const searchParams = new URLSearchParams(window.location.search);
    const deepLinkTab = searchParams.get("tab");
    const deepLinkUserId = searchParams.get("user");
    const appliedDeepLinkRef = useRef<string>("");
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
    const [statusDraft, setStatusDraft] = useState<PresenceStatusValue>("offline");
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
    const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);

    // ── Equipes state ─────────────────────────────────────────────
    const [equipes, setEquipes] = useState<EquipeItem[]>([]);
    const [equipeForm, setEquipeForm] = useState(EMPTY_EQUIPE);
    const [editingEquipe, setEditingEquipe] = useState<EquipeItem | null>(null);
    const [savingEquipe, setSavingEquipe] = useState(false);
    const [deletingEquipeId, setDeletingEquipeId] = useState<number | null>(null);
    const [membrosSearch, setMembrosSearch] = useState("");
    const [isEquipeModalOpen, setIsEquipeModalOpen] = useState(false);

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

    const fetchData = async (silent = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const [usuariosRes, cargosRes, equipesRes] = await Promise.all([
                fetch(apiRoutes.usuarios, { headers: { Accept: "application/json" } }),
                fetch(apiRoutes.cargos, { headers: { Accept: "application/json" } }),
                fetch(apiRoutes.equipes, { headers: { Accept: "application/json" } }),
            ]);

            const uPayload = (await usuariosRes.json().catch(() => ({}))) as ApiEnvelope<{ usuarios?: Usuario[] }>;
            const cPayload = (await cargosRes.json().catch(() => ({}))) as ApiEnvelope<{ cargos?: CargoItem[] }>;
            const ePayload = (await equipesRes.json().catch(() => ({}))) as ApiEnvelope<{ equipes?: EquipeItem[] }>;

            let users = uPayload.data?.usuarios ?? [];

            try {
                const presenceRes = await fetch("/presence/users", { headers: { Accept: "application/json" } });

                if (presenceRes.ok) {
                    const presencePayload = (await presenceRes.json()) as ApiEnvelope<{ users?: Array<{ id: number; status?: string | null }> }>;
                    const presenceUsers = presencePayload.data?.users ?? [];
                    const statusById = new Map<number, string>();

                    presenceUsers.forEach((item) => {
                        const status = normalizePresenceStatus(item.status ?? "offline");
                        statusById.set(item.id, status);
                    });

                    users = users.map((user) => {
                        const status = statusById.get(user.id_usuario);

                        if (!status) {
                            return user;
                        }

                        return {
                            ...user,
                            status_atual: status,
                            online_agora: status !== "offline",
                        };
                    });
                }
            } catch {
                // If presence endpoint fails, keep the API users payload.
            }

            setUsuarios(users);
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
            if (!silent) {
                setError("Não foi possível carregar os dados.");
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => { if (isAdmin) void fetchData(); }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        const interval = window.setInterval(() => {
            void fetchData(true);
        }, 5000);

        return () => window.clearInterval(interval);
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin || !deepLinkUserId) {
            appliedDeepLinkRef.current = "";
            return;
        }

        const deepLinkKey = `user:${deepLinkUserId}:tab:${deepLinkTab ?? ""}`;
        const targetUserId = Number(deepLinkUserId);

        if (!Number.isFinite(targetUserId)) {
            return;
        }

        if (deepLinkTab === "usuarios" && activeTab !== "usuarios") {
            setActiveTab("usuarios");
            return;
        }

        if (appliedDeepLinkRef.current === deepLinkKey) {
            return;
        }

        const targetUser = usuarios.find((user) => user.id_usuario === targetUserId);

        if (!targetUser) {
            return;
        }

        openEdit(targetUser);
        appliedDeepLinkRef.current = deepLinkKey;
    }, [activeTab, deepLinkTab, deepLinkUserId, isAdmin, usuarios]);

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
                const presence = getPresenceState(u);

                if (filterStatus === "online" && presence !== "ONLINE") return false;
                if (filterStatus === "ausente" && presence !== "AUSENTE") return false;
                if (filterStatus === "ocupado" && presence !== "OCUPADO") return false;
                if (filterStatus === "não perturbe" && presence !== "NAO_PERTURBE") return false;
                if (filterStatus === "offline" && presence !== "OFFLINE") return false;
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
            status_atual: normalizePresenceStatus(user.status_atual),
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

    const onSaveStatus = async () => {
        if (!statusUser) return;
        setStatusUpdatingId(statusUser.id_usuario);
        setError(null);
        try {
            const res = await fetch(`${apiRoutes.usuarios}/${statusUser.id_usuario}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({ status_atual: statusDraft }),
            });
            if (!res.ok) throw new Error(await readApiMessage(res, "Não foi possível alterar o status."));
            const statusLabel = PRESENCE_STATUS_OPTIONS.find((option) => option.value === statusDraft)?.label ?? statusDraft;
            setSuccess(`Status de ${statusUser.nome} atualizado para ${statusLabel.toLowerCase()} com sucesso.`);
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

    const openCreateCargo = () => {
        resetCargoForm();
        setIsCargoModalOpen(true);
    };

    const openEditCargo = (cargo: CargoItem) => {
        setEditingCargo(cargo);
        setCargoForm({ nome_cargo: cargo.nome_cargo });
        setIsCargoModalOpen(true);
    };

    const closeCargoModal = () => {
        setIsCargoModalOpen(false);
        resetCargoForm();
    };

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
            closeCargoModal();
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

    const openCreateEquipe = () => {
        resetEquipeForm();
        setIsEquipeModalOpen(true);
    };

    const openEditEquipe = (equipe: EquipeItem) => {
        setEditingEquipe(equipe);
        setEquipeForm({
            nome: equipe.nome,
            equipe_pai: equipe.equipe_pai ? String(equipe.equipe_pai) : "",
            tipo: equipe.tipo ?? "SUBEQUIPE",
            id_lider: equipe.id_lider ? String(equipe.id_lider) : "",
            membros: equipe.membros ?? [],
        });
        setIsEquipeModalOpen(true);
    };

    const closeEquipeModal = () => {
        setIsEquipeModalOpen(false);
        resetEquipeForm();
    };

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
            closeEquipeModal();
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

            <div className="space-y-8 pt-6 pb-12">

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
                            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" style={{ borderColor: "var(--cor-borda)", backgroundColor: "color-mix(in srgb, var(--cor-widgets) 80%, transparent)", color: "var(--cor-logo2)" }}>
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
                                <SelectFilter
                                    value={filterStatus}
                                    onChange={setFilterStatus}
                                    placeholder="Todos status"
                                    options={PRESENCE_STATUS_OPTIONS}
                                />
                                <SelectFilter value={filterPermissao} onChange={setFilterPermissao} placeholder="Todos" options={[{ label: "Administrador", value: "admin" }, { label: "Usuário", value: "usuario" }]} />
                            </div>

                            {/* Table */}
                            <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--cor-borda)" }}>
                                {filteredUsers.length === 0 ? (
                                    <EmptyState text="Nenhum usuário encontrado." />
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-base">
                                            <thead>
                                                <tr className="border-b" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}>
                                                    {["Nome", "Email", "Telefone", "Localização", "Cargo", "Nível", "Permissão", "Status", "Último Acesso", "Data de Criação", "Ações"].map((h) => (
                                                        <th key={h} className="whitespace-nowrap px-5 py-4 text-left text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedUsers.map((user) => {
                                                    const access = permissoes[(user.email ?? "").toLowerCase()] ?? "usuario";
                                                    return (
                                                        <tr key={user.id_usuario} className="border-b last:border-b-0 transition hover:-translate-y-px hover:shadow-sm" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar nome={user.nome} foto={user.foto_perfil} />
                                                                    <span className="whitespace-nowrap font-medium" style={{ color: "var(--cor-logo)" }}>{user.nome}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 text-sm" style={{ color: "var(--cor-logo2)" }}>{user.email ?? "—"}</td>
                                                            <td className="px-5 py-4 text-sm" style={{ color: "var(--cor-logo2)" }}>{(user as any).telefone ?? "—"}</td>
                                                            <td className="px-5 py-4 text-sm" style={{ color: "var(--cor-logo2)" }}>{(user as any).localizacao ?? "—"}</td>
                                                            <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--cor-logo)" }}>{user.cargo ?? "—"}</td>
                                                            <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--cor-logo)" }}>{user.nivel ?? "—"}</td>
                                                            <td className="px-5 py-4"><PermissionBadge access={access} /></td>
                                                            <td className="px-5 py-4">
                                                                <StatusBadge user={user} disabled={statusUpdatingId === user.id_usuario}
                                                                    onClick={() => {
                                                                        setStatusUser(user);
                                                                        setStatusDraft(normalizePresenceStatus(user.status_atual));
                                                                        setIsStatusConfirmOpen(true);
                                                                    }} />
                                                            </td>
                                                            <td className="px-5 py-4 whitespace-nowrap text-sm" style={{ color: "var(--cor-logo2)" }}>{formatDateTime(user.ultimo_acesso)}</td>
                                                            <td className="px-5 py-4 whitespace-nowrap text-sm" style={{ color: "var(--cor-logo2)" }}>{formatDateTime(user.data_criacao)}</td>
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <button type="button" onClick={() => { setDeletingUser(user); setIsDeleteOpen(true); }}
                                                                        className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                                                                        style={{
                                                                            borderColor: "color-mix(in srgb, var(--cor-atrasoI) 38%, var(--cor-borda))",
                                                                            backgroundColor: "color-mix(in srgb, var(--cor-atrasoI) 12%, var(--cor-widgets))",
                                                                            color: "var(--cor-atrasoI)",
                                                                        }}>
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
                                            <span className="text-sm" style={{ color: "var(--cor-logo2)" }}>
                                        Mostrando {pagedUsers.length} de {filteredUsers.length} resultado{filteredUsers.length !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                                            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>Anterior</button>
                                        <span className="text-base font-medium" style={{ color: "var(--cor-logo)" }}>Página {safePage} de {totalPages}</span>
                                        <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                                            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}>Próxima</button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* ══════════════════ TAB: CARGOS ══════════════════ */}
                {activeTab === "cargos" && !loading && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                            <SectionHeader icon={<BriefcaseBusiness size={18} />} title="Cargos cadastrados" subtitle="Lista de cargos com edição em card, igual ao fluxo de funcionários." />
                            <div className="mt-5 space-y-3">
                                <button
                                    type="button"
                                    onClick={openCreateCargo}
                                    className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5"
                                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>
                                            <Plus size={16} />
                                        </span>
                                        <div>
                                            <p className="font-medium" style={{ color: "var(--cor-logo)" }}>Adicionar cargo</p>
                                            <p className="text-xs" style={{ color: "var(--cor-logo2)" }}>Clique para abrir o card de cadastro</p>
                                        </div>
                                    </div>
                                </button>

                                {cargos.length === 0 ? <EmptyState text="Nenhum cargo cadastrado ainda." /> : cargos.map((cargo) => (
                                    <div key={cargo.id_cargo} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
                                        <div>
                                            <p className="font-medium" style={{ color: "var(--cor-logo)" }}>{cargo.nome_cargo}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => openEditCargo(cargo)}
                                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                                                style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}>
                                                <Pencil size={14} /> Editar
                                            </button>
                                            <button type="button" onClick={() => void removeCargo(cargo.id_cargo)} disabled={deletingCargoId === cargo.id_cargo}
                                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:opacity-60"
                                                style={{ borderColor: "color-mix(in srgb, var(--cor-atrasoI) 40%, var(--cor-borda))", backgroundColor: "color-mix(in srgb, var(--cor-atrasoI) 12%, var(--cor-widgets))", color: "var(--cor-atrasoI)" }}>
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
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
                            <SectionHeader icon={<Users size={18} />} title="Equipes cadastradas" subtitle="Lista de equipes com edição em card, no mesmo padrão de funcionários." />
                            <div className="mt-5 space-y-3">
                                <button
                                    type="button"
                                    onClick={openCreateEquipe}
                                    className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5"
                                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>
                                            <Plus size={16} />
                                        </span>
                                        <div>
                                            <p className="font-medium" style={{ color: "var(--cor-logo)" }}>Adicionar equipe</p>
                                            <p className="text-xs" style={{ color: "var(--cor-logo2)" }}>Clique para abrir o card de cadastro</p>
                                        </div>
                                    </div>
                                </button>

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
                                                    <IconButton onClick={() => openEditEquipe(equipe)} title="Editar equipe"><Pencil size={14} /></IconButton>
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
                                        <span className="inline-flex items-center">{label}{required ? <RequiredMark /> : null}</span>
                                        <input type={type} required={required} value={userForm[field]} placeholder={placeholder}
                                            onChange={(e) => setUserForm((f) => ({ ...f, [field]: e.target.value }))}
                                            className="rounded-xl border px-3 py-2 text-sm outline-none transition-all duration-200"
                                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }} />
                                    </label>
                                ))}

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Cargo
                                    <CardSelect
                                        value={userForm.cargo}
                                        onChange={(value) => setUserForm((form) => ({ ...form, cargo: value }))}
                                        options={[
                                            { value: "", label: "Selecione" },
                                            ...cargos.map((cargo) => ({ value: cargo.nome_cargo, label: cargo.nome_cargo })),
                                        ]}
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Equipe
                                    <CardSelect
                                        value={userForm.id_equipe}
                                        onChange={(value) => setUserForm((form) => ({ ...form, id_equipe: value }))}
                                        options={[
                                            { value: "", label: "Sem equipe" },
                                            ...equipes.map((equipe) => ({ value: String(equipe.id_equipe), label: equipe.nome })),
                                        ]}
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Permissão
                                    <CardSelect
                                        value={userForm.nivel_acesso}
                                        onChange={(value) => setUserForm((form) => ({ ...form, nivel_acesso: value as AccessLevel }))}
                                        options={[
                                            { value: "usuario", label: "Usuário" },
                                            { value: "admin", label: "Administrador" },
                                        ]}
                                    />
                                </label>

                                <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                    Status
                                    <CardSelect
                                        value={userForm.status_atual}
                                        onChange={(value) => setUserForm((form) => ({ ...form, status_atual: value }))}
                                        options={PRESENCE_STATUS_OPTIONS}
                                    />
                                </label>

                                {isCreateOpen && (
                                    <label className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
                                        <span className="inline-flex items-center">Senha<RequiredMark /></span>
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
                                    className="rounded-xl border px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                    style={{ borderColor: "#9f2a21", background: "linear-gradient(140deg, #c43a2f 0%, #a42c22 100%)" }}>
                                    {deletingUserId === deletingUser.id_usuario ? "Excluindo..." : "Confirmar exclusão"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isCargoModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <form
                            onSubmit={submitCargo}
                            className="w-full max-w-xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
                                    {editingCargo ? "Editar cargo" : "Adicionar cargo"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeCargoModal}
                                    className="rounded-lg border p-1.5 transition hover:shadow-md active:scale-90"
                                    style={{ borderColor: "var(--cor-borda)" }}
                                >
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>

                            <FieldLabel label="Nome do cargo">
                                <input
                                    value={cargoForm.nome_cargo}
                                    onChange={(event) => setCargoForm({ nome_cargo: event.target.value })}
                                    placeholder="Ex.: Diretoria, Analista, Designer"
                                    className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                                    style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                />
                            </FieldLabel>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeCargoModal}
                                    className="rounded-xl border px-4 py-2 text-sm transition hover:shadow-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingCargo}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white dark:text-(--cor-fundo) transition hover:shadow-lg disabled:opacity-60 bg-[#1a1a2e] dark:bg-(--cor-accentII)"
                                >
                                    {savingCargo ? "Salvando..." : editingCargo ? "Salvar" : "Adicionar"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {isEquipeModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <form
                            onSubmit={submitEquipe}
                            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
                                    {editingEquipe ? "Editar equipe" : "Adicionar equipe"}
                                </h2>
                                <button
                                    type="button"
                                    onClick={closeEquipeModal}
                                    className="rounded-lg border p-1.5 transition hover:shadow-md active:scale-90"
                                    style={{ borderColor: "var(--cor-borda)" }}
                                >
                                    <X size={14} style={{ color: "var(--cor-logo2)" }} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FieldLabel label="Nome da equipe">
                                    <input
                                        value={equipeForm.nome}
                                        onChange={(event) => setEquipeForm((current) => ({ ...current, nome: event.target.value }))}
                                        placeholder="Ex.: Produto, Marketing, Operações"
                                        className="w-full rounded-xl border px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                                        style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                                    />
                                </FieldLabel>

                                <FieldLabel label="Tipo">
                                    <CardSelect
                                        value={equipeForm.tipo}
                                        onChange={(value) => setEquipeForm((form) => ({ ...form, tipo: value }))}
                                        options={[
                                            { value: "EMPRESA", label: "Equipe principal" },
                                            { value: "SUBEQUIPE", label: "Subequipe" },
                                        ]}
                                    />
                                </FieldLabel>

                                <FieldLabel label="Equipe pai" description="Opcional para subequipes.">
                                    <CardSelect
                                        value={equipeForm.equipe_pai}
                                        onChange={(value) => setEquipeForm((form) => ({ ...form, equipe_pai: value }))}
                                        options={[
                                            { value: "", label: "Nenhuma" },
                                            ...equipes.map((equipe) => ({ value: String(equipe.id_equipe), label: equipe.nome })),
                                        ]}
                                    />
                                </FieldLabel>

                                <FieldLabel label="Líder" description="O usuário selecionado receberá acesso de administrador automaticamente.">
                                    <CardSelect
                                        value={equipeForm.id_lider}
                                        onChange={(value) => setEquipeForm((form) => ({ ...form, id_lider: value }))}
                                        options={[
                                            { value: "", label: "Sem líder" },
                                            ...usuarios.map((usuario) => ({
                                                value: String(usuario.id_usuario),
                                                label: `${usuario.nome}${permissoes[(usuario.email ?? "").toLowerCase()] === "admin" ? " ★" : ""}`,
                                            })),
                                        ]}
                                    />
                                </FieldLabel>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeEquipeModal}
                                    className="rounded-xl border px-4 py-2 text-sm transition hover:shadow-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEquipe}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white dark:text-(--cor-fundo) transition hover:shadow-lg disabled:opacity-60 bg-[#1a1a2e] dark:bg-(--cor-accentII)"
                                >
                                    {savingEquipe ? "Salvando..." : editingEquipe ? "Salvar" : "Adicionar"}
                                </button>
                            </div>
                        </form>
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
                                Selecione o novo status de <strong>{statusUser.nome}</strong>.
                            </p>
                            <div className="mb-5">
                                <CardSelect
                                    value={statusDraft}
                                    onChange={(value) => setStatusDraft(value as PresenceStatusValue)}
                                    options={PRESENCE_STATUS_OPTIONS}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsStatusConfirmOpen(false); setStatusUser(null); }}
                                    className="rounded-xl border px-4 py-2 text-sm"
                                    style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>Cancelar</button>
                                <button type="button" onClick={() => void onSaveStatus()} disabled={statusUpdatingId === statusUser.id_usuario}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white dark:text-(--cor-fundo) transition hover:shadow-lg disabled:opacity-60 bg-[#1a1a2e] dark:bg-(--cor-accentII)">
                                    {statusUpdatingId === statusUser.id_usuario ? "Salvando..." : "Salvar status"}
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
