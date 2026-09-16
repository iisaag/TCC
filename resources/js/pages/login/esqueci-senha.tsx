import { Head, Link, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";
import { useState } from "react";
import RequiredMark from "@/components/ui/required-mark";

export default function EsqueciSenha() {
	const [showSenha, setShowSenha] = useState(false);
	const [showSenhaConfirmation, setShowSenhaConfirmation] = useState(false);

	const { data, setData, post, processing, errors } = useForm({
		email: "",
		senha: "",
		senha_confirmation: "",
	});

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		post("/esqueci-senha");
	};

	return (
		<>
			<Head title="Esqueci a senha" />

			<main className="flex min-h-screen items-center justify-center bg-[#d8dbe3] px-6 py-10">
				<div className="w-full max-w-[480px] rounded-3xl bg-white p-10 shadow-[0_20px_60px_rgba(15,30,60,0.12)]">
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2e6ce8]">RECUPERACAO</p>
					<h2 className="mt-3 text-4xl font-extrabold tracking-[-0.01em] text-[#0b1a36]">Esqueci a senha</h2>
					<p className="mt-3 text-[15px] text-[#74839d]">
						Informe seu e-mail cadastrado e defina uma nova senha para acessar o AivyPM.
					</p>

					<form className="mt-8 space-y-6" onSubmit={submit}>
						<div>
								<label className="mb-2 flex items-center text-sm font-semibold text-[#3d4b66]" htmlFor="email">Email<RequiredMark /></label>
							<input
								id="email"
								type="email"
									required
								value={data.email}
								onChange={(event) => setData("email", event.target.value)}
								className="h-14 w-full rounded-2xl border border-[#d8dde8] bg-[#eef1f7] px-5 text-base text-[#1b2b4a] outline-none transition focus:border-[#8ca9e6] focus:bg-white"
							/>
							{errors.email && <p className="mt-2 text-xs font-medium text-red-600">{errors.email}</p>}
						</div>

						<div>
								<label className="mb-2 flex items-center text-sm font-semibold text-[#3d4b66]" htmlFor="senha">Nova senha<RequiredMark /></label>
							<div className="relative">
								<input
									id="senha"
									type={showSenha ? "text" : "password"}
										required
									value={data.senha}
									onChange={(event) => setData("senha", event.target.value)}
									className="h-14 w-full rounded-2xl border border-[#d8dde8] bg-[#eef1f7] px-5 pr-12 text-base text-[#1b2b4a] outline-none transition focus:border-[#8ca9e6] focus:bg-white"
								/>
								<button
									type="button"
									onClick={() => setShowSenha((prev) => !prev)}
									aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
									className="absolute inset-y-0 right-3 inline-flex items-center rounded-lg px-2 text-[#95a3bb] transition hover:text-[#6c7f9f]"
								>
									{showSenha ? (
										<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
											<circle cx="12" cy="12" r="3" />
										</svg>
									) : (
										<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M3 3l18 18" />
											<path d="M10.6 10.6a2 2 0 002.8 2.8" />
											<path d="M9.9 5.1A10.8 10.8 0 0112 5c6.5 0 10 7 10 7a18 18 0 01-4.2 5.2" />
											<path d="M6.1 6.1C3.8 7.7 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.5" />
										</svg>
									)}
								</button>
							</div>
							{errors.senha && <p className="mt-2 text-xs font-medium text-red-600">{errors.senha}</p>}
						</div>

						<div>
								<label className="mb-2 flex items-center text-sm font-semibold text-[#3d4b66]" htmlFor="senha_confirmation">Confirmar nova senha<RequiredMark /></label>
							<div className="relative">
								<input
									id="senha_confirmation"
									type={showSenhaConfirmation ? "text" : "password"}
										required
									value={data.senha_confirmation}
									onChange={(event) => setData("senha_confirmation", event.target.value)}
									className="h-14 w-full rounded-2xl border border-[#d8dde8] bg-[#eef1f7] px-5 pr-12 text-base text-[#1b2b4a] outline-none transition focus:border-[#8ca9e6] focus:bg-white"
								/>
								<button
									type="button"
									onClick={() => setShowSenhaConfirmation((prev) => !prev)}
									aria-label={showSenhaConfirmation ? "Ocultar senha" : "Mostrar senha"}
									className="absolute inset-y-0 right-3 inline-flex items-center rounded-lg px-2 text-[#95a3bb] transition hover:text-[#6c7f9f]"
								>
									{showSenhaConfirmation ? (
										<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
											<circle cx="12" cy="12" r="3" />
										</svg>
									) : (
										<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M3 3l18 18" />
											<path d="M10.6 10.6a2 2 0 002.8 2.8" />
											<path d="M9.9 5.1A10.8 10.8 0 0112 5c6.5 0 10 7 10 7a18 18 0 01-4.2 5.2" />
											<path d="M6.1 6.1C3.8 7.7 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.5" />
										</svg>
									)}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={processing}
							className="mt-1 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#2f6ae8] text-lg font-bold text-white shadow-[0_16px_30px_rgba(47,106,232,0.35)] transition hover:bg-[#2358c9] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{processing ? "Atualizando..." : "Atualizar senha"}
						</button>
					</form>

					<p className="mt-8 text-center text-sm text-[#8f9bb0]">
						Lembrou a senha? <Link href="/login" className="font-semibold text-[#2d6ce8] hover:opacity-80">Voltar para o login</Link>
					</p>
				</div>
			</main>
		</>
	);
}
