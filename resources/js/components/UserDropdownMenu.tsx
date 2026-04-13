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
            className={`${positionClassName} w-64 max-w-[85vw] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-scale-in`}
        >
            <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.role}</p>
            </div>

            <div className="py-1">
                <div className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: statusColor(currentStatus) }}
                            />
                            {statusLabel(currentStatus)}
                        </span>
                    </div>
                    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5">
                        <select
                            value={currentStatus}
                            onChange={(event) => onStatusChange?.(event.target.value)}
                            className="w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 outline-none"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <a
                    href={profileHref}
                    className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                    Meu perfil
                </a>
                <button
                    type="button"
                    onClick={onLogoutClick}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                >
                    Sair
                </button>
            </div>
        </div>
    );
}
