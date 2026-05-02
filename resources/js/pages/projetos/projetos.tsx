import DashboardLayout from "@/layouts/DashboardLayout";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import { ArrowLeft, CalendarDays, ChevronDown, GripVertical, Plus, Search } from "lucide-react";
import { apiRoutes } from "@/lib/routes";

type BoardStatus = "TO_DO" | "DOING" | "TESTE" | "APROVADO";

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
	id_responsavel?: number | null;
	responsavel?: Usuario | null;
}

interface TarefaApi {
	id_tarefa: number;
	titulo: string;
	descricao?: string | null;
	id_projeto?: number | null;
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
	data_inicio: string;
	data_prevista_termino: string;
	progresso: string;
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

const STATUS_PROGRESS: Record<BoardStatus, number> = {
	TO_DO: 0,
	DOING: 50,
	TESTE: 80,
	APROVADO: 100,
};

const EMPTY_FORM: FormState = {
	titulo: "",
	descricao: "",
	id_projeto: "",
	id_responsavel: "",
	prioridade_task: "MEDIA",
	tipo_task: "FRONT",
	data_inicio: "",
	data_prevista_termino: "",
	progresso: "0",
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
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
				className="w-full rounded-xl border px-4 py-3 text-xl text-left flex items-center justify-between outline-none transition"
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
							onClick={() => { onChange(option.value); setOpen(false); }}
							className="w-full px-4 py-3 text-xl text-left transition-colors"
							style={{
								color: "var(--cor-logo)",
								backgroundColor: value === option.value ? "var(--cor-botao)" : "transparent",
							}}
							onMouseEnter={(e) => { if (value !== option.value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--cor-fundo)"; }}
							onMouseLeave={(e) => { if (value !== option.value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
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
	const [tarefas, setTarefas] = useState<TarefaApi[]>([]);
	const [usuarios, setUsuarios] = useState<Usuario[]>([]);
	const [projetos, setProjetos] = useState<Projeto[]>([]);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isSavingProject, setIsSavingProject] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [selectedTask, setSelectedTask] = useState<TarefaApi | null>(null);
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isEditingDetails, setIsEditingDetails] = useState(false);
	const [detailsForm, setDetailsForm] = useState<FormState>(EMPTY_FORM);
	const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const csrfToken = useMemo(
		() => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "",
		[],
	);

	const fetchBoard = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const [tarefasResponse, usuariosResponse, projetosResponse] = await Promise.all([
				fetch(apiRoutes.tarefas, { headers: { Accept: "application/json" } }),
				fetch(apiRoutes.usuarios, { headers: { Accept: "application/json" } }),
				fetch(apiRoutes.projetos, { headers: { Accept: "application/json" } }),
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

	const selectedProject = useMemo(
		() => projetos.find((projeto) => projeto.id_projeto === selectedProjectId) ?? null,
		[projetos, selectedProjectId],
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
				? Math.round(projectTasks.reduce((acc, tarefa) => acc + Number(tarefa.progresso ?? STATUS_PROGRESS[normalizeStatus(tarefa.status_task)]), 0) / projectTasks.length)
				: 0;

			return {
				...projeto,
				total: projectTasks.length,
				toDo,
				doing,
				teste,
				aprovado,
				avgProgress,
			};
		});
	}, [projetos, tarefas]);

	const grouped = useMemo(() => {
		const base: Record<BoardStatus, TarefaApi[]> = {
			TO_DO: [],
			DOING: [],
			TESTE: [],
			APROVADO: [],
		};

		tasksOfSelectedProject.forEach((tarefa) => {
			base[normalizeStatus(tarefa.status_task)].push(tarefa);
		});

		return base;
	}, [tasksOfSelectedProject]);

	const filteredGrouped = useMemo(() => {
		if (!query.trim()) {
			return grouped;
		}

		const term = normalizeSearchText(query);
		const base: Record<BoardStatus, TarefaApi[]> = {
			TO_DO: [],
			DOING: [],
			TESTE: [],
			APROVADO: [],
		};

		( Object.keys(grouped) as BoardStatus[] ).forEach((status) => {
			base[status] = grouped[status].filter((item) => {
				const title = normalizeSearchText(item.titulo);
				return title.includes(term);
			});
		});

		return base;
	}, [grouped, query]);

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
				data_inicio: form.data_inicio || null,
				data_prevista_termino: form.data_prevista_termino || null,
				progresso: Number(form.progresso || 0),
				bloqueada: form.bloqueada,
				status_task: denormalizeStatus(form.status_task),
				relacionados: form.relacionados,
			};

			const response = await fetch(apiRoutes.tarefas, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrfToken,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error("Erro ao salvar tarefa");
			}

			setForm(EMPTY_FORM);
			setIsModalOpen(false);
			await fetchBoard();
		} catch {
			setError("Nao foi possivel salvar o card. Verifique os campos obrigatorios.");
		} finally {
			setIsSaving(false);
		}
	};

	const onCreateProject = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSavingProject(true);
		setError(null);

		try {
			const payload = {
				nome_projeto: projectForm.nome_projeto,
				descricao: projectForm.descricao || null,
				prioridade_proj: projectForm.prioridade_proj || null,
				status_projeto: projectForm.status_projeto || null,
				id_responsavel: projectForm.id_responsavel ? Number(projectForm.id_responsavel) : null,
			};

			const response = await fetch(apiRoutes.projetos, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrfToken,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error("Erro ao criar projeto");
			}

			setProjectForm(EMPTY_PROJECT_FORM);
			setIsProjectModalOpen(false);
			await fetchBoard();
			setSuccessMessage("Projeto criado com sucesso");
		} catch {
			setError("Nao foi possivel criar o projeto.");
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
			data_inicio: task.data_inicio ? String(task.data_inicio).slice(0, 10) : "",
			data_prevista_termino: (task.data_prevista_termino ?? task.prazo) ? String(task.data_prevista_termino ?? task.prazo).slice(0, 10) : "",
			progresso: String(task.progresso ?? STATUS_PROGRESS[normalizeStatus(task.status_task)]),
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
				data_inicio: detailsForm.data_inicio || null,
				data_prevista_termino: detailsForm.data_prevista_termino || null,
				progresso: Number(detailsForm.progresso || 0),
				bloqueada: detailsForm.bloqueada,
				status_task: denormalizeStatus(detailsForm.status_task),
				relacionados: normalizedRelatedIds,
			};

			const response = await fetch(`${apiRoutes.tarefas}/${selectedTask.id_tarefa}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrfToken,
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
				headers: {
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrfToken,
				},
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

	const moveTaskToColumn = async (taskId: number, nextStatus: BoardStatus) => {
		const tarefaAtual = tarefas.find((item) => item.id_tarefa === taskId);

		if (!tarefaAtual) {
			return;
		}

		const oldStatus = normalizeStatus(tarefaAtual.status_task);
		if (oldStatus === nextStatus) {
			return;
		}

		setMovingTaskId(taskId);
		setError(null);

		const previous = [...tarefas];
		setTarefas((current) => current.map((item) => (
			item.id_tarefa === taskId
				? {
					...item,
					status_task: denormalizeStatus(nextStatus),
					progresso: STATUS_PROGRESS[nextStatus],
				}
				: item
		)));

		try {
			const response = await fetch(`${apiRoutes.tarefas}/${taskId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest",
					"X-CSRF-TOKEN": csrfToken,
				},
				body: JSON.stringify({
					status_task: denormalizeStatus(nextStatus),
					progresso: STATUS_PROGRESS[nextStatus],
				}),
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
									<button
										type="button"
										onClick={() => setIsProjectModalOpen(true)}
										className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-base"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
									>
										<Plus size={18} />
										Novo projeto
									</button>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
							{projectCards.map((projeto) => (
								<button
									key={projeto.id_projeto}
									type="button"
									onClick={() => {
										setSelectedProjectId(projeto.id_projeto);
										setQuery("");
									}}
									className="rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
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
							))}
						</div>
					</section>
				) : (
					<>
						<div className="rounded-3xl border" style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}>
							<div className="relative flex items-center justify-between gap-3 rounded-t-3xl px-5 py-4" style={{ backgroundColor: "var(--cor-accent)" }}>
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

							<div className="flex flex-wrap items-center gap-3 px-5 py-4">
								<label className="inline-flex min-w-[280px] flex-1 items-center gap-3 rounded-xl border bg-white px-4 py-3">
									<Search size={20} style={{ color: "var(--cor-logo2)" }} />
									<input
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Pesquise por nome do card"
										className="w-full bg-transparent text-lg outline-none"
									/>
								</label>

								<span className="rounded-xl border bg-white px-5 py-3 text-lg" style={{ color: "var(--cor-logo2)" }}>
									Fluxo: To Do -{">"} Doing -{">"} Teste -{">"} Aprovado
								</span>
							</div>
						</div>

						{error ? (
							<div className="rounded-xl border px-4 py-2.5 text-base" style={{ borderColor: "#d66", color: "#b02323" }}>
								{error}
							</div>
						) : null}

						<div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
					{STATUS_COLUMNS.map((column) => (
						<section
							key={column.key}
							className="rounded-2xl border p-3"
							onDragOver={(event) => event.preventDefault()}
							onDrop={(event) => {
								event.preventDefault();
								const rawId = event.dataTransfer.getData("text/plain");
								const taskId = Number(rawId);
								if (Number.isFinite(taskId)) {
									void moveTaskToColumn(taskId, column.key);
								}
							}}
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)" }}
						>
							<div className="mb-3 flex items-center justify-between">
								<h2 className="text-3xl" style={{ color: "var(--cor-logo)" }}>
									{column.label}
								</h2>
								<span className="rounded-full px-2.5 py-1 text-sm" style={{ backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo2)" }}>
									{filteredGrouped[column.key].length}
								</span>
							</div>

							<div className="space-y-3">
								{filteredGrouped[column.key].map((tarefa) => (
									<article
										key={tarefa.id_tarefa}
										draggable
										onDragStart={(event) => {
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
												<p className="text-xl leading-tight font-semibold" style={{ color: "var(--cor-logo)" }}>
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
													<span className="rounded-full border px-2 py-1 text-xs" style={{ color: "#4b5f75", borderColor: "#c6d0db" }}>
														+{(tarefa.relacionados ?? []).length - 5}
													</span>
												) : null}
											</div>
											<p className="mt-1 inline-flex items-center gap-1 text-sm" style={{ color: "var(--cor-logo2)" }}>
												<CalendarDays size={14} />
												{formatDate(tarefa.data_inicio)} -{">"} {formatDate(tarefa.data_prevista_termino ?? tarefa.prazo)}
											</p>

											<div className="mt-2">
												<div className="mb-1 flex items-center justify-between text-sm" style={{ color: "var(--cor-logo2)" }}>
													<span>Progresso</span>
													<span>{tarefa.progresso ?? STATUS_PROGRESS[normalizeStatus(tarefa.status_task)]}%</span>
												</div>
												<div className="h-2 rounded bg-slate-200">
													<div
														className="h-2 rounded"
														style={{
															width: `${tarefa.progresso ?? STATUS_PROGRESS[normalizeStatus(tarefa.status_task)]}%`,
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
						</div>

						{movingTaskId ? (
							<p className="text-base" style={{ color: "var(--cor-logo2)" }}>
								Movendo card #{movingTaskId}...
							</p>
						) : null}
					</>
				)}

				{isProjectModalOpen ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px] animate-fade-in">
						<form
							onSubmit={onCreateProject}
							className="w-full max-w-2xl rounded-3xl border p-6 shadow-2xl animate-pop-in"
							style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)" }}
						>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-2xl" style={{ color: "var(--cor-logo)" }}>
									Novo projeto
								</h2>
								<button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">
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
								<button type="button" onClick={() => setIsProjectModalOpen(false)} className="rounded-xl border px-4 py-2.5 text-base">
									Cancelar
								</button>
								<button
									type="submit"
									disabled={isSavingProject}
									className="rounded-xl border px-4 py-2.5 text-base"
									style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
								>
									{isSavingProject ? "Salvando..." : "Criar projeto"}
								</button>
							</div>
						</form>
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
									Data de inicio
									<input
										type="date"
										value={form.data_inicio}
										onChange={(e) => setForm((c) => ({ ...c, data_inicio: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									/>
								</label>

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Data prevista para terminar
									<input
										type="date"
										value={form.data_prevista_termino}
										onChange={(e) => setForm((c) => ({ ...c, data_prevista_termino: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									/>
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

								<label className="flex flex-col gap-1 text-base" style={{ color: "var(--cor-logo)" }}>
									Progresso (%)
									<input
										type="number"
										min={0}
										max={100}
										value={form.progresso}
										onChange={(e) => setForm((c) => ({ ...c, progresso: e.target.value }))}
										className="rounded-xl border bg-white px-4 py-3 text-base shadow-sm"
									/>
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
							className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl animate-pop-in"
							style={{ backgroundColor: "var(--cor-widgets)", border: "1px solid var(--cor-borda)" }}
						>
							{/* Cabeçalho azul */}
							<div
								className="flex items-center justify-between px-8 py-5"
								style={{ backgroundColor: "var(--cor-primaria)" }}
							>
								<h2 className="text-4xl font-bold text-white">
									Card #{selectedTask.id_tarefa}
								</h2>
								<div className="flex gap-3">
									{!isEditingDetails ? (
										<>
											<button
												type="button"
												onClick={() => setIsEditingDetails(true)}
												className="rounded-xl border border-white/60 bg-white/10 px-5 py-2 text-lg text-white transition hover:bg-white/20"
											>
												Editar
											</button>
											<button
												type="button"
												onClick={() => setIsDeleteConfirmOpen(true)}
												disabled={isDeleting}
												className="rounded-xl border border-white/60 bg-white/10 px-5 py-2 text-lg text-white transition hover:bg-white/20"
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
										className="rounded-xl border border-white/60 bg-white/10 px-5 py-2 text-lg text-white transition hover:bg-white/20"
									>
										Fechar
									</button>
								</div>
							</div>

							{/* Corpo do modal */}
							<div className="p-8">
								<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
									<label className="flex flex-col gap-2 text-lg font-medium" style={{ color: "var(--cor-logo)" }}>
										Título
										<input
											disabled={!isEditingDetails}
											value={detailsForm.titulo}
											onChange={(e) => setDetailsForm((c) => ({ ...c, titulo: e.target.value }))}
											className="rounded-xl border px-4 py-3 text-xl outline-none transition focus:ring-2"
											style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
										/>
									</label>

									<label className="flex flex-col gap-2 text-lg font-medium" style={{ color: "var(--cor-logo)" }}>
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

									<label className="flex flex-col gap-2 text-lg font-medium" style={{ color: "var(--cor-logo)" }}>
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

									<label className="flex flex-col gap-2 text-lg font-medium" style={{ color: "var(--cor-logo)" }}>
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
								<div className="mt-4 flex flex-wrap gap-2">
									<span
										className="rounded-full px-4 py-1.5 text-base font-semibold text-white"
										style={{ backgroundColor: priorityColor(detailsForm.prioridade_task) }}
									>
										Prioridade: {priorityLabel(detailsForm.prioridade_task)}
									</span>
									<span
										className="rounded-full px-4 py-1.5 text-base font-semibold text-white"
										style={{ backgroundColor: typeColor(detailsForm.tipo_task) }}
									>
										{typeLabel(detailsForm.tipo_task)}
									</span>
									{detailsForm.bloqueada ? (
										<span className="rounded-full bg-rose-500 px-4 py-1.5 text-base font-semibold text-white">Bloqueada</span>
									) : null}
								</div>

								<label className="mt-5 flex flex-col gap-2 text-lg font-medium" style={{ color: "var(--cor-logo)" }}>
									Detalhes
									<textarea
										disabled={!isEditingDetails}
										rows={5}
										value={detailsForm.descricao}
										onChange={(e) => setDetailsForm((c) => ({ ...c, descricao: e.target.value }))}
										className="rounded-xl border px-4 py-3 text-lg outline-none transition focus:ring-2 resize-none"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
									/>
								</label>

								{/* Pessoas relacionadas */}
								<div
									className="mt-5 rounded-xl p-5"
									style={{ backgroundColor: "var(--cor-fundo)", border: "1px solid var(--cor-borda)" }}
								>
									<div className="mb-4 flex items-center justify-between">
										<p className="text-lg font-semibold" style={{ color: "var(--cor-logo)" }}>Pessoas relacionadas</p>
										{isEditingDetails && me?.id ? (
											<button
												type="button"
												onClick={addMeToRelacionadosDetails}
												className="rounded-lg border px-4 py-1.5 text-base"
												style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
											>
												Me adicionar
											</button>
										) : null}
									</div>

									{selectedRelatedUsers.length > 0 ? (
										<div className="flex flex-col gap-3">
											{selectedRelatedUsers.map((usuario) => {
												const fullUser = usuarios.find((u) => u.id_usuario === getUsuarioId(usuario));
												const nomeCargo = fullUser?.cargo_relation?.nome_cargo ?? null;
												return (
													<div
														key={`related-avatar-${getUsuarioId(usuario) ?? usuario.nome}`}
														className="flex items-center gap-4"
													>
														<AvatarPill usuario={usuario} size={48} />
														<div className="flex flex-col">
															<span className="text-base font-medium" style={{ color: "var(--cor-logo)" }}>{usuario.nome}</span>
															{nomeCargo ? (
																<span className="text-sm" style={{ color: "var(--cor-logo2)" }}>{nomeCargo}</span>
															) : null}
														</div>
													</div>
												);
											})}
										</div>
									) : (
										<span className="text-lg" style={{ color: "var(--cor-logo2)" }}>
											Sem pessoas relacionadas neste card.
										</span>
									)}

									{isEditingDetails ? (
										<div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
											{usuarios.map((usuario) => (
												<label key={usuario.id_usuario} className="flex items-center gap-2 text-lg" style={{ color: "var(--cor-logo)" }}>
													<input
														type="checkbox"
														checked={detailsForm.relacionados.includes(usuario.id_usuario)}
														onChange={() => onToggleRelacionadoDetails(usuario.id_usuario)}
													/>
													<AvatarPill usuario={usuario} size={28} />
													{usuario.nome}
												</label>
											))}
										</div>
									) : null}
								</div>

								{isEditingDetails ? (
									<div className="mt-6 flex justify-end gap-3">
										<button
											type="button"
											onClick={() => setIsEditingDetails(false)}
											className="rounded-xl border px-6 py-2.5 text-lg"
											style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}
										>
											Cancelar edição
										</button>
										<button
											type="submit"
											disabled={isUpdating}
											className="rounded-xl px-6 py-2.5 text-lg text-white transition hover:opacity-90"
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
