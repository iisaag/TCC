export default function RequiredMark() {
	return (
		<span className="group relative ml-1 inline-flex align-middle">
			<span
				tabIndex={0}
				aria-label="Campo obrigatorio"
				className="flex h-4 w-4 items-center justify-center rounded-full outline-none ring-offset-2 transition focus-visible:ring-2"
				style={{ backgroundColor: "var(--cor-perigo)", color: "#fff", ringColor: "var(--cor-perigo)", ringOffsetColor: "var(--cor-widgets)" }}
			>
				<svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
					<path d="M12 3.4 1.9 20.6c-.35.6.08 1.4.78 1.4h18.64c.7 0 1.13-.8.78-1.4L12 3.4Zm0 5.1c.5 0 .9.4.9.9v5.8a.9.9 0 1 1-1.8 0V9.4c0-.5.4-.9.9-.9Zm0 10.2a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z" />
				</svg>
			</span>
			<span
				role="tooltip"
				className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[190px] -translate-x-1/2 translate-y-1 scale-95 rounded-xl border px-3 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-all duration-150 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
				style={{
					backgroundColor: "var(--cor-widgets)",
					borderColor: "var(--cor-borda)",
					color: "var(--cor-logo)",
					boxShadow: "0 12px 28px rgba(6, 15, 26, 0.22)",
				}}
			>
				Campo obrigatorio
				<span
					className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent"
					style={{ borderTopColor: "var(--cor-widgets)" }}
				/>
			</span>
		</span>
	);
}
