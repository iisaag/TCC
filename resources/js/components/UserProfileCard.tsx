import type { CSSProperties } from "react";

interface ProfileUser {
    id?: number;
    name: string;
    role: string;
    status: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    profileTags?: string | null;
    profileBio?: string | null;
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

    function parseCommaList(value?: string | null): string[] {
        return (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
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
    const tags = parseCommaList(user.profileTags);
    const aboutText = user.profileBio?.trim() || "Sem descrição cadastrada.";
    const contactLines = [user.email?.trim(), user.phone?.trim(), user.location?.trim()].filter(Boolean) as string[];

    return (
        <div
            className={`${positionClassName} w-72 max-w-[92vw] overflow-hidden rounded-2xl border border-[var(--cor-borda)] bg-[var(--cor-widgets)] shadow-[0_20px_45px_rgba(23,62,91,0.18)] animate-slide-in-right`}
            style={style}
        >
            <div className="h-20 bg-linear-to-r from-[var(--cor-primaria)] via-[var(--cor-foto)] to-[var(--cor-secundaria)]" />

            <div className="px-3 pb-3 -mt-6">
                <div className="flex items-start justify-between gap-2">
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={user.name}
                            className="h-14 w-14 rounded-full object-cover ring-3 ring-white shadow-sm"
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--cor-foto)] text-sm font-bold text-white ring-3 ring-white shadow-sm">
                            {getInitials(user.name)}
                        </div>
                    )}

                    <span className="mt-1 rounded-full border border-[var(--cor-borda)] bg-white/90 px-2 py-0.5 text-xs font-semibold text-[var(--cor-logo2)]">
                        Perfil
                    </span>
                </div>

                <div className="mt-2">
                    <p className="truncate text-2xl leading-none font-semibold text-[var(--cor-logo)]">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--cor-logo2)]">{user.role}</p>
                    <p className="mt-0.5 text-xs text-slate-500">@{user.name.split(" ")[0].toLowerCase()} • {user.status}</p>
                </div>

                <div className="mt-3 rounded-xl border border-[var(--cor-borda)] bg-white p-3">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--cor-logo2)]" htmlFor="status-select">Status</label>
                    <p className="mt-2 rounded-lg border border-[var(--cor-borda)] bg-[var(--cor-fundo)] px-3 py-2 text-xs font-semibold text-[var(--cor-accentII)]">
                        {user.status}
                    </p>
                </div>

                {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-[var(--cor-borda)] bg-white px-2 py-0.5 text-xs text-[var(--cor-logo2)]">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-3 rounded-xl border border-[var(--cor-borda)] bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-[var(--cor-logo2)]">Sobre</p>
                    <p className="mt-1 text-xs text-slate-600">{aboutText}</p>
                </div>

                {contactLines.length > 0 && (
                    <div className="mt-2 rounded-xl border border-[var(--cor-borda)] bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-[var(--cor-logo2)]">Contato</p>
                        <div className="mt-1 space-y-1 text-xs text-slate-600">
                            {contactLines.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
