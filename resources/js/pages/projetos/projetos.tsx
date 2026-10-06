import { usePage } from "@inertiajs/react";
import { ArrowLeft, Calendar, ChevronDown, ChevronLeft, ChevronRight, GripVertical, History, MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import type { FormEvent} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import RequiredMark from "@/components/ui/required-mark";
import DashboardLayout from "@/layouts/DashboardLayout";
import { apiRoutes } from "@/lib/routes";

type BoardStatus = "TO_DO" | "DOING" | "TESTE" | "APROVADO";
type BoardColumnKey = "BACKLOG" | BoardStatus | "HISTORY";

interface Usuario {
	id_usuario: number;
	id?: number | null;
	nome: string;
	foto_perfil?: string | null;
	cargo_relation?: { id_cargo: number; nome_cargo: string } | null;
}

interface SessionUser {
	id: number;
	name: string;
	avatar?: string | null;
	permissions?: {
		total?: boolean;
	};
}

interface PageProps {
	[key: string]: unknown;
	auth?: {
		user?: SessionUser | null;
	};
}

interface Projeto {
	id_projeto: number;
	nome_projeto: string;
	descricao?: string | null;
	prioridade_proj?: "BAIXA" | "MEDIA" | "ALTA" | null;
	status_projeto?: string | null;
	id_responsavel?: number | null;
	responsavel?: Usuario | null;
	kanban_padrao?: boolean | number | null;
}

interface BoardColunaApi {
	id_coluna: number;
	id_projeto: number;
	nome: string;
	progresso: number;
	ordem: number;
	arquiva_ao_concluir: boolean | number;
}

interface ProjetoExcluido {
	id: number;
	id_projeto_original?: number | null;
	nome_projeto: string;
	descricao?: string | null;
	data_inicio?: string | null;
	prazo_final?: string | null;
	status_projeto?: string | null;
	prioridade_proj?: string | null;
	id_responsavel?: number | null;
	tarefas_afetadas: number;
	metas_afetadas: number;
	excluido_em?: string | null;
	expira_em?: string | null;
}

interface TarefaApi {
	id_tarefa: number;
	titulo: string;
	descricao?: string | null;
	id_projeto?: number | null;
	id_sprint?: number | null;
	sprint?: SprintApi | null;
	em_historico?: boolean | null;
	id_responsavel?: number | null;
	prioridade_task?: string | null;
	tipo_task?: string | null;
	data_inicio?: string | null;
	data_prevista_termino?: string | null;
	prazo?: string | null;
	progresso?: number | null;
	bloqueada?: boolean | null;
	status_task?: string | null;
	id_coluna?: number | null;
	relacionados?: Usuario[];
	responsavel?: Usuario | null;
}

interface SprintApi {
	id_sprint: number;
	id_projeto: number;
	nome_sprint: string;
	data_inicio: string;
	data_fim: string;
	status_sprint: "ATIVA" | "ENCERRADA";
	encerrada_em?: string | null;
	tarefas_count?: number;
}

interface ApiEnvelope<T> {
	data?: T;
}

interface FormState {
	titulo: string;
	descricao: string;
	id_projeto: string;
	id_responsavel: string;
	prioridade_task: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
	tipo_task: "FRONT" | "BACK" | "FULLSTACK";
	bloqueada: boolean;
	status_task: BoardStatus;
	id_coluna: string;
	relacionados: number[];
}

interface ProjectFormState {
	nome_projeto: string;
	descricao: string;
	prioridade_proj: "" | "BAIXA" | "MEDIA" | "ALTA";
	status_projeto: string;
	id_responsavel: string;
	kanban_padrao: boolean;
}

const STATUS_COLUMNS: Array<{ key: BoardStatus; label: string }> = [
	{ key: "TO_DO", label: "To Do" },
	{ key: "DOING", label: "Doing" },
	{ key: "TESTE", label: "Teste" },
	{ key: "APROVADO", label: "Aprovado" },
];

const BOARD_COLUMNS: Array<{ key: BoardColumnKey; label: string }> = [
	{ key: "BACKLOG", label: "Backlog" },
	...STATUS_COLUMNS,
	{ key: "HISTORY", label: "History" },
];

const STATUS_PROGRESS: Record<BoardStatus, number> = {
	TO_DO: 0,
	DOING: 50,
	TESTE: 75,
	APROVADO: 100,
};

const EMPTY_FORM: FormState = {
	titulo: "",
	descricao: "",
	id_projeto: "",
	id_responsavel: "",
	prioridade_task: "MEDIA",
	tipo_task: "FRONT",
	bloqueada: false,
	status_task: "TO_DO",
	id_coluna: "",
	relacionados: [],
};

const EMPTY_PROJECT_FORM: ProjectFormState = {
	nome_projeto: "",
	descricao: "",
	prioridade_proj: "",
	status_projeto: "",
	id_responsavel: "",
	kanban_padrao: true,
};

function normalizeProjectPriorityValue(priority?: string | null): ProjectFormState["prioridade_proj"] {
	const raw = (priority ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toUpperCase()
		.trim();

	if (raw.includes("ALTA")) {
		return "ALTA";
	}

	if (raw.includes("BAIXA")) {
		return "BAIXA";
	}

	if (raw.includes("MEDIA") || raw.includes("MEDI")) {
		return "MEDIA";
	}

	return "";
}

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

function denormalizeStatus(status: BoardStatus): string {
	if (status === "DOING") {
		return "Doing";
	}

	if (status === "TESTE") {
		return "Teste";
	}

	if (status === "APROVADO") {
		return "Aprovado";
	}

	return "To Do";
}

function getProgressFromStatus(status?: string | null): number {
	return STATUS_PROGRESS[normalizeStatus(status)];
}

function formatDate(value?: string | null): string {
	if (!value) {
		return "-";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleDateString("pt-BR");
}

function formatDateTime(raw?: string | null): string {
	if (!raw) {
		return "-";
	}

	const date = new Date(raw);

	if (Number.isNaN(date.getTime())) {
		return "-";
	}

	return date.toLocaleDateString("pt-BR") + ", " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getRemainingDaysLabel(expiraEm?: string | null): string {
	if (!expiraEm) {
		return "tempo restante indisponivel";
	}

	const expiration = new Date(expiraEm).getTime();

	if (Number.isNaN(expiration)) {
		return "tempo restante indisponivel";
	}

	const remainingMs = expiration - Date.now();
	const dayMs = 24 * 60 * 60 * 1000;

	if (remainingMs <= 0) {
		return "expira hoje";
	}

	const days = Math.ceil(remainingMs / dayMs);

	return `expira em ${days} dia${days === 1 ? "" : "s"}`;
}

function priorityColor(priority?: string | null): string {
	const p = normalizePriorityValue(priority);

	if (p === "CRITICA") {
		return "#862e38";
	}

	if (p === "ALTA") {
		return "#eb7b3b";
	}

	if (p === "BAIXA") {
		return "#6ebd95";
	}

	return "#4e8ed8";
}

function typeColor(type?: string | null): string {
	const normalized = normalizeTipoValue(type);

	if (normalized === "BACK") {
		return "#2f5ec4";
	}

	if (normalized === "FULLSTACK") {
		return "#6f4bc3";
	}

	return "#259db0";
}

function normalizePriorityValue(priority?: string | null): FormState["prioridade_task"] {
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

function normalizeTipoValue(type?: string | null): FormState["tipo_task"] {
	const raw = (type ?? "").toUpperCase().trim();

	if (raw.includes("FULL")) {
		return "FULLSTACK";
	}

	if (raw.includes("BACK")) {
		return "BACK";
	}

	return "FRONT";
}

function priorityLabel(priority?: string | null): string {
	return normalizePriorityValue(priority);
}

function typeLabel(type?: string | null): string {
	const normalized = normalizeTipoValue(type);

    if (normalized === "FULLSTACK") {
        return "FULL STACK";
    }

	return normalized;
}

function resolveAvatarUrl(avatar?: string | null): string | undefined {
	if (!avatar) {
		return undefined;
	}

	if (avatar.startsWith("data:image/") || avatar.startsWith("http://") || avatar.startsWith("https://")) {
		return avatar;
	}

	return undefined;
}

function getInitials(name?: string): string {
	if (!name) {
		return "--";
	}

	const parts = name.trim().split(/\s+/).filter(Boolean);

	if (parts.length === 0) {
		return "--";
	}

	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getUsuarioId(usuario?: Partial<Usuario> | null): number | null {
	if (!usuario) {
		return null;
	}

	const raw = usuario.id_usuario ?? usuario.id;
	const parsed = Number(raw);

	if (!Number.isFinite(parsed)) {
		return null;
	}

	return parsed;
}

function normalizeSearchText(value?: string | null): string {
	return (value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function displayWithoutAccents(value?: string | null): string {
	const sanitized = (value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\x20-\x7E]/g, "")
		.replace(/\bSistem(?:a|o|u)?\b/gi, "Sistema")
		.replace(/\bGest(?:a|u)?o\b/gi, "Gestao")
		.replace(/\s+/g, " ")
		.trim();

	return sanitized;
}

function readCookie(name: string): string {
	if (typeof document === "undefined") {
		return "";
	}

	const prefix = `${name}=`;
	const cookie = document.cookie
		.split(";")
		.map((item) => item.trim())
		.find((item) => item.startsWith(prefix));

	if (!cookie) {
		return "";
	}

	return decodeURIComponent(cookie.slice(prefix.length));
}

interface SelectOption { value: string; label: string }

function computeMenuPlacement(trigger: HTMLElement, preferredHeight = 256) {
	const rect = trigger.getBoundingClientRect();
	const margin = 12;
	const spaceBelow = window.innerHeight - rect.bottom - margin;
	const spaceAbove = rect.top - margin;

	if (spaceBelow < 160 && spaceAbove > spaceBelow) {
		const maxHeight = Math.max(Math.min(preferredHeight, spaceAbove), 120);
		return { top: rect.top - maxHeight - 4, left: rect.left, width: rect.width, maxHeight };
	}

	const maxHeight = Math.max(Math.min(preferredHeight, spaceBelow), 120);
	return { top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight };
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
	"janeiro", "fevereiro", "março", "abril", "maio", "junho",
	"julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function toIsoDate(date: Date) {
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDate(iso: string): Date | null {
	if (!iso) return null;
	const [y, m, d] = iso.split("-").map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
}

function formatDateDisplay(iso: string): string {
	const date = parseIsoDate(iso);
	return date ? `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}` : "";
}

function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function DatePicker({ value, onChange, placeholder = "Selecionar data" }: {
	value: string; onChange: (value: string) => void; placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
	const [viewDate, setViewDate] = useState(() => parseIsoDate(value) ?? new Date());
	const ref = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const panelWidth = 288;

	const updateMenuRect = () => {
		const rect = ref.current?.getBoundingClientRect();
		if (!rect) return;
		const margin = 12;
		const panelHeight = 360;
		const spaceBelow = window.innerHeight - rect.bottom - margin;
		const spaceAbove = rect.top - margin;
		const left = Math.min(rect.left, window.innerWidth - panelWidth - margin);
		if (spaceBelow < panelHeight && spaceAbove > spaceBelow) {
			setMenuRect({ top: rect.top - panelHeight - 4, left });
		} else {
			setMenuRect({ top: rect.bottom + 4, left });
		}
	};

	useEffect(() => {
		if (!open) return;

		setViewDate(parseIsoDate(value) ?? new Date());
		ref.current?.scrollIntoView({ block: "center", behavior: "auto" });
		updateMenuRect();

		const handler = (e: MouseEvent) => {
			if (
				ref.current && !ref.current.contains(e.target as Node) &&
				menuRef.current && !menuRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		window.addEventListener("scroll", updateMenuRect, true);
		window.addEventListener("resize", updateMenuRect);

		return () => {
			document.removeEventListener("mousedown", handler);
			window.removeEventListener("scroll", updateMenuRect, true);
			window.removeEventListener("resize", updateMenuRect);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const today = new Date();
	const selected = parseIsoDate(value);

	const days = useMemo(() => {
		const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
		const gridStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - firstOfMonth.getDay());
		return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
	}, [viewDate]);

	return (
		<div className="relative">
			<button
				ref={ref}
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-base font-medium outline-none transition-all duration-200 hover:-translate-y-px hover:shadow-md"
				style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
			>
				<span style={{ color: value ? "var(--cor-logo)" : "var(--cor-logo2)" }}>
					{value ? formatDateDisplay(value) : placeholder}
				</span>
				<Calendar size={18} style={{ color: "var(--cor-logo2)", flexShrink: 0 }} />
			</button>

			{open && menuRect ? createPortal(
				<div
					ref={menuRef}
					className="animate-dropdown fixed z-[200] rounded-2xl border p-3 shadow-2xl"
					style={{
						top: menuRect.top,
						left: menuRect.left,
						width: panelWidth,
						backgroundColor: "var(--cor-widgets)",
						borderColor: "var(--cor-borda)",
						boxShadow: "0 18px 44px rgba(5, 18, 32, 0.28)",
					}}
				>
					<div className="mb-2 flex items-center justify-between">
						<span className="text-sm font-semibold capitalize" style={{ color: "var(--cor-logo)" }}>
							{MONTH_LABELS[viewDate.getMonth()]} de {viewDate.getFullYear()}
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
								className="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:shadow-sm"
								style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
								aria-label="Mês anterior"
							>
								<ChevronLeft size={14} />
							</button>
							<button
								type="button"
								onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
								className="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:shadow-sm"
								style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
								aria-label="Próximo mês"
							>
								<ChevronRight size={14} />
							</button>
						</div>
					</div>

					<div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold" style={{ color: "var(--cor-logo2)" }}>
						{WEEKDAY_LABELS.map((label, i) => <span key={i} className="py-1">{label}</span>)}
					</div>

					<div className="grid grid-cols-7 gap-1">
						{days.map((day) => {
							const outside = day.getMonth() !== viewDate.getMonth();
							const isSelected = selected ? isSameDay(day, selected) : false;
							const isToday = isSameDay(day, today);
							return (
								<button
									key={day.toISOString()}
									type="button"
									onClick={() => { onChange(toIsoDate(day)); setOpen(false); }}
									className="flex h-8 w-8 items-center justify-center rounded-lg text-sm transition hover:shadow-sm"
									style={{
										color: isSelected ? "#fff" : outside ? "var(--cor-logo2)" : "var(--cor-logo)",
										backgroundColor: isSelected ? "var(--cor-accent)" : "transparent",
										opacity: outside ? 0.45 : 1,
										boxShadow: !isSelected && isToday ? "inset 0 0 0 1.5px var(--cor-accent)" : undefined,
									}}
								>
									{day.getDate()}
								</button>
							);
						})}
					</div>

					<div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--cor-borda)" }}>
						<button
							type="button"
							onClick={() => { onChange(""); setOpen(false); }}
							className="text-sm font-medium transition hover:opacity-75"
							style={{ color: "var(--cor-logo2)" }}
						>
							Limpar
						</button>
						<button
							type="button"
							onClick={() => { onChange(toIsoDate(today)); setOpen(false); }}
							className="text-sm font-medium transition hover:opacity-75"
							style={{ color: "var(--cor-accent)" }}
						>
							Hoje
						</button>
					</div>
				</div>,
				document.body,
			) : null}
		</div>
	);
}

function CustomSelect({
	value,
	onChange,
	options,
	disabled,
	placeholder = "Selecione",
}: {
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	disabled?: boolean;
	placeholder?: string;
}) {
	const [open, setOpen] = useState(false);
	const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const updateMenuRect = () => {
		if (ref.current) {
			setMenuRect(computeMenuPlacement(ref.current));
		}
	};

	useEffect(() => {
		if (!open) {
return;
}

		ref.current?.scrollIntoView({ block: "center", behavior: "auto" });
		updateMenuRect();

		const handler = (e: MouseEvent) => {
			if (
				ref.current && !ref.current.contains(e.target as Node) &&
				menuRef.current && !menuRef.current.contains(e.target as Node)
			) {
setOpen(false);
}
		};
		document.addEventListener("mousedown", handler);
		window.addEventListener("scroll", updateMenuRect, true);
		window.addEventListener("resize", updateMenuRect);

		return () => {
			document.removeEventListener("mousedown", handler);
			window.removeEventListener("scroll", updateMenuRect, true);
			window.removeEventListener("resize", updateMenuRect);
		};
	}, [open]);

	const selected = options.find((o) => o.value === value);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				disabled={disabled}
				onClick={() => !disabled && setOpen((v) => !v)}
				className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-base font-medium outline-none transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
				style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
			>
				<span>{selected?.label ?? placeholder}</span>
				<ChevronDown
					size={20}
					style={{ transition: "transform 0.24s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--cor-logo2)", flexShrink: 0 }}
				/>
			</button>
			{open && menuRect ? createPortal(
				<div
					ref={menuRef}
					className="animate-dropdown fixed z-[200] overflow-y-auto rounded-2xl border p-1.5 shadow-2xl"
					style={{
						top: menuRect.top,
						left: menuRect.left,
						width: menuRect.width,
						maxHeight: menuRect.maxHeight,
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
							className="w-full rounded-xl px-4 py-2.5 text-left text-[15px] font-medium transition-colors"
							style={{
								color: "var(--cor-logo)",
								backgroundColor: value === option.value
									? "color-mix(in srgb, var(--cor-botao) 78%, var(--cor-fundo))"
									: "transparent",
							}}
							onMouseEnter={(e) => {
								if (value !== option.value) {
									(e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--cor-fundo)";
								}
							}}
							onMouseLeave={(e) => {
								if (value !== option.value) {
									(e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
								}
							}}
						>
							{option.label}
						</button>
					))}
				</div>,
				document.body,
			) : null}
		</div>
	);
}

function AvatarPill({ usuario, size = 30 }: { usuario: Usuario; size?: number }) {
	const avatarUrl = resolveAvatarUrl(usuario.foto_perfil);

	if (avatarUrl) {
		return (
			<img
				src={avatarUrl}
				alt={usuario.nome}
				title={usuario.nome}
				className="rounded-full border object-cover"
				style={{ width: size, height: size, borderColor: "#c6d0db" }}
			/>
		);
	}

	return (
		<span
			title={usuario.nome}
			className="inline-flex items-center justify-center rounded-full border text-[10px]"
			style={{ width: size, height: size, borderColor: "#c6d0db", color: "#4b5f75", backgroundColor: "#edf3f8" }}
		>
			{getInitials(usuario.nome)}
		</span>
	);
}

function RelatedPeoplePicker({ usuarios, selectedIds, onToggle }: {
	usuarios: Usuario[]; selectedIds: number[]; onToggle: (id: number) => void;
}) {
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);
	const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const updateMenuRect = () => {
		if (inputRef.current) {
			setMenuRect(computeMenuPlacement(inputRef.current, 192));
		}
	};

	useEffect(() => {
		if (!open) return;

		inputRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
		updateMenuRect();

		const handler = (e: MouseEvent) => {
			if (
				ref.current && !ref.current.contains(e.target as Node) &&
				menuRef.current && !menuRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		window.addEventListener("scroll", updateMenuRect, true);
		window.addEventListener("resize", updateMenuRect);

		return () => {
			document.removeEventListener("mousedown", handler);
			window.removeEventListener("scroll", updateMenuRect, true);
			window.removeEventListener("resize", updateMenuRect);
		};
	}, [open]);

	const selected = useMemo(
		() => usuarios.filter((usuario) => selectedIds.includes(usuario.id_usuario)),
		[usuarios, selectedIds],
	);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return q ? usuarios.filter((usuario) => usuario.nome.toLowerCase().includes(q)) : usuarios;
	}, [usuarios, search]);

	return (
		<div ref={ref} className="relative">
			{selected.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-1.5">
					{selected.map((usuario) => (
						<span
							key={usuario.id_usuario}
							className="inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 text-xs"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
						>
							<AvatarPill usuario={usuario} size={18} />
							{usuario.nome}
							<button
								type="button"
								onClick={() => onToggle(usuario.id_usuario)}
								aria-label={`Remover ${usuario.nome}`}
								className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-black/10"
							>
								<X size={10} />
							</button>
						</span>
					))}
				</div>
			)}

			<input
				ref={inputRef}
				type="text"
				value={search}
				onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
				onFocus={() => setOpen(true)}
				placeholder="Buscar pessoa pelo nome..."
				className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2"
				style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
			/>

			{open && menuRect ? createPortal(
				<div
					ref={menuRef}
					className="animate-dropdown fixed z-[200] overflow-y-auto rounded-xl border shadow-lg"
					style={{
						top: menuRect.top,
						left: menuRect.left,
						width: menuRect.width,
						maxHeight: menuRect.maxHeight,
						borderColor: "var(--cor-borda)",
						backgroundColor: "var(--cor-widgets)",
					}}
				>
					{filtered.length === 0 ? (
						<p className="px-3 py-2 text-sm" style={{ color: "var(--cor-logo2)" }}>Nenhuma pessoa encontrada.</p>
					) : filtered.map((usuario) => (
						<label
							key={usuario.id_usuario}
							className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition hover:bg-black/5"
							style={{ color: "var(--cor-logo)" }}
						>
							<input
								type="checkbox"
								checked={selectedIds.includes(usuario.id_usuario)}
								onChange={() => onToggle(usuario.id_usuario)}
							/>
							<AvatarPill usuario={usuario} size={20} />
							{usuario.nome}
						</label>
					))}
				</div>,
				document.body,
			) : null}
		</div>
	);
}

export default function Projetos() {
	const page = usePage<PageProps>();
	const me = page.props.auth?.user;
	const searchParams = new URLSearchParams(window.location.search);
	const projectParam = searchParams.get("project");
	const taskParam = searchParams.get("task");
	const deepLinkKey = `${projectParam ?? ""}:${taskParam ?? ""}`;
	const appliedDeepLinkRef = useRef<string>("");
	const isAdmin = Boolean(me?.permissions?.total);
	const [tarefas, setTarefas] = useState<TarefaApi[]>([]);
	const [usuarios, setUsuarios] = useState<Usuario[]>([]);
	const [projetos, setProjetos] = useState<Projeto[]>([]);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [attemptedTaskSubmit, setAttemptedTaskSubmit] = useState(false);
	const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
	const [attemptedProjectSubmit, setAttemptedProjectSubmit] = useState(false);
	const [attemptedSprintSubmit, setAttemptedSprintSubmit] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isSavingProject, setIsSavingProject] = useState(false);
	const [isDeletingProject, setIsDeletingProject] = useState<number | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [isProjectHistoryOpen, setIsProjectHistoryOpen] = useState(false);
	const [isLoadingProjectHistory, setIsLoadingProjectHistory] = useState(false);
	const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [projectQuery, setProjectQuery] = useState("");
	const [projectSort, setProjectSort] = useState<"AZ" | "ZA" | "CARDS_DESC" | "CARDS_ASC">("AZ");
	const [projectStatusFilter, setProjectStatusFilter] = useState<"TODOS" | "PLANEJAMENTO" | "EM_ANDAMENTO" | "CONCLUIDO">("TODOS");
	const [projectPriorityFilter, setProjectPriorityFilter] = useState<"TODAS" | "ALTA" | "MEDIA" | "BAIXA">("TODAS");
	const [query, setQuery] = useState("");
	const [visibleColumns, setVisibleColumns] = useState<Record<BoardColumnKey, boolean>>({
		BACKLOG: true,
		TO_DO: true,
		DOING: true,
		TESTE: true,
		APROVADO: true,
		HISTORY: true,
	});
	const [selectedTask, setSelectedTask] = useState<TarefaApi | null>(null);
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isEditingDetails, setIsEditingDetails] = useState(false);
	const [detailsForm, setDetailsForm] = useState<FormState>(EMPTY_FORM);
	const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
	const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
	const [projectToDelete, setProjectToDelete] = useState<Projeto | null>(null);
	const [deletedProjectsHistory, setDeletedProjectsHistory] = useState<ProjetoExcluido[]>([]);
	const [restoringProjectHistoryId, setRestoringProjectHistoryId] = useState<number | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [sprints, setSprints] = useState<SprintApi[]>([]);
	const [isLoadingSprints, setIsLoadingSprints] = useState(false);
	const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
	const [isCreatingSprint, setIsCreatingSprint] = useState(false);
	const [isClosingSprint, setIsClosingSprint] = useState(false);
	const [sprintForm, setSprintForm] = useState({
		nome_sprint: "",
		data_inicio: "",
		data_fim: "",
	});

	// ── Colunas customizadas (projetos sem kanban padrao) ──────────
	const [colunasCustom, setColunasCustom] = useState<BoardColunaApi[]>([]);
	const [isLoadingColunas, setIsLoadingColunas] = useState(false);
	const [isColunaModalOpen, setIsColunaModalOpen] = useState(false);
	const [editingColuna, setEditingColuna] = useState<BoardColunaApi | null>(null);
	const [colunaForm, setColunaForm] = useState({ nome: "", progresso: "0", arquiva_ao_concluir: false });
	const [savingColuna, setSavingColuna] = useState(false);
	const [deletingColuna, setDeletingColuna] = useState<BoardColunaApi | null>(null);
	const [deletingColunaId, setDeletingColunaId] = useState<number | null>(null);

	const csrfToken = useMemo(() => {
		const tokenFromMeta = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";

		if (tokenFromMeta) {
			return tokenFromMeta;
		}

		return readCookie("XSRF-TOKEN");
	}, []);

	const mutationHeaders = useMemo(() => {
		const headers: Record<string, string> = {
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
		};

		if (csrfToken) {
			headers["X-CSRF-TOKEN"] = csrfToken;
			headers["X-XSRF-TOKEN"] = csrfToken;
		}

		return headers;
	}, [csrfToken]);

	const fetchBoard = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const [tarefasResponse, usuariosResponse, projetosResponse] = await Promise.all([
				fetch(apiRoutes.tarefas, { credentials: 'same-origin', headers: { Accept: "application/json" } }),
				fetch(apiRoutes.usuarios, { credentials: 'same-origin', headers: { Accept: "application/json" } }),
				fetch(apiRoutes.projetos, { credentials: 'same-origin', headers: { Accept: "application/json" } }),
			]);

			const tarefasPayload = (await tarefasResponse.json()) as ApiEnvelope<{ tarefas?: TarefaApi[] }>;
			const usuariosPayload = (await usuariosResponse.json()) as ApiEnvelope<{ usuarios?: Usuario[] }>;
			const projetosPayload = (await projetosResponse.json()) as ApiEnvelope<{ projetos?: Projeto[] }>;

			setTarefas(tarefasPayload.data?.tarefas ?? []);
			setUsuarios(usuariosPayload.data?.usuarios ?? []);
			setProjetos(projetosPayload.data?.projetos ?? []);
		} catch {
			setError("Nao foi possivel carregar os dados do quadro.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void fetchBoard();
	}, []);

	useEffect(() => {
		if (!projectParam && !taskParam) {
			appliedDeepLinkRef.current = "";

			return;
		}

		const projectId = projectParam ? Number(projectParam) : null;
		const taskId = taskParam ? Number(taskParam) : null;

		if (Number.isFinite(projectId) && selectedProjectId !== projectId) {
			setSelectedProjectId(projectId);

			return;
		}

		if (projectId !== null && selectedProjectId !== projectId) {
			return;
		}

		if (taskId !== null) {
			const targetTask = tarefas.find((task) => task.id_tarefa === taskId);

			if (targetTask && appliedDeepLinkRef.current !== deepLinkKey) {
				openTaskDetails(targetTask);
				appliedDeepLinkRef.current = deepLinkKey;
			}

			return;
		}

		if (appliedDeepLinkRef.current !== deepLinkKey) {
			appliedDeepLinkRef.current = deepLinkKey;
		}
	}, [deepLinkKey, projectParam, selectedProjectId, taskParam, tarefas]);

	useEffect(() => {
		if (!successMessage) {
			return;
		}

		const timer = window.setTimeout(() => {
			setSuccessMessage(null);
		}, 2600);

		return () => window.clearTimeout(timer);
	}, [successMessage]);

	const fetchSprints = async (idProjeto: number) => {
		setIsLoadingSprints(true);

		try {
			const response = await fetch(`${apiRoutes.sprints}?id_projeto=${idProjeto}`, {
				credentials: "same-origin",
				headers: { Accept: "application/json" },
			});

			if (!response.ok) {
				throw new Error("Erro ao carregar sprints");
			}

			const payload = (await response.json()) as ApiEnvelope<{ sprints?: SprintApi[] }>;
			setSprints(payload.data?.sprints ?? []);
		} catch {
			setSprints([]);
		} finally {
			setIsLoadingSprints(false);
		}
	};

	useEffect(() => {
		if (selectedProjectId === null) {
			setSprints([]);
			setIsSprintModalOpen(false);

			return;
		}

		void fetchSprints(selectedProjectId);
	}, [selectedProjectId]);

	const fetchColunas = async (idProjeto: number) => {
		setIsLoadingColunas(true);

		try {
			const response = await fetch(apiRoutes.projetoColunas(idProjeto), {
				credentials: "same-origin",
				headers: { Accept: "application/json" },
			});

			if (!response.ok) {
				throw new Error("Erro ao carregar colunas");
			}

			const payload = (await response.json()) as ApiEnvelope<{ colunas?: BoardColunaApi[] }>;
			setColunasCustom(payload.data?.colunas ?? []);
		} catch {
			setColunasCustom([]);
		} finally {
			setIsLoadingColunas(false);
		}
	};

	useEffect(() => {
		if (selectedProjectId === null) {
			setColunasCustom([]);

			return;
		}

		void fetchColunas(selectedProjectId);
	}, [selectedProjectId]);

	const selectedProject = useMemo(
		() => projetos.find((projeto) => projeto.id_projeto === selectedProjectId) ?? null,
		[projetos, selectedProjectId],
	);

	const activeSprint = useMemo(
		() => sprints.find((sprint) => sprint.status_sprint === "ATIVA") ?? null,
		[sprints],
	);

	const tasksOfSelectedProject = useMemo(() => {
		if (selectedProjectId === null) {
			return [];
		}

		return tarefas.filter((tarefa) => Number(tarefa.id_projeto) === selectedProjectId);
	}, [tarefas, selectedProjectId]);

	const projectCards = useMemo(() => {
		return projetos.map((projeto) => {
			const projectTasks = tarefas.filter((tarefa) => Number(tarefa.id_projeto) === projeto.id_projeto);
			const toDo = projectTasks.filter((tarefa) => normalizeStatus(tarefa.status_task) === "TO_DO").length;
			const doing = projectTasks.filter((tarefa) => normalizeStatus(tarefa.status_task) === "DOING").length;
			const teste = projectTasks.filter((tarefa) => normalizeStatus(tarefa.status_task) === "TESTE").length;
			const aprovado = projectTasks.filter((tarefa) => normalizeStatus(tarefa.status_task) === "APROVADO").length;
			const avgProgress = projectTasks.length > 0
				? Math.round(projectTasks.reduce((acc, tarefa) => acc + getProgressFromStatus(tarefa.status_task), 0) / projectTasks.length)
				: 0;

			const sprintTasks = projectTasks.filter((tarefa) => !tarefa.em_historico && Number(tarefa.id_sprint));
			const activeSprint = sprintTasks
				.map((tarefa) => tarefa.sprint)
				.filter((sprint): sprint is SprintApi => sprint != null && sprint.status_sprint === "ATIVA")
				.sort((a, b) => Number(b.id_sprint) - Number(a.id_sprint))[0] ?? null;

			const activeSprintTasks = activeSprint
				? sprintTasks.filter((tarefa) => Number(tarefa.id_sprint) === Number(activeSprint.id_sprint))
				: [];

			const pendingInActiveSprint = activeSprintTasks.filter(
				(tarefa) => normalizeStatus(tarefa.status_task) !== "APROVADO",
			).length;

			const sprintEndTime = activeSprint ? new Date(activeSprint.data_fim).setHours(23, 59, 59, 999) : NaN;
			const isOverdueBySprint = Boolean(
				activeSprint
				&& Number.isFinite(sprintEndTime)
				&& Date.now() > sprintEndTime
				&& pendingInActiveSprint > 0,
			);

			return {
				...projeto,
				total: projectTasks.length,
				toDo,
				doing,
				teste,
				aprovado,
				avgProgress,
				activeSprint,
				pendingInActiveSprint,
				isOverdueBySprint,
			};
		});
	}, [projetos, tarefas]);

	const filteredProjectCards = useMemo(() => {
		const term = normalizeSearchText(projectQuery);
		const filtered = projectCards.filter((projeto) => {
			const searchable = [
				projeto.nome_projeto,
				projeto.descricao,
				projeto.responsavel?.nome,
			];

			if (term && !searchable.some((value) => normalizeSearchText(value).includes(term))) {
				return false;
			}

			const normalizedStatus = normalizeSearchText(projeto.status_projeto);

			if (projectStatusFilter === "PLANEJAMENTO" && !normalizedStatus.includes("planejamento")) {
				return false;
			}

			if (projectStatusFilter === "EM_ANDAMENTO" && !normalizedStatus.includes("andamento")) {
				return false;
			}

			if (projectStatusFilter === "CONCLUIDO" && !normalizedStatus.includes("concluido")) {
				return false;
			}

			if (projectPriorityFilter !== "TODAS") {
				const normalizedPriority = normalizeProjectPriorityValue(projeto.prioridade_proj);

				if (normalizedPriority !== projectPriorityFilter) {
					return false;
				}
			}

			return true;
		});

		const sorted = [...filtered].sort((a, b) => {
			if (projectSort === "AZ") {
				return displayWithoutAccents(a.nome_projeto).localeCompare(displayWithoutAccents(b.nome_projeto), "pt-BR");
			}

			if (projectSort === "ZA") {
				return displayWithoutAccents(b.nome_projeto).localeCompare(displayWithoutAccents(a.nome_projeto), "pt-BR");
			}

			if (projectSort === "CARDS_ASC") {
				return a.total - b.total;
			}

			return b.total - a.total;
		});

		return sorted;
	}, [projectCards, projectPriorityFilter, projectQuery, projectSort, projectStatusFilter]);

	const grouped = useMemo(() => {
		const base: Record<BoardColumnKey, TarefaApi[]> = {
			BACKLOG: [],
			TO_DO: [],
			DOING: [],
			TESTE: [],
			APROVADO: [],
			HISTORY: [],
		};

		tasksOfSelectedProject.forEach((tarefa) => {
			if (tarefa.em_historico) {
				base.HISTORY.push(tarefa);

				return;
			}

			if (!activeSprint || Number(tarefa.id_sprint) !== Number(activeSprint.id_sprint)) {
				base.BACKLOG.push(tarefa);

				return;
			}

			base[normalizeStatus(tarefa.status_task)].push(tarefa);
		});

		return base;
	}, [activeSprint, tasksOfSelectedProject]);

	const filteredGrouped = useMemo(() => {
		if (!query.trim()) {
			return grouped;
		}

		const term = normalizeSearchText(query);
		const base: Record<BoardColumnKey, TarefaApi[]> = {
			BACKLOG: [],
			TO_DO: [],
			DOING: [],
			TESTE: [],
			APROVADO: [],
			HISTORY: [],
		};

		(Object.keys(grouped) as BoardColumnKey[]).forEach((status) => {
			base[status] = grouped[status].filter((item) => {
				const title = normalizeSearchText(item.titulo);

				return title.includes(term);
			});
		});

		return base;
	}, [grouped, query]);

	const visibleBoardColumns = useMemo(
		() => BOARD_COLUMNS.filter((column) => visibleColumns[column.key]),
		[visibleColumns],
	);

	const hiddenBoardColumns = useMemo(
		() => BOARD_COLUMNS.filter((column) => !visibleColumns[column.key]),
		[visibleColumns],
	);

	const toggleColumnVisibility = (key: BoardColumnKey) => {
		setVisibleColumns((current) => ({
			...current,
			[key]: !current[key],
		}));
	};

	const selectedRelatedUsers = useMemo(
		() => {
			const relatedIds = detailsForm.relacionados
				.map((id) => Number(id))
				.filter((id) => Number.isFinite(id));

			if (relatedIds.length === 0) {
				return [];
			}

			const usersById = new Map<number, Usuario>();

			usuarios.forEach((usuario) => {
				const id = getUsuarioId(usuario);

				if (id !== null) {
					usersById.set(id, usuario);
				}
			});

			(selectedTask?.relacionados ?? []).forEach((usuario) => {
				const id = getUsuarioId(usuario);

				if (id !== null && !usersById.has(id)) {
					usersById.set(id, usuario);
				}
			});

			return relatedIds
				.map((id) => usersById.get(id))
				.filter((usuario): usuario is Usuario => Boolean(usuario));
		},
		[usuarios, detailsForm.relacionados, selectedTask],
	);

	const onToggleRelacionado = (idUsuario: number) => {
		setForm((current) => {
			const exists = current.relacionados.includes(idUsuario);

			return {
				...current,
				relacionados: exists
					? current.relacionados.filter((id) => id !== idUsuario)
					: [...current.relacionados, idUsuario],
			};
		});
	};

	const addMeToRelacionados = () => {
		if (!me?.id) {
			return;
		}

		onToggleRelacionado(me.id);
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const isCustomProject = selectedProject?.kanban_padrao === false;

		if (isCustomProject && !form.id_coluna) {
			setError("Selecione uma coluna para o card.");

			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			const colunaEscolhida = isCustomProject
				? colunasCustom.find((c) => c.id_coluna === Number(form.id_coluna))
				: undefined;

			const payload = {
				titulo: form.titulo,
				descricao: form.descricao || null,
				id_projeto: form.id_projeto ? Number(form.id_projeto) : null,
				id_responsavel: form.id_responsavel ? Number(form.id_responsavel) : null,
				prioridade_task: form.prioridade_task,
				tipo_task: form.tipo_task,
				bloqueada: form.bloqueada,
				relacionados: form.relacionados,
				...(isCustomProject
					? {
						id_coluna: colunaEscolhida?.id_coluna ?? null,
						status_task: colunaEscolhida?.nome ?? null,
						progresso: colunaEscolhida?.progresso ?? 0,
						em_historico: Boolean(colunaEscolhida?.arquiva_ao_concluir),
					}
					: {
						progresso: STATUS_PROGRESS[form.status_task],
						status_task: denormalizeStatus(form.status_task),
					}),
			};

			const response = await fetch(apiRoutes.tarefas, {
				credentials: 'same-origin',
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...mutationHeaders,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao salvar tarefa");
			}

			setForm(EMPTY_FORM);
			setIsModalOpen(false);
			setAttemptedTaskSubmit(false);
			await fetchBoard();
		} catch (error) {
			const message = error instanceof Error && error.message
				? error.message
				: "Nao foi possivel salvar o card. Verifique os campos obrigatorios.";

			setError(message);
		} finally {
			setIsSaving(false);
		}
	};

	const closeProjectModal = () => {
		setIsProjectModalOpen(false);
		setEditingProjectId(null);
		setProjectForm(EMPTY_PROJECT_FORM);
		setAttemptedProjectSubmit(false);
	};

	const onEditProject = (projeto: Projeto) => {
		if (!isAdmin) {
			setError("Apenas administradores podem editar projetos.");

			return;
		}

		setEditingProjectId(projeto.id_projeto);
		setProjectForm({
			nome_projeto: projeto.nome_projeto ?? "",
			descricao: projeto.descricao ?? "",
			prioridade_proj: normalizeProjectPriorityValue(projeto.prioridade_proj),
			status_projeto: projeto.status_projeto ?? "",
			id_responsavel: projeto.id_responsavel ? String(projeto.id_responsavel) : "",
			kanban_padrao: projeto.kanban_padrao !== false,
		});
		setIsProjectModalOpen(true);
	};

	const onDeleteProject = async () => {
		if (!isAdmin) {
			setError("Apenas administradores podem excluir projetos.");

			return;
		}

		if (!projectToDelete) {
			return;
		}

		const projeto = projectToDelete;

		setIsDeletingProject(projeto.id_projeto);
		setError(null);

		try {
			const response = await fetch(`${apiRoutes.projetos}/${projeto.id_projeto}`, {
				method: "DELETE",
				credentials: 'same-origin',
				headers: mutationHeaders,
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao excluir projeto");
			}

			if (selectedProjectId === projeto.id_projeto) {
				setSelectedProjectId(null);
			}

			setProjectToDelete(null);
			await fetchBoard();
			setSuccessMessage("Projeto excluido com sucesso");
		} catch (error) {
			const message = error instanceof Error && error.message
				? error.message
				: "Nao foi possivel excluir o projeto.";

			setError(message);
		} finally {
			setIsDeletingProject(null);
		}
	};

	const loadDeletedProjectsHistory = async () => {
		setIsLoadingProjectHistory(true);
		setError(null);

		try {
			const response = await fetch(apiRoutes.projetosExcluidosHistorico, {
				credentials: 'same-origin',
				headers: { Accept: "application/json" },
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao carregar historico de projetos excluidos");
			}

			const payload = (await response.json()) as ApiEnvelope<{ projetos_excluidos?: ProjetoExcluido[] }>;
			setDeletedProjectsHistory(payload.data?.projetos_excluidos ?? []);
		} catch (error) {
			const message = error instanceof Error && error.message
				? error.message
				: "Nao foi possivel carregar o historico de projetos excluidos.";

			setError(message);
		} finally {
			setIsLoadingProjectHistory(false);
		}
	};

	const restoreDeletedProject = async (registro: ProjetoExcluido) => {
		if (!isAdmin) {
			setError("Apenas administradores podem restaurar projetos.");

			return;
		}

		setRestoringProjectHistoryId(registro.id);
		setError(null);

		try {
			const response = await fetch(apiRoutes.projetosExcluidosRestaurar(registro.id), {
				method: "POST",
				credentials: 'same-origin',
				headers: mutationHeaders,
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao restaurar projeto");
			}

			setDeletedProjectsHistory((current) => current.filter((item) => item.id !== registro.id));
			await fetchBoard();
			setSuccessMessage("Projeto restaurado com sucesso");
		} catch (error) {
			const message = error instanceof Error && error.message
				? error.message
				: "Nao foi possivel restaurar o projeto.";

			setError(message);
		} finally {
			setRestoringProjectHistoryId(null);
		}
	};

	const onCreateSprint = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isAdmin || !selectedProjectId) {
			return;
		}

		if (!sprintForm.data_inicio || !sprintForm.data_fim) {
			setError("Informe a data de inicio e de finalizacao da sprint.");
			return;
		}

		setIsCreatingSprint(true);
		setError(null);

		try {
			const response = await fetch(apiRoutes.sprints, {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json",
					...mutationHeaders,
				},
				body: JSON.stringify({
					id_projeto: selectedProjectId,
					nome_sprint: sprintForm.nome_sprint || null,
					data_inicio: sprintForm.data_inicio,
					data_fim: sprintForm.data_fim,
				}),
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao criar sprint");
			}

			setSprintForm({ nome_sprint: "", data_inicio: "", data_fim: "" });
			setAttemptedSprintSubmit(false);
			await fetchSprints(selectedProjectId);
			setSuccessMessage("Sprint criada com sucesso");
		} catch (error) {
			setError(error instanceof Error ? error.message : "Nao foi possivel criar a sprint.");
		} finally {
			setIsCreatingSprint(false);
		}
	};

	const onCloseActiveSprint = async () => {
		if (!isAdmin || !activeSprint || !selectedProjectId) {
			return;
		}

		setIsClosingSprint(true);
		setError(null);

		try {
			const response = await fetch(apiRoutes.sprintsEncerrar(activeSprint.id_sprint), {
				method: "PATCH",
				credentials: "same-origin",
				headers: mutationHeaders,
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao encerrar sprint");
			}

			await Promise.all([
				fetchBoard(),
				fetchSprints(selectedProjectId),
			]);
			setSuccessMessage("Sprint encerrada. Cards concluídos foram para History.");
		} catch (error) {
			setError(error instanceof Error ? error.message : "Nao foi possivel encerrar a sprint.");
		} finally {
			setIsClosingSprint(false);
		}
	};

	const onSaveProject = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!isAdmin) {
			setError("Apenas administradores podem criar ou editar projetos.");

			return;
		}

		setIsSavingProject(true);
		setError(null);

		try {
			const normalizedPriority = normalizeProjectPriorityValue(projectForm.prioridade_proj);

			const isEditingProject = editingProjectId !== null;

			const payload = {
				nome_projeto: projectForm.nome_projeto,
				descricao: projectForm.descricao || null,
				prioridade_proj: normalizedPriority || null,
				status_projeto: projectForm.status_projeto || null,
				id_responsavel: projectForm.id_responsavel ? Number(projectForm.id_responsavel) : null,
				...(isEditingProject ? {} : { kanban_padrao: projectForm.kanban_padrao }),
			};
			const response = await fetch(
				isEditingProject ? `${apiRoutes.projetos}/${editingProjectId}` : apiRoutes.projetos,
				{
					method: isEditingProject ? "PUT" : "POST",
					credentials: 'same-origin',
				headers: {
					"Content-Type": "application/json",
						...mutationHeaders,
					},
					body: JSON.stringify(payload),
				},
			);

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;

				throw new Error(payloadError?.message ?? "Erro ao salvar projeto");
			}

			closeProjectModal();
			await fetchBoard();
			setSuccessMessage(isEditingProject ? "Projeto editado com sucesso" : "Projeto criado com sucesso");
		} catch (error) {
			const message = error instanceof Error && error.message
				? error.message
				: (editingProjectId !== null ? "Nao foi possivel editar o projeto." : "Nao foi possivel criar o projeto.");

			setError(message);
		} finally {
			setIsSavingProject(false);
		}
	};

	const openTaskDetails = (task: TarefaApi) => {
		setSelectedTask(task);
		const relatedIds = (task.relacionados ?? [])
			.map((u) => getUsuarioId(u))
			.filter((id): id is number => id !== null);

		setDetailsForm({
			titulo: task.titulo ?? "",
			descricao: task.descricao ?? "",
			id_projeto: task.id_projeto ? String(task.id_projeto) : "",
			id_responsavel: task.id_responsavel ? String(task.id_responsavel) : "",
			prioridade_task: normalizePriorityValue(task.prioridade_task),
			tipo_task: normalizeTipoValue(task.tipo_task),
			bloqueada: Boolean(task.bloqueada),
			status_task: normalizeStatus(task.status_task),
			id_coluna: task.id_coluna ? String(task.id_coluna) : "",
			relacionados: relatedIds,
		});
		setIsEditingDetails(false);
		setIsDetailsOpen(true);
	};

	const onToggleRelacionadoDetails = (idUsuario: number) => {
		const targetId = Number(idUsuario);

		setDetailsForm((current) => {
			const normalized = current.relacionados
				.map((id) => Number(id))
				.filter((id) => Number.isFinite(id));
			const exists = normalized.includes(targetId);

			return {
				...current,
				relacionados: exists
					? normalized.filter((id) => id !== targetId)
					: [...normalized, targetId],
			};
		});
	};

	const addMeToRelacionadosDetails = () => {
		if (!me?.id) {
			return;
		}

		onToggleRelacionadoDetails(me.id);
	};

	const onSaveDetails = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!selectedTask) {
			return;
		}

		setIsUpdating(true);
		setError(null);

		try {
			const normalizedRelatedIds = detailsForm.relacionados
				.map((id) => Number(id))
				.filter((id) => Number.isFinite(id));

			const isCustomProject = selectedProject?.kanban_padrao === false;
			const colunaEscolhida = isCustomProject
				? colunasCustom.find((c) => c.id_coluna === Number(detailsForm.id_coluna))
				: undefined;

			const payload = {
				titulo: detailsForm.titulo,
				descricao: detailsForm.descricao || null,
				id_projeto: detailsForm.id_projeto ? Number(detailsForm.id_projeto) : null,
				id_responsavel: detailsForm.id_responsavel ? Number(detailsForm.id_responsavel) : null,
				prioridade_task: detailsForm.prioridade_task,
				tipo_task: detailsForm.tipo_task,
				bloqueada: detailsForm.bloqueada,
				relacionados: normalizedRelatedIds,
				...(isCustomProject
					? {
						id_coluna: colunaEscolhida?.id_coluna ?? null,
						status_task: colunaEscolhida?.nome ?? null,
						progresso: colunaEscolhida?.progresso ?? 0,
						em_historico: Boolean(colunaEscolhida?.arquiva_ao_concluir),
					}
					: {
						progresso: STATUS_PROGRESS[detailsForm.status_task],
						status_task: denormalizeStatus(detailsForm.status_task),
					}),
			};

			const response = await fetch(`${apiRoutes.tarefas}/${selectedTask.id_tarefa}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...mutationHeaders,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error("Falha ao atualizar card");
			}

			setIsEditingDetails(false);
			setIsDetailsOpen(false);
			setSelectedTask(null);
			setSuccessMessage("Editado com sucesso");
			await fetchBoard();
		} catch {
			setError("Nao foi possivel salvar as alteracoes do card.");
		} finally {
			setIsUpdating(false);
		}
	};

	const onDeleteSelectedTask = async () => {
		if (!selectedTask) {
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			const response = await fetch(`${apiRoutes.tarefas}/${selectedTask.id_tarefa}`, {
				method: "DELETE",
				headers: mutationHeaders,
			});

			if (!response.ok) {
				throw new Error("Falha ao excluir card");
			}

			setIsDeleteConfirmOpen(false);
			setIsDetailsOpen(false);
			setIsEditingDetails(false);
			setSelectedTask(null);
			setSuccessMessage("Deletado com sucesso");
			await fetchBoard();
		} catch {
			setError("Nao foi possivel excluir o card.");
		} finally {
			setIsDeleting(false);
		}
	};

	const moveTaskToColumn = async (taskId: number, nextStatus: BoardColumnKey) => {
		const tarefaAtual = tarefas.find((item) => item.id_tarefa === taskId);

		if (!tarefaAtual) {
			return;
		}

		if (tarefaAtual.em_historico || nextStatus === "HISTORY") {
			return;
		}

		if (nextStatus !== "BACKLOG" && !activeSprint) {
			setError("Crie uma sprint ativa para mover cards para o fluxo da sprint.");

			return;
		}

		const currentColumn: BoardColumnKey = tarefaAtual.em_historico
			? "HISTORY"
			: (activeSprint && Number(tarefaAtual.id_sprint) === Number(activeSprint.id_sprint)
				? normalizeStatus(tarefaAtual.status_task)
				: "BACKLOG");

		if (currentColumn === nextStatus) {
			return;
		}

		setMovingTaskId(taskId);
		setError(null);

		const patchPayload: Record<string, unknown> = {};

		if (nextStatus === "BACKLOG") {
			patchPayload.id_sprint = null;
		} else {
			patchPayload.id_sprint = activeSprint?.id_sprint ?? null;
			patchPayload.status_task = denormalizeStatus(nextStatus as BoardStatus);
			patchPayload.progresso = STATUS_PROGRESS[nextStatus as BoardStatus];
		}

		const previous = [...tarefas];
		setTarefas((current) => current.map((item) => (
			item.id_tarefa === taskId
				? {
					...item,
					...patchPayload,
				}
				: item
		)));

		try {
			const response = await fetch(`${apiRoutes.tarefas}/${taskId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...mutationHeaders,
				},
				body: JSON.stringify(patchPayload),
			});

			if (!response.ok) {
				throw new Error("Falha ao mover card");
			}
		} catch {
			setTarefas(previous);
			setError("Nao foi possivel mover o card. Tente novamente.");
		} finally {
			setMovingTaskId(null);
		}
	};

	// ── Colunas customizadas: CRUD ──────────────────────────────────

	const openCreateColuna = () => {
		setEditingColuna(null);
		setColunaForm({ nome: "", progresso: "0", arquiva_ao_concluir: false });
		setIsColunaModalOpen(true);
	};

	const openEditColuna = (coluna: BoardColunaApi) => {
		setEditingColuna(coluna);
		setColunaForm({
			nome: coluna.nome,
			progresso: String(coluna.progresso),
			arquiva_ao_concluir: Boolean(coluna.arquiva_ao_concluir),
		});
		setIsColunaModalOpen(true);
	};

	const closeColunaModal = () => {
		setIsColunaModalOpen(false);
		setEditingColuna(null);
	};

	const submitColuna = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!selectedProjectId) {
			return;
		}

		setSavingColuna(true);
		setError(null);

		try {
			const payload = {
				nome: colunaForm.nome,
				progresso: Number(colunaForm.progresso) || 0,
				arquiva_ao_concluir: colunaForm.arquiva_ao_concluir,
			};

			const url = editingColuna
				? apiRoutes.colunas(editingColuna.id_coluna)
				: apiRoutes.projetoColunas(selectedProjectId);

			const response = await fetch(url, {
				method: editingColuna ? "PUT" : "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json", ...mutationHeaders },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error("Nao foi possivel salvar a coluna.");
			}

			closeColunaModal();
			await fetchColunas(selectedProjectId);
			setSuccessMessage(editingColuna ? "Coluna atualizada com sucesso" : "Coluna criada com sucesso");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Nao foi possivel salvar a coluna.");
		} finally {
			setSavingColuna(false);
		}
	};

	const confirmDeleteColuna = async () => {
		if (!deletingColuna || !selectedProjectId) {
			return;
		}

		setDeletingColunaId(deletingColuna.id_coluna);
		setError(null);

		try {
			const response = await fetch(apiRoutes.colunas(deletingColuna.id_coluna), {
				method: "DELETE",
				credentials: "same-origin",
				headers: mutationHeaders,
			});

			if (!response.ok) {
				const payloadError = (await response.json().catch(() => null)) as { message?: string } | null;
				throw new Error(payloadError?.message || "Nao foi possivel excluir a coluna.");
			}

			setDeletingColuna(null);
			await Promise.all([fetchColunas(selectedProjectId), fetchBoard()]);
			setSuccessMessage("Coluna excluída com sucesso");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Nao foi possivel excluir a coluna.");
		} finally {
			setDeletingColunaId(null);
		}
	};

	return (
		<DashboardLayout currentPage="tasks">
			<div className="space-y-3">
				{successMessage ? (
					<div className="pointer-events-none fixed left-1/2 top-5 z-[120] -translate-x-1/2 animate-pop-in">
						<div
							className="rounded-2xl border px-6 py-4 text-lg shadow-2xl"
							style={{
								borderColor: "#91c7a6",
								background: "linear-gradient(140deg, #f0fff5 0%, #e3f7eb 100%)",
								color: "#1e6b3b",
							}}
						>
							{successMessage}
						</div>
					</div>
				) : null}

				{selectedProjectId === null ? (
					<section className="space-y-4">
						<div
							className="rounded-3xl border p-5 shadow-sm"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
						>
							<div className="flex items-center justify-between gap-3">
								<div>
									<h1 className="text-4xl" style={{ color: "var(--cor-logo)" }}>
										Projetos
									</h1>
									<p className="mt-2 text-lg" style={{ color: "var(--cor-logo2)" }}>
										Escolha um projeto para abrir sua estrutura de sprint.
									</p>
								</div>

								<div className="flex items-center gap-2">
									{isAdmin ? (
										<>
											<button
												type="button"
												onClick={() => {
													setIsProjectHistoryOpen(true);
													void loadDeletedProjectsHistory();
												}}
												className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base transition-all duration-200 hover:shadow-md"
												style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
											>
												<History size={18} />
												Historico excluidos
											</button>
											<button
												type="button"
												onClick={() => {
													setEditingProjectId(null);
													setProjectForm(EMPTY_PROJECT_FORM);
													setIsProjectModalOpen(true);
												}}
												className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base"
												style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
											>
												<Plus size={18} />
												Novo projeto
											</button>
										</>
									) : null}
								</div>
							</div>

							<div className="mt-4">
								<label
									className="inline-flex w-full items-center gap-3 rounded-xl border px-4 py-3"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
								>
									<Search size={20} style={{ color: "var(--cor-logo2)" }} />
									<input
										value={projectQuery}
										onInput={(e) => setProjectQuery((e.target as HTMLInputElement).value)}
										placeholder="Pesquisar projeto por nome, descricao ou responsavel"
										className="w-full bg-transparent text-lg outline-none"
										style={{ color: "var(--cor-logo)" }}
									/>
								</label>
								<p className="mt-2 text-sm" style={{ color: "var(--cor-logo2)" }}>
									{filteredProjectCards.length} projeto(s) encontrado(s)
								</p>

								<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
									<CustomSelect
										value={projectSort}
										onChange={(v) => setProjectSort(v as "AZ" | "ZA" | "CARDS_DESC" | "CARDS_ASC")}
										options={[
											{ value: "AZ", label: "Ordem: A-Z" },
											{ value: "ZA", label: "Ordem: Z-A" },
											{ value: "CARDS_DESC", label: "Mais cards" },
											{ value: "CARDS_ASC", label: "Menos cards" },
										]}
									/>

									<CustomSelect
										value={projectStatusFilter}
										onChange={(v) => setProjectStatusFilter(v as "TODOS" | "PLANEJAMENTO" | "EM_ANDAMENTO" | "CONCLUIDO")}
										options={[
											{ value: "TODOS", label: "Status: Todos" },
											{ value: "PLANEJAMENTO", label: "Status: Planejamento" },
											{ value: "EM_ANDAMENTO", label: "Status: Em andamento" },
											{ value: "CONCLUIDO", label: "Status: Concluido" },
										]}
									/>

									<CustomSelect
										value={projectPriorityFilter}
										onChange={(v) => setProjectPriorityFilter(v as "TODAS" | "ALTA" | "MEDIA" | "BAIXA")}
										options={[
											{ value: "TODAS", label: "Prioridade: Todas" },
											{ value: "ALTA", label: "Prioridade: Alta" },
											{ value: "MEDIA", label: "Prioridade: Media" },
											{ value: "BAIXA", label: "Prioridade: Baixa" },
										]}
									/>
								</div>
							</div>

						</div>

						{error ? (
							<div className="rounded-xl border px-4 py-2.5 text-base" style={{ borderColor: "#d66", color: "#b02323" }}>
								{error}
							</div>
						) : null}

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
							{filteredProjectCards.map((projeto) => (
								<div
									key={projeto.id_projeto}
									className="rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
								>
									<button
										type="button"
										onClick={() => {
											setSelectedProjectId(projeto.id_projeto);
											setQuery("");
										}}
										className="w-full text-left"
									>
										<p className="text-2xl" style={{ color: "var(--cor-logo)" }}>
											{displayWithoutAccents(projeto.nome_projeto)}
										</p>
										<p className="mt-1 text-base" style={{ color: "var(--cor-logo2)" }}>
											{projeto.total} card(s) no total
										</p>

										<p className="mt-1 text-base" style={{ color: "var(--cor-logo2)" }}>
											Resp.: {projeto.responsavel?.nome ?? "Nao definido"}
										</p>

										{projeto.activeSprint ? (
											<div className="mt-2 flex items-center justify-between gap-2">
												<span className="text-sm" style={{ color: "var(--cor-logo2)" }}>
													Sprint: {displayWithoutAccents(projeto.activeSprint.nome_sprint)} ({formatDate(projeto.activeSprint.data_inicio)} a {formatDate(projeto.activeSprint.data_fim)})
												</span>
												<span
													className="rounded-full px-2 py-1 text-xs font-semibold"
													style={{
														backgroundColor: projeto.isOverdueBySprint ? "#fee2e2" : "#dcfce7",
														color: projeto.isOverdueBySprint ? "#991b1b" : "#166534",
													}}
												>
													{projeto.isOverdueBySprint ? "Atrasado" : "No prazo"}
												</span>
											</div>
										) : (
											<p className="mt-2 text-sm" style={{ color: "var(--cor-logo2)" }}>
												Sem sprint ativa
											</p>
										)}

										<div className="mt-3 grid grid-cols-2 gap-2 text-base" style={{ color: "var(--cor-logo2)" }}>
											<span>To Do: {projeto.toDo}</span>
											<span>Doing: {projeto.doing}</span>
											<span>Teste: {projeto.teste}</span>
											<span>Aprovado: {projeto.aprovado}</span>
										</div>

										<div className="mt-3">
											<div className="mb-1 flex items-center justify-between text-base" style={{ color: "var(--cor-logo2)" }}>
												<span>Progresso medio</span>
												<span>{projeto.avgProgress}%</span>
											</div>
											<div className="h-2 rounded bg-slate-200">
												<div className="h-2 rounded" style={{ width: `${projeto.avgProgress}%`, backgroundColor: "#4e7ad8" }} />
											</div>
										</div>
									</button>

									{isAdmin ? (
										<div className="mt-4 flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: "var(--cor-borda)" }}>
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													onEditProject(projeto);
												}}
												className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
												style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
											>
												<Pencil size={15} />
												Editar
											</button>
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													setProjectToDelete(projeto);
												}}
												disabled={isDeletingProject === projeto.id_projeto}
												className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
												style={{ borderColor: "#d88", color: "#b02a2a" }}
											>
												<Trash2 size={15} />
												{isDeletingProject === projeto.id_projeto ? "Excluindo..." : "Excluir"}
											</button>
										</div>
									) : null}
								</div>
							))}
						</div>

						{filteredProjectCards.length === 0 ? (
							<div className="rounded-xl border px-4 py-3 text-base" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)", backgroundColor: "var(--cor-widgets)" }}>
								Nenhum projeto encontrado para essa pesquisa.
							</div>
						) : null}
					</section>
				) : (
					<>
						<div className="rounded-3xl border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
								<div className="relative flex items-center justify-between gap-3 rounded-t-3xl px-4 py-3" style={{ backgroundColor: "var(--cor-accent)" }}>
								<button
									type="button"
									onClick={() => {
										setSelectedProjectId(null);
										setQuery("");
										setIsModalOpen(false);
										setAttemptedTaskSubmit(false);
										setIsDetailsOpen(false);
										setSelectedTask(null);
									}}
									className="absolute left-4 top-1/2 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl border bg-white/15 transition-transform duration-200 hover:-translate-y-[52%]"
									style={{ borderColor: "rgba(255,255,255,0.55)", color: "#fff" }}
									title="Voltar para projetos"
								>
									<ArrowLeft size={28} />
								</button>

								<div>
									<h1 className="pl-16 text-4xl" style={{ color: "#fff" }}>
										Projetos
									</h1>
									<p className="pl-16 text-base" style={{ color: "rgba(255,255,255,0.88)" }}>
										Sprint de {displayWithoutAccents(selectedProject?.nome_projeto) || `Projeto ${selectedProjectId}`}
									</p>
								</div>

								<div className="flex items-center gap-2">
									{isAdmin ? (
										<button
											type="button"
											onClick={() => setIsSprintModalOpen(true)}
											className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-base"
											style={{ borderColor: "rgba(255,255,255,0.45)", color: "#fff" }}
										>
											Gerenciar sprints
										</button>
									) : null}

									<button
										type="button"
										onClick={() => {
											setForm((current) => ({
												...current,
												id_projeto: String(selectedProjectId),
												id_responsavel: me?.id ? String(me.id) : "",
												id_coluna: colunasCustom[0] ? String(colunasCustom[0].id_coluna) : "",
											}));
											setIsModalOpen(true);
										}}
										className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-lg"
										style={{ borderColor: "rgba(255,255,255,0.45)", color: "#fff" }}
									>
										<Plus size={20} />
										Novo card
									</button>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2 px-5 py-4">
								<label
									className="inline-flex min-w-[280px] flex-1 items-center gap-2 rounded-xl border px-3 py-2 md:max-w-[560px]"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
								>
									<Search size={18} style={{ color: "var(--cor-logo2)" }} />
									<input
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Pesquise por nome do card"
										className="w-full bg-transparent text-base outline-none"
										style={{ color: "var(--cor-logo)" }}
									/>
								</label>

								<span
									className="w-full rounded-xl border px-3 py-2 text-sm font-medium sm:w-auto sm:min-w-[300px] md:min-w-[360px]"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo2)" }}
								>
									{isLoadingSprints
										? "Carregando sprint..."
										: activeSprint
											? `Sprint: ${displayWithoutAccents(activeSprint.nome_sprint)} (${formatDate(activeSprint.data_inicio)} a ${formatDate(activeSprint.data_fim)})`
											: "Sem sprint ativa (cards ficam no Backlog)"}
								</span>

								<details className="relative sm:ml-auto">
									<summary
										className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo2)" }}
										title="Mostrar colunas"
									>
										<MoreVertical size={16} />
									</summary>
									<div
										className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-xl border p-2 shadow-lg"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									>
										<p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>
											Mostrar colunas
										</p>
										{hiddenBoardColumns.length === 0 ? (
											<p className="px-2 py-2 text-xs" style={{ color: "var(--cor-logo2)" }}>
												Nenhuma coluna oculta.
											</p>
										) : (
											hiddenBoardColumns.map((column) => (
												<button
													key={column.key}
													type="button"
													onClick={() => toggleColumnVisibility(column.key)}
													className="w-full rounded-lg px-2 py-2 text-left text-sm transition"
													style={{ color: "var(--cor-logo)" }}
												>
													Mostrar {column.label}
												</button>
											))
										)}
									</div>
								</details>
							</div>
						</div>

						{error ? (
							<div className="rounded-xl border px-4 py-2.5 text-base" style={{ borderColor: "#d66", color: "#b02323" }}>
								{error}
							</div>
						) : null}

						{selectedProject?.kanban_padrao === false ? (
							<div className="space-y-4">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
										{colunasCustom.length} coluna{colunasCustom.length !== 1 ? "s" : ""} personalizada{colunasCustom.length !== 1 ? "s" : ""}
									</p>
									<button
										type="button"
										onClick={openCreateColuna}
										className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									>
										<Plus size={16} /> Nova coluna
									</button>
								</div>

								{isLoadingColunas ? (
									<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>Carregando colunas...</p>
								) : colunasCustom.length === 0 ? (
									<div
										className="rounded-2xl border border-dashed px-5 py-10 text-center"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
									>
										<p className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
											Nenhuma coluna criada ainda
										</p>
										<p className="mt-1 text-sm" style={{ color: "var(--cor-logo2)" }}>
											Crie a primeira coluna para comecar a organizar os cards deste projeto.
										</p>
										<button
											type="button"
											onClick={openCreateColuna}
											className="mt-4 inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:-translate-y-0.5"
											style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
										>
											<Plus size={16} /> Criar primeira coluna
										</button>
									</div>
								) : (
									<div className="flex gap-4 overflow-x-auto pb-3">
										{colunasCustom.map((coluna) => {
											const tasksDaColuna = tasksOfSelectedProject.filter(
												(tarefa) => Number(tarefa.id_coluna) === coluna.id_coluna,
											);

											return (
												<section
													key={coluna.id_coluna}
													className="w-[290px] min-w-[290px] rounded-2xl border p-3"
													style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
												>
													<div className="mb-3 flex items-start justify-between gap-2">
														<div>
															<h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
																{coluna.nome}
															</h2>
															<p className="text-xs" style={{ color: "var(--cor-logo2)" }}>
																{coluna.progresso}% de progresso
																{coluna.arquiva_ao_concluir ? " · arquiva ao concluir" : ""}
															</p>
														</div>
														<div className="flex items-center gap-1">
															<span className="rounded-full px-2.5 py-1 text-sm" style={{ backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo2)" }}>
																{tasksDaColuna.length}
															</span>
															<button
																type="button"
																onClick={() => openEditColuna(coluna)}
																title="Editar coluna"
																className="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:shadow-sm"
																style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
															>
																<Pencil size={13} />
															</button>
															<button
																type="button"
																onClick={() => setDeletingColuna(coluna)}
																title="Excluir coluna"
																className="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:shadow-sm"
																style={{ borderColor: "color-mix(in srgb, var(--cor-atrasoI) 40%, var(--cor-borda))", color: "var(--cor-atrasoI)" }}
															>
																<Trash2 size={13} />
															</button>
														</div>
													</div>

													<div className="space-y-3">
														{tasksDaColuna.map((tarefa) => (
															<article
																key={tarefa.id_tarefa}
																onClick={() => openTaskDetails(tarefa)}
																className="cursor-pointer rounded-xl border p-0"
																style={{ borderColor: "#d8dde4", backgroundColor: "var(--cor-widgets)" }}
															>
																<div className="h-2 w-full rounded-t-xl" style={{ backgroundColor: priorityColor(tarefa.prioridade_task) }} />
																<div className="p-3">
																	<div className="mb-2 flex items-start justify-between gap-2">
																		<p className="text-lg leading-tight font-semibold" style={{ color: "var(--cor-logo)" }}>
																			{tarefa.titulo}
																		</p>
																		<GripVertical size={16} style={{ color: "#94a2b3" }} />
																	</div>

																	<div className="mb-2 flex flex-wrap gap-1.5 text-sm">
																		<span className="rounded px-2 py-1 font-semibold" style={{ color: "#fff", backgroundColor: typeColor(tarefa.tipo_task) }}>
																			{typeLabel(tarefa.tipo_task)}
																		</span>
																		<span className="rounded px-2 py-1 font-semibold" style={{ color: "#fff", backgroundColor: priorityColor(tarefa.prioridade_task) }}>
																			Prioridade: {priorityLabel(tarefa.prioridade_task)}
																		</span>
																		{tarefa.bloqueada ? (
																			<span className="rounded bg-rose-100 px-2 py-1" style={{ color: "#aa2d48" }}>
																				Bloqueada
																			</span>
																		) : null}
																	</div>

																	<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
																		Resp.: {tarefa.responsavel?.nome ?? "Nao definido"}
																	</p>
																	<div className="mt-2 flex items-center gap-1">
																		{(tarefa.relacionados ?? []).slice(0, 5).map((usuario) => (
																			<AvatarPill key={`${tarefa.id_tarefa}-${usuario.id_usuario}`} usuario={usuario} size={30} />
																		))}
																		{(tarefa.relacionados ?? []).length > 5 ? (
																			<span className="rounded-full border px-2 py-1 text-sm" style={{ color: "#4b5f75", borderColor: "#c6d0db" }}>
																				+{(tarefa.relacionados ?? []).length - 5}
																			</span>
																		) : null}
																	</div>
																	<div className="mt-2">
																		<div className="mb-1 flex items-center justify-between text-sm" style={{ color: "var(--cor-logo2)" }}>
																			<span>Progresso</span>
																			<span>{coluna.progresso}%</span>
																		</div>
																		<div className="h-2 rounded bg-slate-200">
																			<div
																				className="h-2 rounded"
																				style={{ width: `${coluna.progresso}%`, backgroundColor: "#4e7ad8" }}
																			/>
																		</div>
																	</div>

																	{tarefa.descricao ? (
																		<p className="mt-2 line-clamp-3 text-sm" style={{ color: "var(--cor-logo2)" }}>
																			{tarefa.descricao}
																		</p>
																	) : null}
																</div>
															</article>
														))}

														{tasksDaColuna.length === 0 ? (
															<p className="text-base" style={{ color: "var(--cor-logo2)" }}>
																Sem cards nesta coluna.
															</p>
														) : null}
													</div>
												</section>
											);
										})}
									</div>
								)}
							</div>
						) : (
						<div className="flex gap-4 overflow-x-auto pb-3">
					{visibleBoardColumns.map((column) => (
						<section
							key={column.key}
							className="w-[290px] min-w-[290px] rounded-2xl border p-3"
							onDragOver={(event) => event.preventDefault()}
							onDrop={(event) => {
								if (column.key === "HISTORY") {
									return;
								}

								event.preventDefault();
								const rawId = event.dataTransfer.getData("text/plain");
								const taskId = Number(rawId);

								if (Number.isFinite(taskId)) {
									void moveTaskToColumn(taskId, column.key as BoardColumnKey);
								}
							}}
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
						>
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
									{column.label}
								</h2>
								<div className="flex items-center gap-1.5">
									<span className="rounded-full px-2.5 py-1 text-sm" style={{ backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo2)" }}>
										{filteredGrouped[column.key].length}
									</span>
									<details className="relative">
										<summary
											className="inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-lg border"
											style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)" }}
											title="Opcoes da coluna"
										>
											<MoreVertical size={14} />
										</summary>
										<div
											className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-xl border p-1.5 shadow-lg"
											style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
										>
											<button
												type="button"
												onClick={() => toggleColumnVisibility(column.key)}
												className="w-full rounded-lg px-2 py-2 text-left text-sm"
												style={{ color: "var(--cor-logo)" }}
											>
												Ocultar
											</button>
										</div>
									</details>
								</div>
							</div>

							<div className="space-y-3">
								{filteredGrouped[column.key].map((tarefa) => (
									<article
										key={tarefa.id_tarefa}
										draggable={!tarefa.em_historico}
										onDragStart={(event) => {
											if (tarefa.em_historico) {
												event.preventDefault();

												return;
											}

											event.dataTransfer.setData("text/plain", String(tarefa.id_tarefa));
											event.dataTransfer.effectAllowed = "move";
										}}
										onClick={() => openTaskDetails(tarefa)}
										className="cursor-grab rounded-xl border p-0 active:cursor-grabbing"
										style={{ borderColor: "#d8dde4", backgroundColor: "var(--cor-widgets)" }}
									>
										<div className="h-2 w-full rounded-t-xl" style={{ backgroundColor: priorityColor(tarefa.prioridade_task) }} />
										<div className="p-3">
											<div className="mb-2 flex items-start justify-between gap-2">
												<p className="text-lg leading-tight font-semibold" style={{ color: "var(--cor-logo)" }}>
													{tarefa.titulo}
												</p>
												<GripVertical size={16} style={{ color: "#94a2b3" }} />
											</div>

											<div className="mb-2 flex flex-wrap gap-1.5 text-sm">
												<span className="rounded px-2 py-1 font-semibold" style={{ color: "#fff", backgroundColor: typeColor(tarefa.tipo_task) }}>
													{typeLabel(tarefa.tipo_task)}
												</span>
												<span className="rounded px-2 py-1 font-semibold" style={{ color: "#fff", backgroundColor: priorityColor(tarefa.prioridade_task) }}>
													Prioridade: {priorityLabel(tarefa.prioridade_task)}
												</span>
												{tarefa.bloqueada ? (
													<span className="rounded bg-rose-100 px-2 py-1" style={{ color: "#aa2d48" }}>
														Bloqueada
													</span>
												) : null}
											</div>

											<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
												Resp.: {tarefa.responsavel?.nome ?? "Nao definido"}
											</p>
											<div className="mt-2 flex items-center gap-1">
												{(tarefa.relacionados ?? []).slice(0, 5).map((usuario) => (
													<AvatarPill key={`${tarefa.id_tarefa}-${usuario.id_usuario}`} usuario={usuario} size={30} />
												))}
												{(tarefa.relacionados ?? []).length > 5 ? (
													<span className="rounded-full border px-2 py-1 text-sm" style={{ color: "#4b5f75", borderColor: "#c6d0db" }}>
														+{(tarefa.relacionados ?? []).length - 5}
													</span>
												) : null}
											</div>
											<div className="mt-2">
												<div className="mb-1 flex items-center justify-between text-sm" style={{ color: "var(--cor-logo2)" }}>
													<span>Progresso</span>
													<span>{getProgressFromStatus(tarefa.status_task)}%</span>
												</div>
												<div className="h-2 rounded bg-slate-200">
													<div
														className="h-2 rounded"
														style={{
															width: `${getProgressFromStatus(tarefa.status_task)}%`,
															backgroundColor: "#4e7ad8",
														}}
													/>
												</div>
											</div>

											{tarefa.descricao ? (
												<p className="mt-2 line-clamp-3 text-sm" style={{ color: "var(--cor-logo2)" }}>
													{tarefa.descricao}
												</p>
											) : null}
										</div>
									</article>
								))}

								{!isLoading && filteredGrouped[column.key].length === 0 ? (
									<p className="text-base" style={{ color: "var(--cor-logo2)" }}>
										Sem cards nesta coluna.
									</p>
								) : null}
							</div>
						</section>
					))}
						{visibleBoardColumns.length === 0 ? (
							<div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo2)", backgroundColor: "var(--cor-fundo)" }}>
								Nenhuma coluna selecionada. Marque ao menos uma em "Colunas".
							</div>
						) : null}
						</div>
						)}

						{movingTaskId ? (
							<p className="text-base" style={{ color: "var(--cor-logo2)" }}>
								Movendo card #{movingTaskId}...
							</p>
						) : null}
					</>
				)}

				{isColunaModalOpen ? (
					<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] animate-fade-in">
						<form
							onSubmit={submitColuna}
							className="w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-pop-in"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
						>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>
									{editingColuna ? "Editar coluna" : "Nova coluna"}
								</h2>
								<button
									type="button"
									onClick={closeColunaModal}
									className="rounded-lg border p-1.5 transition hover:shadow-md"
									style={{ borderColor: "var(--cor-borda)" }}
								>
									<X size={14} style={{ color: "var(--cor-logo2)" }} />
								</button>
							</div>

							<div className="space-y-3">
								<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
									Nome da coluna
									<input
										required
										value={colunaForm.nome}
										onChange={(e) => setColunaForm((c) => ({ ...c, nome: e.target.value }))}
										placeholder="Ex.: Em revisao"
										className="rounded-xl border px-4 py-2.5 text-base shadow-sm outline-none transition focus:ring-2"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
									/>
								</label>

								<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
									Progresso associado (%)
									<input
										required
										type="number"
										min={0}
										max={100}
										value={colunaForm.progresso}
										onChange={(e) => setColunaForm((c) => ({ ...c, progresso: e.target.value }))}
										className="rounded-xl border px-4 py-2.5 text-base shadow-sm outline-none transition focus:ring-2"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
									/>
								</label>

								<label className="flex items-center gap-2 text-sm" style={{ color: "var(--cor-logo)" }}>
									<input
										type="checkbox"
										checked={colunaForm.arquiva_ao_concluir}
										onChange={(e) => setColunaForm((c) => ({ ...c, arquiva_ao_concluir: e.target.checked }))}
									/>
									Mover card para o historico ao entrar nesta coluna
								</label>
							</div>

							<div className="mt-5 flex justify-end gap-2">
								<button
									type="button"
									onClick={closeColunaModal}
									className="rounded-xl border px-4 py-2 text-sm"
									style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={savingColuna}
									className="rounded-xl border px-4 py-2 text-sm font-medium"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
								>
									{savingColuna ? "Salvando..." : editingColuna ? "Salvar" : "Criar coluna"}
								</button>
							</div>
						</form>
					</div>
				) : null}

				{deletingColuna ? (
					<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] animate-fade-in">
						<div
							className="w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-pop-in"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
						>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-lg font-semibold" style={{ color: "#9f2f2f" }}>Excluir coluna</h2>
								<button
									type="button"
									onClick={() => setDeletingColuna(null)}
									className="rounded-lg border p-1.5 transition hover:shadow-md"
									style={{ borderColor: "var(--cor-borda)" }}
								>
									<X size={14} style={{ color: "var(--cor-logo2)" }} />
								</button>
							</div>
							<p className="mb-5 text-sm" style={{ color: "var(--cor-logo)" }}>
								Tem certeza que deseja excluir a coluna <strong>{deletingColuna.nome}</strong>? Os cards dela ficam sem coluna definida.
							</p>
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setDeletingColuna(null)}
									className="rounded-xl border px-4 py-2 text-sm"
									style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={() => void confirmDeleteColuna()}
									disabled={deletingColunaId === deletingColuna.id_coluna}
									className="rounded-xl border px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
									style={{ borderColor: "#9f2a21", background: "linear-gradient(140deg, #c43a2f 0%, #a42c22 100%)" }}
								>
									{deletingColunaId === deletingColuna.id_coluna ? "Excluindo..." : "Confirmar exclusão"}
								</button>
							</div>
						</div>
					</div>
				) : null}

				{isSprintModalOpen && isAdmin ? (
					<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] animate-fade-in">
						<div
							className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl animate-pop-in"
							style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}
						>
							<div className="flex items-center justify-between gap-3 px-6 py-4" style={{ backgroundColor: "var(--cor-primaria)" }}>
								<h3 className="text-xl font-bold text-white">Gerenciar sprints</h3>
								<button
									type="button"
									onClick={() => setIsSprintModalOpen(false)}
									className="rounded-xl border border-white/60 bg-white/10 px-4 py-2 text-sm text-white"
								>
									Fechar
								</button>
							</div>

							<div className="grid gap-5 p-6 md:grid-cols-2">
								<div className="space-y-3">
									<h4 className="text-lg" style={{ color: "var(--cor-logo)" }}>Sprints do projeto</h4>
									<div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
										{sprints.length === 0 ? (
											<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>Nenhuma sprint cadastrada.</p>
										) : (
											sprints.map((sprint) => (
												<div
													key={sprint.id_sprint}
													className="rounded-xl border p-3"
													style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
												>
													<p className="text-base" style={{ color: "var(--cor-logo)" }}>{displayWithoutAccents(sprint.nome_sprint)}</p>
													<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
														{formatDate(sprint.data_inicio)} -{">"} {formatDate(sprint.data_fim)}
													</p>
													<p className="text-xs" style={{ color: sprint.status_sprint === "ATIVA" ? "#1f7a42" : "var(--cor-logo2)" }}>
														{sprint.status_sprint === "ATIVA" ? "Ativa" : "Encerrada"}
													</p>
												</div>
											))
										)}
									</div>

									{activeSprint ? (
										<button
											type="button"
											onClick={() => void onCloseActiveSprint()}
											disabled={isClosingSprint}
											className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
											style={{
												borderColor: "#9f2a21",
												background: "linear-gradient(140deg, #c43a2f 0%, #a42c22 100%)",
											}}
										>
											{isClosingSprint ? "Encerrando..." : "Encerrar sprint ativa"}
										</button>
									) : null}
								</div>

								<form className="space-y-3" onSubmit={onCreateSprint}>
									<h4 className="text-lg" style={{ color: "var(--cor-logo)" }}>Nova sprint</h4>
									<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
										Nome da sprint
										<input
											value={sprintForm.nome_sprint}
											onChange={(e) => setSprintForm((c) => ({ ...c, nome_sprint: e.target.value }))}
											className="rounded-xl border px-4 py-3 text-base shadow-sm outline-none transition focus:ring-2"
											style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
										/>
									</label>

									<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
										<span className="inline-flex items-center">Data de inicio<RequiredMark show={attemptedSprintSubmit && !sprintForm.data_inicio} /></span>
										<DatePicker
											value={sprintForm.data_inicio}
											onChange={(v) => setSprintForm((c) => ({ ...c, data_inicio: v }))}
										/>
									</label>

									<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
										<span className="inline-flex items-center">Data de finalizacao<RequiredMark show={attemptedSprintSubmit && !sprintForm.data_fim} /></span>
										<DatePicker
											value={sprintForm.data_fim}
											onChange={(v) => setSprintForm((c) => ({ ...c, data_fim: v }))}
										/>
									</label>

									<button
										type="submit"
										disabled={isCreatingSprint}
										onClick={() => setAttemptedSprintSubmit(true)}
										className="rounded-xl border px-4 py-2.5 text-base"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
									>
										{isCreatingSprint ? "Criando..." : "Criar sprint"}
									</button>
								</form>
							</div>
						</div>
					</div>
				) : null}

				{isProjectModalOpen && isAdmin ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px] animate-fade-in">
						<form
							onSubmit={onSaveProject}
							className="w-full max-w-2xl rounded-3xl border p-6 shadow-2xl animate-pop-in"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
						>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-2xl" style={{ color: "var(--cor-logo)" }}>
									{editingProjectId ? "Editar projeto" : "Novo projeto"}
								</h2>
								<button
									type="button"
									onClick={closeProjectModal}
									className="rounded-lg border px-3 py-1.5 text-sm"
									style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
								>
									Fechar
								</button>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									<span className="inline-flex items-center">Nome do projeto<RequiredMark show={attemptedProjectSubmit && !projectForm.nome_projeto} /></span>
									<input
										required
										value={projectForm.nome_projeto}
										onChange={(e) => setProjectForm((c) => ({ ...c, nome_projeto: e.target.value }))}
										className="rounded-xl border px-4 py-3 text-base shadow-sm outline-none transition focus:ring-2"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Prioridade
									<CustomSelect
										value={projectForm.prioridade_proj}
										onChange={(v) => setProjectForm((c) => ({ ...c, prioridade_proj: v as ProjectFormState["prioridade_proj"] }))}
										options={[
											{ value: "", label: "Selecione" },
											{ value: "BAIXA", label: "Baixa" },
											{ value: "MEDIA", label: "Media" },
											{ value: "ALTA", label: "Alta" },
										]}
									/>
								</label>

								<label className="flex flex-col gap-1 text-base md:col-span-2" style={{ color: "var(--cor-logo)" }}>
									Responsavel do projeto
									<CustomSelect
										value={projectForm.id_responsavel}
										onChange={(v) => setProjectForm((c) => ({ ...c, id_responsavel: v }))}
										options={[
											{ value: "", label: "Selecione" },
											...usuarios.map((usuario) => ({ value: String(usuario.id_usuario), label: usuario.nome })),
										]}
									/>
								</label>

								<label className="md:col-span-2 flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Descricao
									<textarea
										rows={4}
										value={projectForm.descricao}
										onChange={(e) => setProjectForm((c) => ({ ...c, descricao: e.target.value }))}
										className="rounded-xl border px-4 py-3 text-base shadow-sm outline-none transition focus:ring-2"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									/>
								</label>

								{!editingProjectId && (
									<div className="flex flex-col gap-2 text-base md:col-span-2">
										<span style={{ color: "var(--cor-logo)" }}>Criar com quadro Kanban?</span>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<button
												type="button"
												onClick={() => setProjectForm((c) => ({ ...c, kanban_padrao: true }))}
												className="rounded-xl border p-3 text-left transition hover:-translate-y-0.5"
												style={{
													borderColor: projectForm.kanban_padrao ? "var(--cor-accent)" : "var(--cor-borda)",
													backgroundColor: projectForm.kanban_padrao
														? "color-mix(in srgb, var(--cor-accent) 14%, var(--cor-widgets))"
														: "var(--cor-widgets)",
												}}
											>
												<p className="text-sm font-semibold" style={{ color: "var(--cor-logo)" }}>Sim, com colunas padrão</p>
												<p className="mt-0.5 text-xs" style={{ color: "var(--cor-logo2)" }}>
													O projeto ja comeca com Backlog, To Do, Doing, Teste e Aprovado.
												</p>
											</button>
											<button
												type="button"
												onClick={() => setProjectForm((c) => ({ ...c, kanban_padrao: false }))}
												className="rounded-xl border p-3 text-left transition hover:-translate-y-0.5"
												style={{
													borderColor: !projectForm.kanban_padrao ? "var(--cor-accent)" : "var(--cor-borda)",
													backgroundColor: !projectForm.kanban_padrao
														? "color-mix(in srgb, var(--cor-accent) 14%, var(--cor-widgets))"
														: "var(--cor-widgets)",
												}}
											>
												<p className="text-sm font-semibold" style={{ color: "var(--cor-logo)" }}>Nao, vou criar as colunas</p>
												<p className="mt-0.5 text-xs" style={{ color: "var(--cor-logo2)" }}>
													O projeto comeca sem colunas. Voce configura do seu jeito depois.
												</p>
											</button>
										</div>
									</div>
								)}
							</div>

							<div className="mt-5 flex justify-end gap-3">
								<button
									type="button"
									onClick={closeProjectModal}
									className="rounded-xl border px-4 py-2.5 text-base"
									style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSavingProject}
									onClick={() => setAttemptedProjectSubmit(true)}
									className="rounded-xl border px-4 py-2.5 text-base"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
								>
									{isSavingProject ? "Salvando..." : (editingProjectId ? "Salvar alteracoes" : "Criar projeto")}
								</button>
							</div>
						</form>
					</div>
				) : null}

				{projectToDelete && isAdmin ? (
					<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] animate-fade-in">
						<div
							className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl animate-pop-in"
							style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}
						>
							<div className="px-6 py-4" style={{ backgroundColor: "var(--cor-primaria)" }}>
								<h3 className="text-xl font-bold text-white">Confirmar exclusao</h3>
							</div>
							<div className="p-6">
								<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
									Tem certeza que deseja excluir o projeto {displayWithoutAccents(projectToDelete.nome_projeto)}? Essa acao nao pode ser desfeita.
								</p>
								<div className="mt-6 flex justify-end gap-3">
									<button
										type="button"
										onClick={() => setProjectToDelete(null)}
										disabled={isDeletingProject === projectToDelete.id_projeto}
										className="rounded-xl border px-5 py-2 text-sm"
										style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
									>
										Cancelar
									</button>
									<button
										type="button"
										onClick={() => void onDeleteProject()}
										disabled={isDeletingProject === projectToDelete.id_projeto}
										className="rounded-xl border px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
										style={{
											borderColor: "#9f2a21",
											background: "linear-gradient(140deg, #c43a2f 0%, #a42c22 100%)",
										}}
									>
										{isDeletingProject === projectToDelete.id_projeto ? "Excluindo..." : "Excluir projeto"}
									</button>
								</div>
							</div>
						</div>
					</div>
				) : null}

				{isProjectHistoryOpen && isAdmin ? (
					<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] animate-fade-in">
						<div
							className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl animate-pop-in"
							style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}
						>
							<div className="flex items-center justify-between gap-3 px-6 py-4" style={{ backgroundColor: "var(--cor-primaria)" }}>
								<h3 className="text-xl font-bold text-white">Historico de projetos excluidos (7 dias)</h3>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => void loadDeletedProjectsHistory()}
										disabled={isLoadingProjectHistory}
										className="rounded-xl border border-white/60 bg-white/10 px-4 py-2 text-sm text-white"
									>
										{isLoadingProjectHistory ? "Atualizando..." : "Atualizar"}
									</button>
									<button
										type="button"
										onClick={() => setIsProjectHistoryOpen(false)}
										className="rounded-xl border border-white/60 bg-white/10 px-4 py-2 text-sm text-white"
									>
										Fechar
									</button>
								</div>
							</div>

							<div className="max-h-[70vh] overflow-y-auto p-6">
								{isLoadingProjectHistory ? (
									<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>Carregando historico...</p>
								) : deletedProjectsHistory.length === 0 ? (
									<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>Nenhum projeto excluido nos ultimos 7 dias.</p>
								) : (
									<div className="space-y-3">
										{deletedProjectsHistory.map((registro) => (
											<div
												key={registro.id}
												className="rounded-xl border p-4"
												style={{ borderColor: "var(--cor-borda)", backgroundColor: "#f9fbfd" }}
											>
												<div className="flex flex-wrap items-start justify-between gap-3">
													<div>
														<p className="text-lg" style={{ color: "var(--cor-logo)" }}>
															{displayWithoutAccents(registro.nome_projeto)}
														</p>
														<p className="mt-1 text-sm" style={{ color: "var(--cor-logo2)" }}>
															Excluido em {formatDateTime(registro.excluido_em)}. {getRemainingDaysLabel(registro.expira_em)} ({formatDateTime(registro.expira_em)}).
														</p>
														<p className="mt-1 text-sm" style={{ color: "var(--cor-logo2)" }}>
															Impacto: {registro.tarefas_afetadas} tarefa(s), {registro.metas_afetadas} meta(s).
														</p>
													</div>

													<button
														type="button"
														onClick={() => void restoreDeletedProject(registro)}
														disabled={restoringProjectHistoryId === registro.id}
														className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
														style={{ borderColor: "#83c89d", backgroundColor: "#eaf9ef", color: "#1f7a42" }}
													>
														<RotateCcw size={14} />
														{restoringProjectHistoryId === registro.id ? "Restaurando..." : "Restaurar projeto"}
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</div>
				) : null}

				{isModalOpen ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px] animate-fade-in">
						<form
							onSubmit={onSubmit}
							className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border p-6 shadow-2xl animate-pop-in"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
						>
							<div
								className="mb-5 flex items-center justify-between rounded-2xl border px-4 py-3"
								style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
							>
								<h2 className="text-2xl" style={{ color: "var(--cor-logo)" }}>
									Novo card de tarefa
								</h2>

								<button
									type="button"
									onClick={() => { setIsModalOpen(false); setAttemptedTaskSubmit(false); }}
									className="rounded-xl border px-4 py-2 text-sm transition-transform duration-200 hover:-translate-y-0.5"
									style={{ color: "var(--cor-logo)", borderColor: "var(--cor-borda)" }}
								>
									Fechar
								</button>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									<span className="inline-flex items-center">Titulo da tarefa<RequiredMark show={attemptedTaskSubmit && !form.titulo} /></span>
									<input
										required
										value={form.titulo}
										onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))}
										className="rounded-xl border px-4 py-3 text-base shadow-sm outline-none transition focus:ring-2"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Responsavel principal
									<CustomSelect
										value={form.id_responsavel}
										onChange={(v) => setForm((c) => ({ ...c, id_responsavel: v }))}
										options={[
											{ value: "", label: "Selecione" },
											...usuarios.map((usuario) => ({ value: String(usuario.id_usuario), label: usuario.nome })),
										]}
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Projeto
									<CustomSelect
										value={form.id_projeto}
										onChange={(v) => setForm((c) => ({ ...c, id_projeto: v }))}
										options={[
											{ value: "", label: "Selecione" },
											...projetos.map((projeto) => ({ value: String(projeto.id_projeto), label: displayWithoutAccents(projeto.nome_projeto) })),
										]}
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Prioridade
									<CustomSelect
										value={form.prioridade_task}
										onChange={(v) => setForm((c) => ({ ...c, prioridade_task: v as FormState["prioridade_task"] }))}
										options={[
											{ value: "BAIXA", label: "Baixa" },
											{ value: "MEDIA", label: "Media" },
											{ value: "ALTA", label: "Alta" },
											{ value: "CRITICA", label: "Critica" },
										]}
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Tipo tecnico
									<CustomSelect
										value={form.tipo_task}
										onChange={(v) => setForm((c) => ({ ...c, tipo_task: v as FormState["tipo_task"] }))}
										options={[
											{ value: "FRONT", label: "Front" },
											{ value: "BACK", label: "Back" },
											{ value: "FULLSTACK", label: "Full Stack" },
										]}
									/>
								</label>

								{selectedProject?.kanban_padrao === false ? (
									<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
										Coluna
										<CustomSelect
											value={form.id_coluna}
											onChange={(v) => setForm((c) => ({ ...c, id_coluna: v }))}
											options={colunasCustom.map((c) => ({ value: String(c.id_coluna), label: c.nome }))}
											placeholder={colunasCustom.length === 0 ? "Crie uma coluna primeiro" : "Selecione"}
										/>
									</label>
								) : (
									<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
										Status
										<CustomSelect
											value={form.status_task}
											onChange={(v) => setForm((c) => ({ ...c, status_task: v as BoardStatus }))}
											options={STATUS_COLUMNS.map((status) => ({ value: status.key, label: status.label }))}
										/>
									</label>
								)}

							</div>

							<label className="mt-4 flex items-center gap-2 text-base" style={{ color: "var(--cor-logo)" }}>
								<input
									type="checkbox"
									checked={form.bloqueada}
									onChange={(e) => setForm((c) => ({ ...c, bloqueada: e.target.checked }))}
								/>
								Tarefa bloqueada
							</label>

							<label className="mt-4 flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
								Detalhes da tarefa
								<textarea
									rows={5}
									value={form.descricao}
									onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))}
									className="rounded-xl border px-4 py-3 text-base shadow-sm outline-none transition focus:ring-2"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
								/>
							</label>

							<div className="mt-4 rounded-2xl border p-3" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}>
								<div className="mb-1 flex items-center justify-between">
									<p className="text-base" style={{ color: "var(--cor-logo)" }}>
										Pessoas relacionadas
									</p>
									{me?.id ? (
										<button
											type="button"
											onClick={addMeToRelacionados}
											className="rounded-lg border px-3 py-1.5 text-sm"
											style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
										>
											Me adicionar
										</button>
									) : null}
								</div>
								<RelatedPeoplePicker usuarios={usuarios} selectedIds={form.relacionados} onToggle={onToggleRelacionado} />
							</div>

							<div className="mt-6 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => { setIsModalOpen(false); setAttemptedTaskSubmit(false); }}
									className="rounded-xl border px-5 py-2.5 text-base transition-transform duration-200 hover:-translate-y-0.5"
									style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSaving}
									onClick={() => setAttemptedTaskSubmit(true)}
									className="rounded-xl border px-5 py-2.5 text-base transition-transform duration-200 hover:-translate-y-0.5"
									style={{ backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)", borderColor: "var(--cor-borda)" }}
								>
									{isSaving ? "Salvando..." : "Salvar card"}
								</button>
							</div>
						</form>
					</div>
				) : null}

				{isDetailsOpen && selectedTask ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px] animate-fade-in">
						<form
							onSubmit={onSaveDetails}
							className="w-full max-w-xl overflow-hidden rounded-xl shadow-2xl animate-pop-in"
							style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}
						>
							{/* Cabeçalho azul */}
							<div
								className="flex items-center justify-between px-5 py-3"
								style={{ backgroundColor: "var(--cor-primaria)" }}
							>
								<h2 className="text-base font-bold text-white">
									Card #{selectedTask.id_tarefa}
								</h2>
								<div className="flex gap-2">
									{!isEditingDetails ? (
										<>
											<button
												type="button"
												onClick={() => setIsEditingDetails(true)}
												className="rounded-lg border border-white/60 bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20"
											>
												Editar
											</button>
											<button
												type="button"
												onClick={() => setIsDeleteConfirmOpen(true)}
												disabled={isDeleting}
												className="rounded-lg border border-white/60 bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20"
											>
												Excluir
											</button>
										</>
									) : null}
									<button
										type="button"
										onClick={() => {
											setIsDeleteConfirmOpen(false);
											setIsDetailsOpen(false);
											setIsEditingDetails(false);
											setSelectedTask(null);
										}}
										className="rounded-lg border border-white/60 bg-white/10 px-3 py-1 text-sm text-white transition hover:bg-white/20"
									>
										Fechar
									</button>
								</div>
							</div>

							{/* Corpo do modal */}
							<div className="p-5">
								<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
									<label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
										Título
										<input
											disabled={!isEditingDetails}
											value={detailsForm.titulo}
											onChange={(e) => setDetailsForm((c) => ({ ...c, titulo: e.target.value }))}
											className="rounded-lg border px-3 py-2.5 text-base outline-none transition focus:ring-2"
											style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
										/>
									</label>

									<label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
										Responsável
										<CustomSelect
											disabled={!isEditingDetails}
											value={detailsForm.id_responsavel}
											onChange={(v) => setDetailsForm((c) => ({ ...c, id_responsavel: v }))}
											options={[
												{ value: "", label: "Selecione" },
												...usuarios.map((u) => ({ value: String(u.id_usuario), label: u.nome })),
											]}
										/>
									</label>

									<label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
										Prioridade
										<CustomSelect
											disabled={!isEditingDetails}
											value={detailsForm.prioridade_task}
											onChange={(v) => setDetailsForm((c) => ({ ...c, prioridade_task: v as FormState["prioridade_task"] }))}
											options={[
												{ value: "BAIXA", label: "Baixa" },
												{ value: "MEDIA", label: "Media" },
												{ value: "ALTA", label: "Alta" },
												{ value: "CRITICA", label: "Critica" },
											]}
										/>
									</label>

									{selectedProject?.kanban_padrao === false ? (
										<label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
											Coluna
											<CustomSelect
												disabled={!isEditingDetails}
												value={detailsForm.id_coluna}
												onChange={(v) => setDetailsForm((c) => ({ ...c, id_coluna: v }))}
												options={colunasCustom.map((c) => ({ value: String(c.id_coluna), label: c.nome }))}
											/>
										</label>
									) : (
										<label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
											Status
											<CustomSelect
												disabled={!isEditingDetails}
												value={detailsForm.status_task}
												onChange={(v) => setDetailsForm((c) => ({ ...c, status_task: v as BoardStatus }))}
												options={STATUS_COLUMNS.map((s) => ({ value: s.key, label: s.label }))}
											/>
										</label>
									)}
								</div>

								{/* Badges de prioridade e tipo */}
								<div className="mt-3 flex flex-wrap gap-1.5">
									<span
										className="rounded-full px-3 py-1 text-xs font-semibold text-white"
										style={{ backgroundColor: priorityColor(detailsForm.prioridade_task) }}
									>
										Prioridade: {priorityLabel(detailsForm.prioridade_task)}
									</span>
									<span
										className="rounded-full px-3 py-1 text-xs font-semibold text-white"
										style={{ backgroundColor: typeColor(detailsForm.tipo_task) }}
									>
										{typeLabel(detailsForm.tipo_task)}
									</span>
									{detailsForm.bloqueada ? (
										<span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">Bloqueada</span>
									) : null}
								</div>

								<label className="mt-4 flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
									Detalhes
									<textarea
										disabled={!isEditingDetails}
										rows={3}
										value={detailsForm.descricao}
										onChange={(e) => setDetailsForm((c) => ({ ...c, descricao: e.target.value }))}
										className="rounded-lg border px-3 py-2.5 text-base outline-none transition focus:ring-2 resize-none"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									/>
								</label>

								{/* Pessoas relacionadas */}
								<div
									className="mt-4 rounded-lg p-3"
									style={{ backgroundColor: "var(--cor-fundo)", border: "1px solid var(--cor-borda)" }}
								>
									<div className="mb-2 flex items-center justify-between">
										<p className="text-sm font-semibold" style={{ color: "var(--cor-logo)" }}>Pessoas relacionadas</p>
										{isEditingDetails && me?.id ? (
											<button
												type="button"
												onClick={addMeToRelacionadosDetails}
												className="rounded-lg border px-3 py-1 text-xs"
												style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
											>
												Me adicionar
											</button>
										) : null}
									</div>

									{selectedRelatedUsers.length > 0 ? (
										<div className="flex flex-col gap-2">
											{selectedRelatedUsers.map((usuario) => {
												const fullUser = usuarios.find((u) => u.id_usuario === getUsuarioId(usuario));
												const nomeCargo = fullUser?.cargo_relation?.nome_cargo ?? null;

												return (
													<div
														key={`related-avatar-${getUsuarioId(usuario) ?? usuario.nome}`}
														className="flex items-center gap-2"
													>
														<AvatarPill usuario={usuario} size={32} />
														<div className="flex flex-col">
															<span className="text-sm font-medium" style={{ color: "var(--cor-logo)" }}>{usuario.nome}</span>
															{nomeCargo ? (
																<span className="text-xs" style={{ color: "var(--cor-logo2)" }}>{nomeCargo}</span>
															) : null}
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<span className="text-sm" style={{ color: "var(--cor-logo2)" }}>
											Sem pessoas relacionadas neste card.
										</span>
									)}

									{isEditingDetails ? (
										<div className="mt-3">
											<RelatedPeoplePicker usuarios={usuarios} selectedIds={detailsForm.relacionados} onToggle={onToggleRelacionadoDetails} />
										</div>
									) : null}
								</div>

								{isEditingDetails ? (
									<div className="mt-4 flex justify-end gap-2">
										<button
											type="button"
											onClick={() => setIsEditingDetails(false)}
											className="rounded-lg border px-4 py-1.5 text-sm"
											style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
										>
											Cancelar edição
										</button>
										<button
											type="submit"
											disabled={isUpdating}
											className="rounded-lg px-4 py-1.5 text-sm text-white transition hover:opacity-90"
											style={{ backgroundColor: "var(--cor-primaria)" }}
										>
											{isUpdating ? "Salvando..." : "Salvar alterações"}
										</button>
									</div>
								) : null}
							</div>
						</form>

						{isDeleteConfirmOpen ? (
							<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[3px] animate-fade-in">
								<div
									className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl animate-pop-in"
									style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}
								>
									<div className="px-6 py-4" style={{ backgroundColor: "var(--cor-primaria)" }}>
										<h3 className="text-xl font-bold text-white">Confirmar exclusão</h3>
									</div>
									<div className="p-6">
										<p className="text-sm" style={{ color: "var(--cor-logo2)" }}>
											Tem certeza que deseja excluir este card? Essa ação não pode ser desfeita.
										</p>
										<div className="mt-6 flex justify-end gap-3">
											<button
												type="button"
												onClick={() => setIsDeleteConfirmOpen(false)}
												disabled={isDeleting}
												className="rounded-xl border px-5 py-2 text-sm"
												style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
											>
												Cancelar
											</button>
											<button
												type="button"
												onClick={onDeleteSelectedTask}
												disabled={isDeleting}
												className="rounded-xl border px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
												style={{
													borderColor: "#9f2a21",
													background: "linear-gradient(140deg, #c43a2f 0%, #a42c22 100%)",
												}}
											>
												{isDeleting ? "Excluindo..." : "Excluir card"}
											</button>
										</div>
									</div>
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</div>
		</DashboardLayout>
	);
}
