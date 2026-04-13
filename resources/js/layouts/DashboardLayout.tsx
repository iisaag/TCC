import { ReactNode, useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ActiveUsers from "@/components/ActiveUsers";

type PageName = "dashboard" | "performance" | "tasks" | "team" | "settings";

interface DashboardLayoutProps {
    children: ReactNode;
    currentPage: PageName;
}

interface SessionUser {
    id: number;
    name: string;
    role: string;
    status?: string;
    avatar?: string | null;
    permissions?: {
        total?: boolean;
    };
    nivel_acesso?: string;
}

interface PageProps {
    auth?: {
        user?: SessionUser | null;
    };
    projectUsers?: ActiveUser[];
}

interface PresenceUsersResponse {
    data?: {
        users?: ActiveUser[];
    };
}

interface ActiveUser {
    id: number;
    name: string;
    role: string;
    status: string;
    avatar?: string;
}

function resolveAvatarUrl(avatar?: string | null): string | undefined {
    if (!avatar) {
        return undefined;
    }

    if (
        avatar.startsWith("data:image/") ||
        avatar.startsWith("http://") ||
        avatar.startsWith("https://")
    ) {
        return avatar;
    }

    return undefined;
}

const DEFAULT_USER = {
    name: "Isabelli Arantes",
    role: "Chefe - Design & Front",
    status: "online",
    avatar: undefined as string | undefined,
};

const DEFAULT_ACTIVE_USERS: ActiveUser[] = [];

function resolveRoleLabel(role?: string | { nome_cargo?: string | null } | null, cargoRelation?: { nome_cargo?: string | null } | null): string {
    if (typeof role === "string" && role.trim() !== "") {
        return role;
    }

    if (role && typeof role === "object" && typeof role.nome_cargo === "string" && role.nome_cargo.trim() !== "") {
        return role.nome_cargo;
    }

    if (cargoRelation?.nome_cargo) {
        return cargoRelation.nome_cargo;
    }

    return "Sem cargo";
}

// ------------------------------------------------------------------
// COMPONENTE
// ------------------------------------------------------------------
export default function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
    const page = usePage<PageProps>();
    const [headerUser, setHeaderUser] = useState(DEFAULT_USER);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>(DEFAULT_ACTIVE_USERS);

    const sessionUser = page.props.auth?.user;
    const projectUsers = page.props.projectUsers ?? [];

    useEffect(() => {
        if (!sessionUser) {
            return;
        }

        let isMounted = true;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

        const syncPresence = async () => {
            try {
                await fetch('/presence/heartbeat', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                });

                const response = await fetch('/presence/users', {
                    headers: {
                        Accept: 'application/json',
                    },
                });

                if (!response.ok || !isMounted) {
                    return;
                }

                const payload = (await response.json()) as PresenceUsersResponse;
                const users = payload.data?.users ?? [];

                const mappedUsers = users.map((usuario) => ({
                    id: usuario.id,
                    name: usuario.name,
                    role: resolveRoleLabel(usuario.role),
                    status: usuario.status || 'offline',
                    avatar: resolveAvatarUrl(usuario.avatar),
                }));

                if (mappedUsers.length > 0) {
                    setActiveUsers(mappedUsers);

                    const me = mappedUsers.find((item) => item.id === sessionUser.id);
                    if (me) {
                        setHeaderUser((current) => ({
                            ...current,
                            name: me.name,
                            role: me.role,
                            status: me.status,
                            avatar: me.avatar,
                        }));
                    }
                }
            } catch {
                // Mantem os status atuais se o polling falhar.
            }
        };

        void syncPresence();

        const interval = window.setInterval(() => {
            void syncPresence();
        }, 3000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, [sessionUser?.id]);

    useEffect(() => {
        const handleStatusUpdate = (event: Event) => {
            if (!sessionUser) {
                return;
            }

            const customEvent = event as CustomEvent<{ status?: string }>;
            const nextStatus = customEvent.detail?.status;

            if (!nextStatus) {
                return;
            }

            setActiveUsers((current) => current.map((user) => (
                user.id === sessionUser.id ? { ...user, status: nextStatus } : user
            )));

            setHeaderUser((current) => ({
                ...current,
                status: nextStatus,
            }));
        };

        window.addEventListener('presence:status-updated', handleStatusUpdate as EventListener);

        return () => {
            window.removeEventListener('presence:status-updated', handleStatusUpdate as EventListener);
        };
    }, [sessionUser?.id]);

    useEffect(() => {
        if (projectUsers.length === 0 && !sessionUser) {
            setHeaderUser(DEFAULT_USER);
            setActiveUsers(DEFAULT_ACTIVE_USERS);
            return;
        }

        const mappedUsers = projectUsers.map((usuario) => ({
            id: usuario.id,
            name: usuario.name,
            role: resolveRoleLabel(usuario.role),
            status: usuario.status || "offline",
            avatar: resolveAvatarUrl(usuario.avatar),
        }));

        setActiveUsers(mappedUsers);

        if (sessionUser) {
            const role = resolveRoleLabel(sessionUser.role);

            setHeaderUser({
                name: sessionUser.name,
                role,
                status: sessionUser.status || "online",
                avatar: resolveAvatarUrl(sessionUser.avatar),
            });
            return;
        }

        const firstUser = mappedUsers[0];

        if (firstUser) {
            setHeaderUser({
                name: firstUser.name,
                role: firstUser.role,
                status: firstUser.status,
                avatar: firstUser.avatar,
            });
            return;
        }

        setHeaderUser(DEFAULT_USER);
    }, [sessionUser, projectUsers]);

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--cor-fundo)' }}>
            <Sidebar currentPage={currentPage} />

            <div className="flex flex-col flex-1 min-w-0">
                <Header user={headerUser} />

                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>

                    <div className="overflow-y-auto p-4" style={{ backgroundColor: 'var(--cor-secundaria)' }}>
                        <ActiveUsers users={activeUsers} currentUserId={sessionUser?.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
