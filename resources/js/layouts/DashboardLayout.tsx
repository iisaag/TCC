// =============================================================
// 📁 DashboardLayout.tsx — versão sem back-end
// =============================================================
// Todos os dados são mockados aqui embaixo.
// Quando o back estiver pronto:
//   1. Tire MOCK_USER e MOCK_ACTIVE_USERS daqui
//   2. Adicione `user` nas props e passe auth.user do Inertia
// =============================================================

import { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ActiveUsers from "@/components/ActiveUsers";

type PageName = "dashboard" | "performance" | "tasks" | "team" | "settings";

interface DashboardLayoutProps {
    children: ReactNode;
    currentPage: PageName;
}

// ------------------------------------------------------------------
// 🔧 MOCK — troque por dados reais quando tiver o back
// ------------------------------------------------------------------
const MOCK_USER = {
    name: "Isabelli Arantes",
    role: "Chefe - Design & Front",
    avatar: undefined as string | undefined,
};

const MOCK_ACTIVE_USERS = [
    { id: 1, name: "Isabelli Arantes",    role: "Chefe - Design & Front-End", status: "online",               avatar: undefined },
    { id: 2, name: "Ana Clara dos Santos", role: "Chefe - Back-end",           status: "em reunião no Teams",  avatar: undefined },
    { id: 3, name: "Isabela Rangel",       role: "Chefe - Dados",              status: "disponível",           avatar: undefined },
];

// ------------------------------------------------------------------
// COMPONENTE
// ------------------------------------------------------------------
export default function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar currentPage={currentPage} />

            <div className="flex flex-col flex-1 min-w-0">
                <Header user={MOCK_USER} />

                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>

                    <div className="overflow-y-auto p-4 border-l border-gray-200 bg-[#BFD6E7]">
                        <ActiveUsers users={MOCK_ACTIVE_USERS} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================
// 💡 USO NAS PÁGINAS (sem precisar de nada do back)
// =============================================================
//
// import DashboardLayout from "@/layouts/DashboardLayout";
//
// export default function Dashboard() {
//     return (
//         <DashboardLayout currentPage="dashboard">
//             <h1>Seu conteúdo aqui</h1>
//         </DashboardLayout>
//     );
// }
