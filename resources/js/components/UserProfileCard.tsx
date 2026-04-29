import type { CSSProperties } from "react";

interface ProfileUser {
    id?: number;
    name: string;
    role: string;
    status: string;
    avatar?: string;
}

interface UserProfileCardProps {
    user: ProfileUser;
    isOpen: boolean;
    positionClassName?: string;
    style?: CSSProperties;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("");
}

export default function UserProfileCard({
    user,
    isOpen,
    positionClassName = "absolute right-0 top-11 z-50",
    style,
}: UserProfileCardProps) {
    if (!isOpen) {
        return null;
    }

    const avatar = user.avatar && (user.avatar.startsWith("data:image/") || user.avatar.startsWith("http://") || user.avatar.startsWith("https://"))
        ? user.avatar
        : undefined;

    return (
        <div
            className={`${positionClassName} w-72 max-w-[92vw] bg-[#f3e5ef] border-2 border-[#dd8bc3] rounded-xl shadow-2xl overflow-hidden animate-slide-in-right`}
            style={style}
        >
            <div className="h-20 bg-linear-to-r from-[#f6b5dd] via-[#efc4e6] to-[#d8b7ee]" />

            <div className="px-3 pb-3 -mt-6">
                <div className="flex items-start justify-between gap-2">
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={user.name}
                            className="w-14 h-14 rounded-full object-cover ring-3 ring-white shadow-sm"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-[#6c63ff] text-white flex items-center justify-center text-sm font-bold ring-3 ring-white shadow-sm">
                            {getInitials(user.name)}
                        </div>
                    )}

                    <span className="mt-1 text-xs font-semibold text-[#7b5d73] bg-white/90 px-2 py-0.5 rounded-full border border-[#e8c6da]">
                        Perfil
                    </span>
                </div>

                <div className="mt-2">
                    <p className="text-2xl font-semibold text-[#3f3340] leading-none truncate">{user.name}</p>
                    <p className="text-xs text-[#5b4b5a] mt-0.5 truncate">{user.role}</p>
                    <p className="text-xs text-[#6b5a6a] mt-0.5">@{user.name.split(" ")[0].toLowerCase()} • {user.status}</p>
                </div>

                <div className="mt-3 rounded-lg bg-white border-2 border-[#e6c7da] p-2">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-[#7b5d73]" htmlFor="status-select">Status</label>
                    <p className="mt-1 rounded-md border border-[#e6c7da] bg-[#fff7fc] px-2 py-2 text-xs font-semibold text-[#5f5060]">
                        {user.status}
                    </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/90 border border-[#e6c7da] text-[#6d5468]">Time Produto</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/90 border border-[#e6c7da] text-[#6d5468]">UX</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/90 border border-[#e6c7da] text-[#6d5468]">Coordenacao</span>
                </div>

                <div className="mt-3 rounded-lg bg-white/80 border border-[#e6c7da] p-2">
                    <p className="text-xs uppercase tracking-wide text-[#8c7088]">Sobre</p>
                    <p className="text-xs text-[#5f5060] mt-1">Responsavel por alinhamento de prioridades e qualidade das entregas.</p>
                </div>

                <div className="mt-2 rounded-lg bg-white/80 border border-[#e6c7da] p-2">
                    <p className="text-xs uppercase tracking-wide text-[#8c7088]">Colecao</p>
                    <div className="mt-1 flex items-center gap-1 text-base">
                        <span>🎨</span>
                        <span>🧩</span>
                        <span>📌</span>
                        <span className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-600">+5</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
