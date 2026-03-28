import DashboardLayout from "@/layouts/DashboardLayout";

export default function Desempenho() {
    return (
        <DashboardLayout currentPage="performance">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--cor-textoII)' }}>Desempenho</h1>
        </DashboardLayout>
    );
}