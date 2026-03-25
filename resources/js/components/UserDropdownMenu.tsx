interface DropdownUser {
    name: string;
    role: string;
}

interface UserDropdownMenuProps {
    user: DropdownUser;
    isOpen: boolean;
    positionClassName?: string;
    onProfileClick?: () => void;
    onSettingsClick?: () => void;
    onLogoutClick?: () => void;
}

export default function UserDropdownMenu({
    user,
    isOpen,
    positionClassName = "absolute right-0 top-11 z-40",
    onProfileClick,
    onSettingsClick,
    onLogoutClick,
}: UserDropdownMenuProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={`${positionClassName} w-64 max-w-[85vw] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden`}
        >
            <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.role}</p>
            </div>

            <div className="py-1">
                <button
                    type="button"
                    onClick={onProfileClick}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                    Meu perfil
                </button>
                <button
                    type="button"
                    onClick={onSettingsClick}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                    Configuracoes
                </button>
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
