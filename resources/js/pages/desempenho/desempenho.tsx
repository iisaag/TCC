import DashboardLayout from "@/layouts/DashboardLayout";

export default function Desempenho() {
    return (
        <DashboardLayout currentPage="performance">
            <h1 className="text-2xl font-bold text-[var(--cor-textoI)]">Desempenho</h1>
        </DashboardLayout>
    );
}