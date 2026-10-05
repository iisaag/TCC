import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DropdownUser {
    name: string;
    role: string;
}

interface UserDropdownMenuProps {
    user: DropdownUser;
    isOpen: boolean;
    positionClassName?: string;
    profileHref?: string;
    currentStatus?: string;
    onStatusChange?: (status: string) => void;
    onLogoutClick?: () => void;
}

const STATUS_OPTIONS = [
    { value: "online", label: "Online" },
    { value: "ocupado", label: "Ocupado" },
    { value: "ausente", label: "Ausente" },
    { value: "não perturbe", label: "Não perturbe" },
] as const;

function statusColor(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized.includes("online")) {
        return "#22c55e";
    }

    if (normalized.includes("ocupado")) {
        return "#f97316";
    }

    if (normalized.includes("ausente")) {
        return "#facc15";
    }

    if (normalized.includes("não perturbe")) {
        return "#ef4444";
    }

    return "#9ca3af";
}

function statusLabel(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized === "não perturbe") {
        return "Não perturbe";
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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

    const selected = STATUS_OPTIONS.find((option) => option.value === value);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold outline-none transition-all duration-200 hover:shadow-sm"
                style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-widgets)", color: "var(--cor-logo)" }}
            >
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(value) }} />
                    {selected?.label ?? "Selecione"}
                </span>
                <ChevronDown
                    size={14}
                    style={{ transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--cor-logo2)", flexShrink: 0 }}
                />
            </button>
            {open ? (
                <div
                    className="animate-dropdown absolute left-0 right-0 z-10 mt-1.5 rounded-xl border p-1 shadow-lg"
                    style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}
                >
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors"
                            style={{
                                color: "var(--cor-logo)",
                                backgroundColor: value === option.value
                                    ? "color-mix(in srgb, var(--cor-botao) 60%, var(--cor-fundo))"
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
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(option.value) }} />
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function UserDropdownMenu({
    user,
    isOpen,
    positionClassName = "absolute right-0 top-11 z-40",
    profileHref = "/settings",
    currentStatus = "online",
    onStatusChange,
    onLogoutClick,
}: UserDropdownMenuProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={`${positionClassName} w-64 max-w-[85vw] rounded-2xl border shadow-xl animate-scale-in-small`}
            style={{ backgroundColor: "var(--cor-widgets)", borderColor: "var(--cor-borda)" }}
        >
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--cor-borda)" }}>
                <p className="truncate text-sm font-semibold" style={{ color: "var(--cor-logo)" }}>{user.name}</p>
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--cor-logo2)" }}>{user.role}</p>
            </div>

            <div className="py-1">
                <div className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--cor-logo2)" }}>Status</p>
                        <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                            style={{ borderColor: "var(--cor-borda)", backgroundColor: "var(--cor-fundo)", color: "var(--cor-logo)" }}
                        >
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: statusColor(currentStatus) }}
                            />
                            {statusLabel(currentStatus)}
                        </span>
                    </div>
                    <div className="mt-2">
                        <StatusSelect value={currentStatus} onChange={(status) => onStatusChange?.(status)} />
                    </div>
                </div>

                <a
                    href={profileHref}
                    className="block w-full px-4 py-2.5 text-left text-sm transition-colors duration-150"
                    style={{ color: "var(--cor-logo)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--cor-fundo)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent"; }}
                >
                    Meu perfil
                </a>
                <button
                    type="button"
                    onClick={onLogoutClick}
                    className="w-full rounded-b-2xl px-4 py-2.5 text-left text-sm transition-colors duration-150"
                    style={{ color: "var(--cor-perigo)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "color-mix(in srgb, var(--cor-perigo) 12%, var(--cor-widgets))"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                >
                    Sair
                </button>
            </div>
        </div>
    );
}
