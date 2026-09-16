import { Head, Link, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";
import RequiredMark from "@/components/ui/required-mark";

export default function SolicitarAcesso() {
	const { data, setData, post, processing, errors } = useForm({
		email: "",
	});

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		post("/solicitar-acesso");
	};

	return (
		<>
			<Head title="Solicitar acesso" />

			<main className="flex min-h-screen items-center justify-center bg-[#d8dbe3] px-6 py-10">
				<div className="w-full max-w-[480px] rounded-3xl bg-white p-10 shadow-[0_20px_60px_rgba(15,30,60,0.12)]">
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2e6ce8]">NOVO ACESSO</p>
					<h2 className="mt-3 text-4xl font-extrabold tracking-[-0.01em] text-[#0b1a36]">Solicite acesso</h2>
					<p className="mt-3 text-[15px] text-[#74839d]">
						Informe seu e-mail e o administrador entrara em contato para liberar seu acesso ao AivyPM.
					</p>

					<form className="mt-8 space-y-6" onSubmit={submit}>
						<div>
							<label className="mb-2 flex items-center text-sm font-semibold text-[#3d4b66]" htmlFor="email">Seu email<RequiredMark /></label>
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

						<button
							type="submit"
							disabled={processing}
							className="mt-1 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#2f6ae8] text-lg font-bold text-white shadow-[0_16px_30px_rgba(47,106,232,0.35)] transition hover:bg-[#2358c9] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{processing ? "Enviando..." : "Enviar solicitacao"}
						</button>
					</form>

					<p className="mt-8 text-center text-sm text-[#8f9bb0]">
						Ja tem uma conta? <Link href="/login" className="font-semibold text-[#2d6ce8] hover:opacity-80">Voltar para o login</Link>
					</p>
				</div>
			</main>
		</>
	);
}
