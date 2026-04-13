export const frontRoutes = {
    home: '/dashboard',
    dashboard: '/dashboard',
    desempenho: '/desempenho',
    equipe: '/equipe',
    projetos: '/projetos',
    login: '/login',
    settings: '/settings',
} as const;

export const apiRoutes = {
    cargos: '/api/cargos',
    equipes: '/api/equipes',
    equipesTotalSubequipes: '/api/equipes/subequipes/total',
    historicoProgresso: '/api/historico-progresso',
    historicoProgressoUltimo: (id: number | string) => `/api/historico-progresso/tarefa/${id}/ultimo`,
    logProjeto: '/api/log-projeto',
    logSistema: '/api/log-sistema',
    metas: '/api/metas',
    projetos: '/api/projetos',
    authVerificar: '/api/auth/verificar',
    senhas: '/api/senhas',
    tarefas: '/api/tarefas',
    usuarios: '/api/usuarios',
    databaseBackup: '/api/database/backup',
} as const;
