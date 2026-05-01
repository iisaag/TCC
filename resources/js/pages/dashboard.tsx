import DashboardLayout from "@/layouts/DashboardLayout";

export default function Dashboard() {
    return (
        <DashboardLayout currentPage="dashboard">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-textoII)' }}>Dashboard</h1>
        </DashboardLayout>
    );
}
