import { Head, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";
import { useState } from "react";

export default function Login() {
	const [showPassword, setShowPassword] = useState(false);

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

			<main className="min-h-screen bg-[#d8dbe3]">
				<div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
					<section className="relative hidden overflow-hidden bg-[#07132a] text-white lg:flex lg:flex-col">
						<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(67,96,151,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(67,96,151,0.12)_1px,transparent_1px)] bg-[size:34px_34px]" />
						<div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-r from-transparent to-[#0a1834]/70" />

						<div className="relative flex h-full flex-col justify-between px-12 py-12">
							<div>
								<div className="flex items-center gap-3 text-xl font-bold">
									<span className="grid size-9 place-content-center rounded-xl bg-[#2563eb] shadow-[0_8px_18px_rgba(37,99,235,0.45)]">
										<svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M5 18V9" />
											<path d="M10 18V6" />
											<path d="M15 18v-4" />
											<path d="M3 18h18" />
										</svg>
									</span>
									<span>AivyPM</span>
								</div>

								<div className="mt-28 inline-flex items-center gap-2 rounded-full border border-[#2a4f99] bg-[#11306a]/40 px-4 py-1 text-xs font-semibold uppercase tracking-[0.02em] text-[#7ca8ff]">
									<svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M13 2L4 14h6l-1 8 9-12h-6z" />
									</svg>
									GESTAO ESTRATEGICA
								</div>

								<h1 className="mt-10 max-w-[16ch] text-6xl font-extrabold leading-[1.08] tracking-[-0.02em]">
									Acesse sua conta e volte ao fluxo
									<span className="block text-[#5da1ff]">de trabalho.</span>
								</h1>

								<p className="mt-8 max-w-md text-[28px] leading-relaxed text-[#90a7d4]">
									Uma entrada simples, limpa e sem dependencias desnecessarias para montar o dashboard editorial.
								</p>

								<ul className="mt-12 space-y-4 text-[22px] text-[#92a8d3]">
									{[
										"Visao estrategica e resumo operacional",
										"Saude dos projetos em tempo real",
										"Produtividade por equipe e distribuicao de tarefas",
									].map((item) => (
										<li key={item} className="flex items-center gap-3">
											<span className="inline-flex size-5 items-center justify-center rounded-full border border-[#16d7a7] text-[#16d7a7]">
												<svg aria-hidden="true" viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3">
													<path d="M5 12l4 4 10-10" />
												</svg>
											</span>
											<span>{item}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					</section>

					<section className="flex items-center justify-center px-6 py-10 lg:px-16">
						<div className="w-full max-w-[560px]">
							<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2e6ce8]">ENTRADA</p>
							<h2 className="mt-3 text-5xl font-extrabold tracking-[-0.01em] text-[#0b1a36]">Fazer login</h2>
							<p className="mt-3 text-[17px] text-[#74839d]">Use seu e-mail e senha cadastrados para entrar na solucao.</p>

							<form className="mt-12 space-y-7" onSubmit={submit}>
								<div>
									<label className="mb-2 block text-sm font-semibold text-[#3d4b66]" htmlFor="email">Email</label>
									<input
										id="email"
										type="email"
										value={data.email}
										onChange={(event) => setData("email", event.target.value)}
										className="h-14 w-full rounded-2xl border border-[#d8dde8] bg-[#eef1f7] px-5 text-base text-[#1b2b4a] outline-none transition focus:border-[#8ca9e6] focus:bg-white"
									/>
									{errors.email && <p className="mt-2 text-xs font-medium text-red-600">{errors.email}</p>}
								</div>

								<div>
									<div className="mb-2 flex items-center justify-between">
										<label className="block text-sm font-semibold text-[#3d4b66]" htmlFor="senha">Senha</label>
										<a href="#" className="text-xs font-semibold text-[#2d6ce8] hover:opacity-80">Esqueci a senha</a>
									</div>
									<div className="relative">
										<input
											id="senha"
											type={showPassword ? "text" : "password"}
											value={data.senha}
											onChange={(event) => setData("senha", event.target.value)}
											className="h-14 w-full rounded-2xl border border-[#d8dde8] bg-[#eef1f7] px-5 pr-12 text-base text-[#1b2b4a] outline-none transition focus:border-[#8ca9e6] focus:bg-white"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((prev) => !prev)}
											aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
											className="absolute inset-y-0 right-3 inline-flex items-center rounded-lg px-2 text-[#95a3bb] transition hover:text-[#6c7f9f]"
										>
											{showPassword ? (
												<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
													<path d="M3 3l18 18" />
													<path d="M10.6 10.6a2 2 0 002.8 2.8" />
													<path d="M9.9 5.1A10.8 10.8 0 0112 5c6.5 0 10 7 10 7a18 18 0 01-4.2 5.2" />
													<path d="M6.1 6.1C3.8 7.7 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.5" />
												</svg>
											) : (
												<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
													<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
													<circle cx="12" cy="12" r="3" />
												</svg>
											)}
										</button>
									</div>
									{errors.senha && <p className="mt-2 text-xs font-medium text-red-600">{errors.senha}</p>}
								</div>

								<label className="flex items-center gap-3 text-sm text-[#74839d]">
									<input type="checkbox" className="size-4 rounded border-[#cad2e1] bg-[#eef1f7] text-[#2d6ce8]" />
									<span>Manter conectado</span>
								</label>

								<button
									type="submit"
									disabled={processing}
									className="mt-1 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#2f6ae8] text-lg font-bold text-white shadow-[0_16px_30px_rgba(47,106,232,0.35)] transition hover:bg-[#2358c9] disabled:cursor-not-allowed disabled:opacity-60"
								>
									{processing ? "Entrando..." : "Entrar"}
									<span aria-hidden="true">→</span>
								</button>
							</form>

							<p className="mt-10 text-center text-sm text-[#8f9bb0]">
								Nao tem uma conta? <a href="#" className="font-semibold text-[#2d6ce8] hover:opacity-80">Solicite acesso</a>
							</p>
							<p className="mt-7 text-center text-xs text-[#a8b1c0]">© 2026 AivyPM - Todos os direitos reservados</p>
						</div>
					</section>
				</div>
			</main>
		</>
	);
}
