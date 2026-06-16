import { usePage, Head } from "@inertiajs/react";
import { Building2, Users, Shield, Pencil, Plus, Trash2, RefreshCw, CornerDownRight, BriefcaseBusiness } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { apiRoutes } from "@/lib/routes";

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

interface CargoItem {
	id_cargo: number;
	nome_cargo: string;
}

interface EquipeItem {
	id_equipe: number;
	nome: string;
	criado_por?: number | null;
	equipe_pai?: number | null;
	tipo?: string | null;
	data_criacao?: string | null;
}

interface UsuarioItem {
	id_usuario: number;
	nome: string;
}

interface ApiEnvelope<T> {
	data?: T;
	message?: string;
	success?: boolean;
}

const emptyCargo = { nome_cargo: "" };
const emptyEquipe = { nome: "", criado_por: "", equipe_pai: "", tipo: "SUBEQUIPE" };

function readApiMessage(payload: unknown, fallback: string): string {
	if (payload && typeof payload === "object" && "message" in payload) {
		const message = (payload as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) {
			return message;
		}
	}

	return fallback;
}

export default function GestaoPage() {
	const page = usePage<PageProps>();
	const me = page.props.auth?.user;
	const isAdmin = Boolean(me?.permissions?.total);

	const [cargos, setCargos] = useState<CargoItem[]>([]);
	const [equipes, setEquipes] = useState<EquipeItem[]>([]);
	const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [savingCargo, setSavingCargo] = useState(false);
	const [savingEquipe, setSavingEquipe] = useState(false);
	const [editingCargo, setEditingCargo] = useState<CargoItem | null>(null);
	const [editingEquipe, setEditingEquipe] = useState<EquipeItem | null>(null);
	const [cargoForm, setCargoForm] = useState(emptyCargo);
	const [equipeForm, setEquipeForm] = useState(emptyEquipe);
	const [activeTab, setActiveTab] = useState<"cargos" | "equipes">("cargos");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [deletingCargoId, setDeletingCargoId] = useState<number | null>(null);
	const [deletingEquipeId, setDeletingEquipeId] = useState<number | null>(null);

	const csrfToken = useMemo(
		() => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "",
		[],
	);

	const authHeaders = useMemo(() => ({
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
		...(csrfToken ? { "X-CSRF-TOKEN": csrfToken, "X-XSRF-TOKEN": csrfToken } : {}),
	}), [csrfToken]);

	const fetchData = async () => {
		setLoading(true);
		setError(null);

		try {
			const [cargosRes, equipesRes, usuariosRes] = await Promise.all([
				fetch(apiRoutes.cargos, { headers: { Accept: "application/json" } }),
				fetch(apiRoutes.equipes, { headers: { Accept: "application/json" } }),
				fetch(apiRoutes.usuarios, { headers: { Accept: "application/json" } }),
			]);

			const cargosPayload = (await cargosRes.json().catch(() => ({}))) as ApiEnvelope<{ cargos?: CargoItem[] }>;
			const equipesPayload = (await equipesRes.json().catch(() => ({}))) as ApiEnvelope<{ equipes?: EquipeItem[] }>;
			const usuariosPayload = (await usuariosRes.json().catch(() => ({}))) as ApiEnvelope<{ usuarios?: UsuarioItem[] }>;

			setCargos(cargosPayload.data?.cargos ?? []);
			setEquipes(equipesPayload.data?.equipes ?? []);
			setUsuarios(usuariosPayload.data?.usuarios ?? []);
		} catch {
			setError("Nao foi possivel carregar a gestao.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!isAdmin) {
			return;
		}

		void fetchData();
	}, [isAdmin]);

	useEffect(() => {
		if (!success) {
			return;
		}

		const timer = window.setTimeout(() => setSuccess(null), 2800);
		return () => window.clearTimeout(timer);
	}, [success]);

	const resetCargoForm = () => {
		setEditingCargo(null);
		setCargoForm(emptyCargo);
	};

	const resetEquipeForm = () => {
		setEditingEquipe(null);
		setEquipeForm(emptyEquipe);
	};

	const submitCargo = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSavingCargo(true);
		setError(null);

		try {
			const response = await fetch(editingCargo ? `${apiRoutes.cargos}/${editingCargo.id_cargo}` : apiRoutes.cargos, {
				method: editingCargo ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					...authHeaders,
				},
				body: JSON.stringify({ nome_cargo: cargoForm.nome_cargo }),
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(readApiMessage(payload, "Nao foi possivel salvar o cargo."));
			}

			setSuccess(editingCargo ? "Cargo atualizado com sucesso." : "Cargo criado com sucesso.");
			resetCargoForm();
			await fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Nao foi possivel salvar o cargo.");
		} finally {
			setSavingCargo(false);
		}
	};

	const submitEquipe = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSavingEquipe(true);
		setError(null);

		try {
			const payload = {
				nome: equipeForm.nome,
				criado_por: Number(equipeForm.criado_por),
				equipe_pai: equipeForm.equipe_pai ? Number(equipeForm.equipe_pai) : null,
				tipo: equipeForm.tipo,
			};

			const response = await fetch(editingEquipe ? `${apiRoutes.equipes}/${editingEquipe.id_equipe}` : apiRoutes.equipes, {
				method: editingEquipe ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					...authHeaders,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const payloadError = await response.json().catch(() => null);
				throw new Error(readApiMessage(payloadError, "Nao foi possivel salvar a equipe."));
			}

			setSuccess(editingEquipe ? "Equipe atualizada com sucesso." : "Equipe criada com sucesso.");
			resetEquipeForm();
			await fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Nao foi possivel salvar a equipe.");
		} finally {
			setSavingEquipe(false);
		}
	};

	const removeCargo = async (idCargo: number) => {
		setDeletingCargoId(idCargo);
		setError(null);

		try {
			const response = await fetch(`${apiRoutes.cargos}/${idCargo}`, {
				method: "DELETE",
				headers: authHeaders,
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(readApiMessage(payload, "Nao foi possivel excluir o cargo."));
			}

			setSuccess("Cargo excluido com sucesso.");
			await fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Nao foi possivel excluir o cargo.");
		} finally {
			setDeletingCargoId(null);
		}
	};

	const removeEquipe = async (idEquipe: number) => {
		setDeletingEquipeId(idEquipe);
		setError(null);

		try {
			const response = await fetch(`${apiRoutes.equipes}/${idEquipe}`, {
				method: "DELETE",
				headers: authHeaders,
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(readApiMessage(payload, "Nao foi possivel excluir a equipe."));
			}

			setSuccess("Equipe excluida com sucesso.");
			await fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Nao foi possivel excluir a equipe.");
		} finally {
			setDeletingEquipeId(null);
		}
	};

	const totalSubequipes = useMemo(() => equipes.filter((equipe) => (equipe.tipo ?? "SUBEQUIPE") === "SUBEQUIPE").length, [equipes]);
	const totalEmpresas = useMemo(() => equipes.filter((equipe) => (equipe.tipo ?? "SUBEQUIPE") === "EMPRESA").length, [equipes]);

	if (!isAdmin) {
		return (
			<DashboardLayout currentPage="gestao">
				<Head title="Gestao" />
				<div className="rounded-3xl border p-6" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
					<p style={{ color: "var(--cor-logo)" }}>Acesso restrito a administradores.</p>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout currentPage="gestao">
			<Head title="Gestao" />

			<div className="space-y-6 pb-8">
				<section className="relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_22px_60px_rgba(25,42,67,0.12)]" style={{ borderColor: "var(--cor-borda)", background: "linear-gradient(135deg, #f7fbff 0%, #eef4fb 55%, #fdfefe 100%)" }}>
					<div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,rgba(92,127,168,0.16),transparent_70%)] md:block" />
					<div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
						<div className="max-w-2xl space-y-3">
							<div className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]" style={{ borderColor: "#d4e0eb", color: "var(--cor-logo2)" }}>
								<Shield size={14} />
								Gestao da empresa
							</div>
							<div>
								<h1 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--cor-logo)" }}>
									Cargos e equipes em um unico painel
								</h1>
								<p className="mt-2 max-w-2xl text-sm md:text-base" style={{ color: "var(--cor-logo2)" }}>
									Crie cargos e estruture varias equipes da sua empresa, com equipe principal e subequipes, mantendo o padrao visual do projeto.
								</p>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<StatCard icon={<BriefcaseBusiness size={18} />} label="Cargos" value={cargos.length} />
							<StatCard icon={<Users size={18} />} label="Equipes" value={equipes.length} />
							<StatCard icon={<Building2 size={18} />} label="Empresas" value={totalEmpresas} />
							<StatCard icon={<CornerDownRight size={18} />} label="Subequipes" value={totalSubequipes} />
						</div>
					</div>
				</section>

				<div className="flex flex-wrap gap-3">
					<TabButton active={activeTab === "cargos"} onClick={() => setActiveTab("cargos")} label="Cargos" />
					<TabButton active={activeTab === "equipes"} onClick={() => setActiveTab("equipes")} label="Equipes" />
				</div>

				{error ? (
					<div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "#efb4b4", backgroundColor: "#fff4f4", color: "#9f2f2f" }}>
						{error}
					</div>
				) : null}

				{success ? (
					<div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "#9ad8b0", backgroundColor: "#eefaf2", color: "#1d7740" }}>
						{success}
					</div>
				) : null}

				{loading ? (
					<div className="rounded-3xl border p-6" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
						<p style={{ color: "var(--cor-logo2)" }}>Carregando gestao...</p>
					</div>
				) : null}

				{activeTab === "cargos" ? (
					<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
						<section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
							<SectionHeader icon={<Plus size={18} />} title={editingCargo ? "Editar cargo" : "Novo cargo"} subtitle="Cadastre cargos para organizar a hierarquia da empresa." />

							<form onSubmit={submitCargo} className="mt-5 space-y-4">
								<FieldLabel label="Nome do cargo">
									<input
										value={cargoForm.nome_cargo}
										onChange={(e) => setCargoForm({ nome_cargo: e.target.value })}
										placeholder="Ex.: Diretoria, Analista, Designer"
										className="w-full rounded-xl border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
										style={{ borderColor: "var(--cor-borda)" }}
									/>
								</FieldLabel>

								<div className="flex flex-wrap gap-3">
									<button
										type="submit"
										disabled={savingCargo}
										className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
									>
										<Plus size={16} />
										{savingCargo ? "Salvando..." : (editingCargo ? "Salvar cargo" : "Criar cargo")}
									</button>

									{editingCargo ? (
										<button type="button" onClick={resetCargoForm} className="rounded-xl border px-4 py-2.5 text-sm" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>
											Cancelar edição
										</button>
									) : null}
								</div>
							</form>
						</section>

						<section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
							<SectionHeader icon={<BriefcaseBusiness size={18} />} title="Cargos cadastrados" subtitle="Edite ou remova cargos existentes." />

							<div className="mt-5 space-y-3">
								{cargos.length === 0 ? (
									<EmptyState text="Nenhum cargo cadastrado ainda." />
								) : cargos.map((cargo) => (
									<div key={cargo.id_cargo} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "#d8e2eb", backgroundColor: "#fbfdff" }}>
										<div>
											<p className="font-medium" style={{ color: "var(--cor-logo)" }}>{cargo.nome_cargo}</p>
											<p className="text-xs" style={{ color: "var(--cor-logo2)" }}>ID {cargo.id_cargo}</p>
										</div>

										<div className="flex flex-wrap items-center gap-2">
											<button
												type="button"
												onClick={() => {
													setEditingCargo(cargo);
													setActiveTab("cargos");
													setCargoForm({ nome_cargo: cargo.nome_cargo });
												}}
												className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
												style={{ borderColor: "#cfe0ef", backgroundColor: "#eef5fb", color: "var(--cor-logo)" }}
											>
												<Pencil size={14} />
												Editar
											</button>
											<button
												type="button"
												onClick={() => void removeCargo(cargo.id_cargo)}
												disabled={deletingCargoId === cargo.id_cargo}
												className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
												style={{ borderColor: "#efb4b4", backgroundColor: "#fff4f4", color: "#b23b3b" }}
											>
												{deletingCargoId === cargo.id_cargo ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
												{deletingCargoId === cargo.id_cargo ? "Excluindo..." : "Excluir"}
											</button>
										</div>
									</div>
								))}
							</div>
						</section>
					</div>
				) : null}

				{activeTab === "equipes" ? (
					<div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
						<section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
							<SectionHeader icon={<Plus size={18} />} title={editingEquipe ? "Editar equipe" : "Nova equipe"} subtitle="Crie equipes principais ou subequipes dentro da empresa." />

							<form onSubmit={submitEquipe} className="mt-5 grid gap-4 md:grid-cols-2">
								<FieldLabel label="Nome da equipe">
									<input
										value={equipeForm.nome}
										onChange={(e) => setEquipeForm((current) => ({ ...current, nome: e.target.value }))}
										placeholder="Ex.: Produto, Marketing, Operações"
										className="w-full rounded-xl border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
										style={{ borderColor: "var(--cor-borda)" }}
									/>
								</FieldLabel>

								<FieldLabel label="Responsavel da criacao">
									<select
										value={equipeForm.criado_por}
										onChange={(e) => setEquipeForm((current) => ({ ...current, criado_por: e.target.value }))}
										className="w-full rounded-xl border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
										style={{ borderColor: "var(--cor-borda)" }}
									>
										<option value="">Selecione</option>
										{usuarios.map((usuario) => (
											<option key={usuario.id_usuario} value={usuario.id_usuario}>
												{usuario.nome}
											</option>
										))}
									</select>
								</FieldLabel>

								<FieldLabel label="Tipo">
									<select
										value={equipeForm.tipo}
										onChange={(e) => setEquipeForm((current) => ({ ...current, tipo: e.target.value }))}
										className="w-full rounded-xl border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
										style={{ borderColor: "var(--cor-borda)" }}
									>
										<option value="EMPRESA">Equipe principal</option>
										<option value="SUBEQUIPE">Subequipe</option>
									</select>
								</FieldLabel>

								<FieldLabel label="Equipe pai" description="Opcional para subequipes.">
									<select
										value={equipeForm.equipe_pai}
										onChange={(e) => setEquipeForm((current) => ({ ...current, equipe_pai: e.target.value }))}
										className="w-full rounded-xl border bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
										style={{ borderColor: "var(--cor-borda)" }}
									>
										<option value="">Nenhuma</option>
										{equipes.map((equipe) => (
											<option key={equipe.id_equipe} value={equipe.id_equipe}>
												{equipe.nome}
											</option>
										))}
									</select>
								</FieldLabel>

								<div className="md:col-span-2 flex flex-wrap gap-3">
									<button
										type="submit"
										disabled={savingEquipe}
										className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
										style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-botao)", color: "var(--cor-logo)" }}
									>
										<Plus size={16} />
										{savingEquipe ? "Salvando..." : (editingEquipe ? "Salvar equipe" : "Criar equipe")}
									</button>

									{editingEquipe ? (
										<button type="button" onClick={resetEquipeForm} className="rounded-xl border px-4 py-2.5 text-sm" style={{ borderColor: "var(--cor-borda)", color: "var(--cor-logo)" }}>
											Cancelar edição
										</button>
									) : null}
								</div>
							</form>
						</section>

						<section className="rounded-[2rem] border p-6 shadow-lg" style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}>
							<SectionHeader icon={<Users size={18} />} title="Equipes cadastradas" subtitle="Visualize as equipes principais e suas subequipes." />

							<div className="mt-5 space-y-3">
								{equipes.length === 0 ? (
									<EmptyState text="Nenhuma equipe cadastrada ainda." />
								) : equipes.map((equipe) => {
									const owner = usuarios.find((usuario) => usuario.id_usuario === equipe.criado_por)?.nome ?? "Nao informado";
									const parent = equipes.find((item) => item.id_equipe === equipe.equipe_pai)?.nome ?? null;

									return (
										<div key={equipe.id_equipe} className="rounded-2xl border px-4 py-4" style={{ borderColor: "#d8e2eb", backgroundColor: "#fbfdff" }}>
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
													<IconButton onClick={() => { setEditingEquipe(equipe); setEquipeForm({ nome: equipe.nome, criado_por: equipe.criado_por ? String(equipe.criado_por) : "", equipe_pai: equipe.equipe_pai ? String(equipe.equipe_pai) : "", tipo: equipe.tipo ?? "SUBEQUIPE" }); }} title="Editar equipe"><Pencil size={14} /></IconButton>
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
				) : null}
			</div>
		</DashboardLayout>
	);
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
	return (
		<div className="rounded-2xl border bg-white/85 p-4 shadow-sm backdrop-blur" style={{ borderColor: "#d4e0eb" }}>
			<div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--cor-logo2)" }}>
				{icon}
				{label}
			</div>
			<p className="mt-2 text-2xl font-bold" style={{ color: "var(--cor-logo)" }}>{value}</p>
		</div>
	);
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
			style={{
				borderColor: active ? "var(--cor-logo)" : "var(--cor-borda)",
				backgroundColor: active ? "var(--cor-logo)" : "var(--cor-widgets)",
				color: active ? "#ffffff" : "var(--cor-logo)",
			}}
		>
			{label}
		</button>
	);
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
	return (
		<div className="flex items-start gap-3">
			<div className="mt-0.5 rounded-xl border p-2" style={{ borderColor: "#d4e0eb", backgroundColor: "#eef5fb", color: "var(--cor-logo)" }}>
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
			{description ? <span className="text-xs font-normal" style={{ color: "var(--cor-logo2)" }}>{description}</span> : null}
			{children}
		</label>
	);
}

function IconButton({ children, onClick, title, danger = false, disabled = false }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			disabled={disabled}
			className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
			style={{
				borderColor: danger ? "#efb4b4" : "#d4e0eb",
				backgroundColor: danger ? "#fff4f4" : "#f8fbff",
				color: danger ? "#b23b3b" : "var(--cor-logo)",
			}}
		>
			{children}
		</button>
	);
}

function EmptyState({ text }: { text: string }) {
	return (
		<div className="rounded-2xl border border-dashed px-4 py-6 text-sm" style={{ borderColor: "#d4e0eb", color: "var(--cor-logo2)" }}>
			{text}
		</div>
	);
}
