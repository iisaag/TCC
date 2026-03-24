import { Head, Link } from "@inertiajs/react";

export default function Login() {
	return (
		<>
			<Head title="Login" />

			<main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
				<div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
					<h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
					<p className="mt-2 text-sm text-gray-600">Tela de login temporária.</p>

					<div className="mt-6">
						<Link
							href="/dashboard"
							className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
						>
							Voltar para dashboard
						</Link>
					</div>
				</div>
			</main>
		</>
	);
}
