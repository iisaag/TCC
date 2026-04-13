import { Head, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";

export default function Login() {
	const { data, setData, post, processing, errors } = useForm({
		email: "",
		senha: "",
	});

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		post("/login");
	};

	return (
		<>
			<Head title="Login" />

			<main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f9f1ff,#f7f7fb_40%,#e9edf7_100%)] px-6 py-10">
				<div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-4xl border border-white/60 bg-white/75 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
					<div className="hidden flex-1 flex-col justify-between bg-[linear-gradient(160deg,#0f172a,#1e293b_55%,#334155)] p-10 text-white lg:flex">
						<div>
							<p className="text-sm uppercase tracking-[0.35em] text-white/60">AivyPM</p>
							<h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight">Acesse sua conta e volte ao fluxo de trabalho.</h1>
							<p className="mt-4 max-w-lg text-base leading-7 text-white/70">Uma entrada simples, limpa e sem dependências desnecessárias para manter o dashboard estável.</p>
					</div>
						<div className="grid grid-cols-3 gap-3 text-sm text-white/70">
							<div className="rounded-2xl border border-white/10 bg-white/8 p-4">Sessão</div>
							<div className="rounded-2xl border border-white/10 bg-white/8 p-4">Permissões</div>
							<div className="rounded-2xl border border-white/10 bg-white/8 p-4">Dashboard</div>
						</div>
					</div>

					<div className="flex w-full max-w-xl items-center justify-center p-6 lg:max-w-md lg:p-10">
						<div className="w-full max-w-md">
							<div className="mb-8">
								<p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Entrada</p>
								<h2 className="mt-3 text-3xl font-semibold text-slate-900">Fazer login</h2>
								<p className="mt-2 text-sm leading-6 text-slate-600">Use seu email e senha cadastrados para entrar na aplicação.</p>
							</div>

							<form className="space-y-5" onSubmit={submit}>
								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">Email</label>
									<input id="email" type="email" value={data.email} onChange={(event) => setData("email", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-400 focus:shadow-[0_0_0_4px_rgba(148,163,184,0.18)]" />
									{errors.email && <p className="mt-2 text-xs font-medium text-red-600">{errors.email}</p>}
								</div>

								<div>
									<label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="senha">Senha</label>
									<input id="senha" type="password" value={data.senha} onChange={(event) => setData("senha", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-400 focus:shadow-[0_0_0_4px_rgba(148,163,184,0.18)]" />
									{errors.senha && <p className="mt-2 text-xs font-medium text-red-600">{errors.senha}</p>}
								</div>

								<button type="submit" disabled={processing} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
									{processing ? "Entrando..." : "Entrar"}
								</button>
							</form>
						</div>
					</div>
				</div>
			</main>
		</>
	);
}
