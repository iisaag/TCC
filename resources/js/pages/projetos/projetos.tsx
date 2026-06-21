import { usePage } from "@inertiajs/react";
import { ArrowLeft, ChevronDown, GripVertical, History, MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import type { FormEvent} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
	relacionados: number[];
}

interface ProjectFormState {
	nome_projeto: string;
	descricao: string;
	prioridade_proj: "" | "BAIXA" | "MEDIA" | "ALTA";
	status_projeto: string;
	id_responsavel: string;
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
	relacionados: [],
};

const EMPTY_PROJECT_FORM: ProjectFormState = {
	nome_projeto: "",
	descricao: "",
	prioridade_proj: "",
	status_projeto: "",
	id_responsavel: "",
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
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
return;
}

		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
setOpen(false);
}
		};
		document.addEventListener("mousedown", handler);

		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const selected = options.find((o) => o.value === value);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				disabled={disabled}
				onClick={() => !disabled && setOpen((v) => !v)}
				className="w-full rounded-xl border px-4 py-2.5 text-base text-left flex items-center justify-between outline-none transition"
				style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
			>
				<span>{selected?.label ?? placeholder}</span>
				<ChevronDown
					size={20}
					style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--cor-logo2)", flexShrink: 0 }}
				/>
			</button>
			{open ? (
				<div
					className="absolute z-[200] w-full mt-1 rounded-xl border shadow-xl overflow-hidden animate-dropdown"
					style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}
				>
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => {
 onChange(option.value); setOpen(false); 
}}
							className="w-full px-4 py-2.5 text-base text-left transition-colors"
							style={{
								color: "var(--cor-logo)",
								backgroundColor: value === option.value ? "var(--cor-botao)" : "transparent",
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
				</div>
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

export default function Projetos() {
	const page = usePage<PageProps>();
	const me = page.props.auth?.user;
	const isAdmin = Boolean(me?.permissions?.total);
	const [tarefas, setTarefas] = useState<TarefaApi[]>([]);
	const [usuarios, setUsuarios] = useState<Usuario[]>([]);
	const [projetos, setProjetos] = useState<Projeto[]>([]);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
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
		setIsSaving(true);
		setError(null);

		try {
			const payload = {
				titulo: form.titulo,
				descricao: form.descricao || null,
				id_projeto: form.id_projeto ? Number(form.id_projeto) : null,
				id_responsavel: form.id_responsavel ? Number(form.id_responsavel) : null,
				prioridade_task: form.prioridade_task,
				tipo_task: form.tipo_task,
				progresso: STATUS_PROGRESS[form.status_task],
				bloqueada: form.bloqueada,
				status_task: denormalizeStatus(form.status_task),
				relacionados: form.relacionados,
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

			const payload = {
				nome_projeto: projectForm.nome_projeto,
				descricao: projectForm.descricao || null,
				prioridade_proj: normalizedPriority || null,
				status_projeto: projectForm.status_projeto || null,
				id_responsavel: projectForm.id_responsavel ? Number(projectForm.id_responsavel) : null,
			};

			const isEditingProject = editingProjectId !== null;
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

			const payload = {
				titulo: detailsForm.titulo,
				descricao: detailsForm.descricao || null,
				id_projeto: detailsForm.id_projeto ? Number(detailsForm.id_projeto) : null,
				id_responsavel: detailsForm.id_responsavel ? Number(detailsForm.id_responsavel) : null,
				prioridade_task: detailsForm.prioridade_task,
				tipo_task: detailsForm.tipo_task,
				progresso: STATUS_PROGRESS[detailsForm.status_task],
				bloqueada: detailsForm.bloqueada,
				status_task: denormalizeStatus(detailsForm.status_task),
				relacionados: normalizedRelatedIds,
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
			patchPayload.em_historico = false;
		} else {
			patchPayload.id_sprint = activeSprint?.id_sprint ?? null;
			patchPayload.em_historico = false;
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
									<select
										value={projectSort}
										onChange={(e) => setProjectSort(e.target.value as "AZ" | "ZA" | "CARDS_DESC" | "CARDS_ASC")}
										className="rounded-xl border px-3 py-2 text-sm outline-none"
										style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)", backgroundColor: "var(--cor-fundo)" }}
									>
										<option value="AZ">Ordem: A-Z</option>
										<option value="ZA">Ordem: Z-A</option>
										<option value="CARDS_DESC">Mais cards</option>
										<option value="CARDS_ASC">Menos cards</option>
									</select>

									<select
										value={projectStatusFilter}
										onChange={(e) => setProjectStatusFilter(e.target.value as "TODOS" | "PLANEJAMENTO" | "EM_ANDAMENTO" | "CONCLUIDO")}
										className="rounded-xl border px-3 py-2 text-sm outline-none"
										style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)", backgroundColor: "var(--cor-fundo)" }}
									>
										<option value="TODOS">Status: Todos</option>
										<option value="PLANEJAMENTO">Status: Planejamento</option>
										<option value="EM_ANDAMENTO">Status: Em andamento</option>
										<option value="CONCLUIDO">Status: Concluido</option>
									</select>

									<select
										value={projectPriorityFilter}
										onChange={(e) => setProjectPriorityFilter(e.target.value as "TODAS" | "ALTA" | "MEDIA" | "BAIXA")}
										className="rounded-xl border px-3 py-2 text-sm outline-none"
										style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)", backgroundColor: "var(--cor-fundo)" }}
									>
										<option value="TODAS">Prioridade: Todas</option>
										<option value="ALTA">Prioridade: Alta</option>
										<option value="MEDIA">Prioridade: Media</option>
										<option value="BAIXA">Prioridade: Baixa</option>
									</select>
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

						{movingTaskId ? (
							<p className="text-base" style={{ color: "var(--cor-logo2)" }}>
								Movendo card #{movingTaskId}...
							</p>
						) : null}
					</>
				)}

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
											className="rounded-xl border px-4 py-2 text-sm"
											style={{ borderColor: "#d88", color: "#b02a2a", backgroundColor: "#fff5f5" }}
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
											className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
										/>
									</label>

									<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
										Data de inicio *
										<input
											required
											type="date"
											value={sprintForm.data_inicio}
											onChange={(e) => setSprintForm((c) => ({ ...c, data_inicio: e.target.value }))}
											className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
										/>
									</label>

									<label className="flex flex-col gap-1 text-sm" style={{ color: "var(--cor-logo)" }}>
										Data de finalizacao *
										<input
											required
											type="date"
											value={sprintForm.data_fim}
											onChange={(e) => setSprintForm((c) => ({ ...c, data_fim: e.target.value }))}
											className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
										/>
									</label>

									<button
										type="submit"
										disabled={isCreatingSprint}
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
								<button type="button" onClick={closeProjectModal} className="rounded-lg border px-3 py-1.5 text-sm">
									Fechar
								</button>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Nome do projeto *
									<input
										required
										value={projectForm.nome_projeto}
										onChange={(e) => setProjectForm((c) => ({ ...c, nome_projeto: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Prioridade
									<select
										value={projectForm.prioridade_proj}
										onChange={(e) => setProjectForm((c) => ({ ...c, prioridade_proj: e.target.value as ProjectFormState["prioridade_proj"] }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										<option value="">Selecione</option>
										<option value="BAIXA">Baixa</option>
										<option value="MEDIA">Media</option>
										<option value="ALTA">Alta</option>
									</select>
								</label>

								<label className="flex flex-col gap-1 text-base md:col-span-2" style={{ color: "var(--cor-logo)" }}>
									Responsavel do projeto
									<select
										value={projectForm.id_responsavel}
										onChange={(e) => setProjectForm((c) => ({ ...c, id_responsavel: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										<option value="">Selecione</option>
										{usuarios.map((usuario) => (
											<option key={usuario.id_usuario} value={usuario.id_usuario}>
												{usuario.nome}
											</option>
										))}
									</select>
								</label>

								<label className="md:col-span-2 flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Descricao
									<textarea
										rows={4}
										value={projectForm.descricao}
										onChange={(e) => setProjectForm((c) => ({ ...c, descricao: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									/>
								</label>
							</div>

							<div className="mt-5 flex justify-end gap-3">
								<button type="button" onClick={closeProjectModal} className="rounded-xl border px-4 py-2.5 text-base">
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSavingProject}
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
										className="rounded-xl px-5 py-2 text-sm text-white transition hover:opacity-90"
										style={{ backgroundColor: "#c0392b" }}
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
								style={{ borderColor: "#d6e0ea", background: "linear-gradient(135deg, #eef5fb 0%, #f8fbff 100%)" }}
							>
								<h2 className="text-2xl" style={{ color: "var(--cor-logo)" }}>
									Novo card de tarefa
								</h2>

								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="rounded-xl border px-4 py-2 text-sm transition-transform duration-200 hover:-translate-y-0.5"
									style={{ color: "var(--cor-logo)", borderColor: "#d0dbe7" }}
								>
									Fechar
								</button>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Titulo da tarefa *
									<input
										required
										value={form.titulo}
										onChange={(e) => setForm((c) => ({ ...c, titulo: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Responsavel principal
									<select
										value={form.id_responsavel}
										onChange={(e) => setForm((c) => ({ ...c, id_responsavel: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										<option value="">Selecione</option>
										{usuarios.map((usuario) => (
											<option key={usuario.id_usuario} value={usuario.id_usuario}>
												{usuario.nome}
											</option>
										))}
									</select>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Projeto
									<select
										value={form.id_projeto}
										onChange={(e) => setForm((c) => ({ ...c, id_projeto: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										<option value="">Selecione</option>
										{projetos.map((projeto) => (
											<option key={projeto.id_projeto} value={projeto.id_projeto}>
												{displayWithoutAccents(projeto.nome_projeto)}
											</option>
										))}
									</select>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Prioridade
									<select
										value={form.prioridade_task}
										onChange={(e) => setForm((c) => ({ ...c, prioridade_task: e.target.value as FormState["prioridade_task"] }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										<option value="BAIXA">Baixa</option>
										<option value="MEDIA">Media</option>
										<option value="ALTA">Alta</option>
										<option value="CRITICA">Critica</option>
									</select>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Tipo tecnico
									<select
										value={form.tipo_task}
										onChange={(e) => setForm((c) => ({ ...c, tipo_task: e.target.value as FormState["tipo_task"] }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										<option value="FRONT">Front</option>
										<option value="BACK">Back</option>
										<option value="FULLSTACK">Full Stack</option>
									</select>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Status
									<select
										value={form.status_task}
										onChange={(e) => setForm((c) => ({ ...c, status_task: e.target.value as BoardStatus }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									>
										{STATUS_COLUMNS.map((status) => (
											<option key={status.key} value={status.key}>
												{status.label}
											</option>
										))}
									</select>
								</label>

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
									className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
								/>
							</label>

							<div className="mt-4 rounded-2xl border p-3" style={{ borderColor: "#dce4ec", backgroundColor: "#f7fafc" }}>
								<div className="mb-1 flex items-center justify-between">
									<p className="text-base" style={{ color: "var(--cor-logo)" }}>
										Pessoas relacionadas
									</p>
									{me?.id ? (
										<button
											type="button"
											onClick={addMeToRelacionados}
											className="rounded-lg border bg-white px-3 py-1.5 text-sm"
										>
											Me adicionar
										</button>
									) : null}
								</div>
								<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
									{usuarios.map((usuario) => (
										<label key={usuario.id_usuario} className="flex items-center gap-2 text-base" style={{ color: "var(--cor-logo)" }}>
											<input
												type="checkbox"
												checked={form.relacionados.includes(usuario.id_usuario)}
												onChange={() => onToggleRelacionado(usuario.id_usuario)}
											/>
											<AvatarPill usuario={usuario} size={22} />
											{usuario.nome}
										</label>
									))}
								</div>
							</div>

							<div className="mt-6 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setIsModalOpen(false)}
									className="rounded-xl border px-5 py-2.5 text-base transition-transform duration-200 hover:-translate-y-0.5"
								>
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSaving}
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

									<label className="flex flex-col gap-1 text-sm font-medium" style={{ color: "var(--cor-logo)" }}>
										Status
										<CustomSelect
											disabled={!isEditingDetails}
											value={detailsForm.status_task}
											onChange={(v) => setDetailsForm((c) => ({ ...c, status_task: v as BoardStatus }))}
											options={STATUS_COLUMNS.map((s) => ({ value: s.key, label: s.label }))}
										/>
									</label>
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
										<div className="mt-3 grid grid-cols-1 gap-1.5 md:grid-cols-2">
											{usuarios.map((usuario) => (
												<label key={usuario.id_usuario} className="flex items-center gap-2 text-sm" style={{ color: "var(--cor-logo)" }}>
													<input
														type="checkbox"
														checked={detailsForm.relacionados.includes(usuario.id_usuario)}
														onChange={() => onToggleRelacionadoDetails(usuario.id_usuario)}
													/>
													<AvatarPill usuario={usuario} size={22} />
													{usuario.nome}
												</label>
											))}
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
												className="rounded-xl px-5 py-2 text-sm text-white transition hover:opacity-90"
												style={{ backgroundColor: "#c0392b" }}
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
