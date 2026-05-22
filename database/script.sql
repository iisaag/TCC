CREATE DATABASE IF NOT EXISTS TCC;
USE tcc;

# TABELA CARGOS
CREATE TABLE IF NOT EXISTS cargos (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    nome_cargo VARCHAR(100) NOT NULL UNIQUE
);


# TABELA USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(30) NULL,
    localizacao VARCHAR(120) NULL,
    foto_perfil LONGTEXT,
    cargo VARCHAR(100),
    nivel VARCHAR(50),
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cargo) REFERENCES cargos(nome_cargo)
);

# TABELA SENHA
CREATE TABLE IF NOT EXISTS senha (
    email VARCHAR(150) PRIMARY KEY,
    senha VARCHAR(100) NOT NULL,
    nivel_acesso VARCHAR(50) NOT NULL,
    FOREIGN KEY (email) REFERENCES usuarios(email)
);


#TABELA EQUIPE
CREATE TABLE IF NOT EXISTS equipes (
    id_equipe INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    criado_por INT NOT NULL,
    equipe_pai INT DEFAULT NULL,
    tipo VARCHAR(50) DEFAULT 'SUBEQUIPE',
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (equipe_pai) REFERENCES equipes(id_equipe)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

# TABELA PROJETOS
CREATE TABLE IF NOT EXISTS projetos (
    id_projeto INT AUTO_INCREMENT PRIMARY KEY,
    nome_projeto VARCHAR(150) NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    prazo_final DATE,
    status_projeto VARCHAR(50),
    prioridade_proj VARCHAR(15),
    id_responsavel INT,
    FOREIGN KEY (id_responsavel) REFERENCES usuarios(id_usuario)
);

# TABELA METAS
CREATE TABLE IF NOT EXISTS metas (
    id_meta INT AUTO_INCREMENT PRIMARY KEY,
    id_projeto INT NOT NULL,
    titulo_meta VARCHAR(150) NOT NULL,
    prazo_meta DATE NOT NULL,
    data_conclusao_meta DATE,
    status_meta VARCHAR(50) DEFAULT 'Pendente',
    FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto)
);

# TABELA TAREFAS
CREATE TABLE IF NOT EXISTS tarefas (
    id_tarefa INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    id_projeto INT,
    id_responsavel INT,
    prioridade_task VARCHAR(15),
    tipo_task VARCHAR(20),
    data_inicio DATE,
    data_prevista_termino DATE,
    progresso TINYINT UNSIGNED DEFAULT 0,
    bloqueada BOOLEAN DEFAULT FALSE,
    prazo DATE,
    status_task VARCHAR(50),
    FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto),
    FOREIGN KEY (id_responsavel) REFERENCES usuarios(id_usuario)
);

# TABELA HISTORICO
CREATE TABLE IF NOT EXISTS historico_progresso (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    id_tarefa INT,
    progresso INT,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT,
    FOREIGN KEY (id_tarefa) REFERENCES tarefas(id_tarefa),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

# TABELA LOG PROJETOS
CREATE TABLE IF NOT EXISTS log_projeto (
    id_log_projeto INT AUTO_INCREMENT PRIMARY KEY,
    id_projeto INT,
    id_usuario INT,
    mensagem TEXT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

# TABELA LOG SISTEMA
CREATE TABLE IF NOT EXISTS log_sistema (
    id_log_sistema INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    acao VARCHAR(200),
    descricao TEXT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
    
    #TESTES/EXEMPLO DE DADOS
    
# CARGOS
INSERT INTO cargos (nome_cargo)
VALUES
('Administrador'),
('Desenvolvedor'),
('Designer'),
('Analista'),
('Gerente'),
('Suporte'),
('Vendas'),
('Financeiro'),
('Recursos Humanos'),
('Marketing'),
('Chefe de Design'),
('Chefe de Desenvolvimento'),
('Chefe de Analise')
ON DUPLICATE KEY UPDATE nome_cargo = nome_cargo;


INSERT INTO usuarios (nome, email, telefone, localizacao, foto_perfil, cargo, nivel, data_criacao)
VALUES
('Isabelli Arantes', 'belli@ivyteam.com', NULL, NULL, NULL, 'Chefe de Design', 'Pleno', NOW()),
('Ana Clara Moreira', 'ana@ivyteam.com', NULL, 'São Paulo, BR', NULL, 'Chefe de Desenvolvimento', 'Pleno', NOW()),
('Isabela Rangel', 'bela@ivyteam.com', NULL, 'Rio de Janeiro, BR', NULL, 'Chefe de Analise', 'Pleno', NOW()),
('Bruno Costa', 'bruno@ivyteam.com', NULL, NULL, NULL, 'Desenvolvedor', 'Sênior', NOW()),
('Carla Pereira', 'carla@ivyteam.com', NULL, NULL, NULL, 'Suporte', 'Júnior', NOW()),
('Daniel Souza', 'daniel@ivyteam.com', NULL, 'Belo Horizonte, BR', NULL, 'Gerente', 'Sênior', NOW()),
('Eva Martins', 'eva@ivyteam.com', NULL, NULL, NULL, 'Designer', 'Pleno', NOW()),
('Felipe Ramos', 'felipe@ivyteam.com', NULL, NULL, NULL, 'Administrador', 'Pleno', NOW()),
('Gabriela Lima', 'gabriela@ivyteam.com', NULL, NULL, NULL, 'Financeiro', 'Pleno', NOW()),
('Hugo Silva', 'hugo@ivyteam.com', NULL, NULL, NULL, 'Marketing', 'Júnior', NOW()),
('Lucas Almeida', 'lucas.almeida@ivyteam.com', NULL, 'São Paulo, BR', NULL, 'Desenvolvedor', 'Pleno', NOW()),
('Mariana Santos', 'mariana.santos@ivyteam.com', NULL, 'Recife, BR', NULL, 'Desenvolvedor', 'Júnior', NOW()),
('Rafael Gomes', 'rafael.gomes@ivyteam.com', NULL, 'Porto Alegre, BR', NULL, 'Desenvolvedor', 'Sênior', NOW()),
('Tiago Rocha', 'tiago.rocha@ivyteam.com', NULL, 'Curitiba, BR', NULL, 'Desenvolvedor', 'Pleno', NOW()),
('Laura Pinto', 'laura.pinto@ivyteam.com', NULL, 'Salvador, BR', NULL, 'Designer', 'Pleno', NOW()),
('Marcos Lima', 'marcos.lima@ivyteam.com', NULL, 'Fortaleza, BR', NULL, 'Designer', 'Júnior', NOW()),
('Patricia Nunes', 'patricia.nunes@ivyteam.com', NULL, 'Natal, BR', NULL, 'Designer', 'Pleno', NOW()),
('Gustavo Fernandes', 'gustavo.fernandes@ivyteam.com', NULL, 'Belém, BR', NULL, 'Analista', 'Pleno', NOW()),
('Renata Costa', 'renata.costa@ivyteam.com', NULL, 'Manaus, BR', NULL, 'Analista', 'Júnior', NOW()),
('Bruno Mello', 'bruno.mello@ivyteam.com', NULL, 'Belo Horizonte, BR', NULL, 'Gerente', 'Sênior', NOW()),
('Sofia Ribeiro', 'sofia.ribeiro@ivyteam.com', NULL, 'São Paulo, BR', NULL, 'Suporte', 'Júnior', NOW()),
('Paulo Nunes', 'paulo.nunes@ivyteam.com', NULL, 'Campinas, BR', NULL, 'Suporte', 'Pleno', NOW()),
('Ricardo Santos', 'ricardo.santos@ivyteam.com', NULL, 'Porto Alegre, BR', NULL, 'Administrador', 'Pleno', NOW()),
('Mariana Oliveira', 'mariana.oliveira@ivyteam.com', NULL, 'Recife, BR', NULL, 'Financeiro', 'Pleno', NOW()),
('Igor Alves', 'igor.alves@ivyteam.com', NULL, 'Rio de Janeiro, BR', NULL, 'Marketing', 'Pleno', NOW()),
('Camila Duarte', 'camila.duarte@ivyteam.com', NULL, 'Vitória, BR', NULL, 'Vendas', 'Pleno', NOW())
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO senha (email, senha, nivel_acesso)
VALUES
('belli@ivyteam.com', '123', 'adm'),
('ana@ivyteam.com', '0809', 'adm'),
('bela@ivyteam.com', '0906', 'adm'),
('bruno@ivyteam.com', '2222', 'usuario'),
('carla@ivyteam.com', '3333', 'usuario'),
('daniel@ivyteam.com', '4444', 'usuario'),
('eva@ivyteam.com', '5555', 'usuario'),
('felipe@ivyteam.com', '6666', 'usuario'),
('gabriela@ivyteam.com', '7777', 'usuario'),
('hugo@ivyteam.com', '8888', 'usuario'),
('lucas.almeida@ivyteam.com', 'pwd123', 'usuario'),
('mariana.santos@ivyteam.com', 'pwd123', 'usuario'),
('rafael.gomes@ivyteam.com', 'pwd123', 'usuario'),
('tiago.rocha@ivyteam.com', 'pwd123', 'usuario'),
('laura.pinto@ivyteam.com', 'pwd123', 'usuario'),
('marcos.lima@ivyteam.com', 'pwd123', 'usuario'),
('patricia.nunes@ivyteam.com', 'pwd123', 'usuario'),
('gustavo.fernandes@ivyteam.com', 'pwd123', 'usuario'),
('renata.costa@ivyteam.com', 'pwd123', 'usuario'),
('bruno.mello@ivyteam.com', 'pwd123', 'usuario'),
('sofia.ribeiro@ivyteam.com', 'pwd123', 'usuario'),
('paulo.nunes@ivyteam.com', 'pwd123', 'usuario'),
('ricardo.santos@ivyteam.com', 'pwd123', 'usuario'),
('mariana.oliveira@ivyteam.com', 'pwd123', 'usuario'),
('igor.alves@ivyteam.com', 'pwd123', 'usuario'),
('camila.duarte@ivyteam.com', 'pwd123', 'usuario')
ON DUPLICATE KEY UPDATE senha = VALUES(senha);

# EQUIPES
INSERT INTO equipes (nome, criado_por, tipo)
SELECT x.nome, x.criado_por, x.tipo
FROM (
    SELECT 'Equipe Design' AS nome, 1 AS criado_por, 'SUBEQUIPE' AS tipo
    UNION ALL
    SELECT 'Equipe Backend', 4, 'SUBEQUIPE'
    UNION ALL
    SELECT 'Núcleo Produto', 6, 'EMPRESA'
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM equipes e
    WHERE e.nome = x.nome
);

# PROJETOS
INSERT INTO projetos (nome_projeto, descricao, data_inicio, prazo_final, status_projeto, prioridade_proj, id_responsavel)
SELECT
    x.nome_projeto,
    x.descricao,
    x.data_inicio,
    x.prazo_final,
    x.status_projeto,
    x.prioridade_proj,
    x.id_responsavel
FROM (
    SELECT 'Sistema de Gestao' AS nome_projeto, 'Plataforma para gerenciar projetos' AS descricao, '2026-03-10' AS data_inicio, '2026-06-30' AS prazo_final, 'Em andamento' AS status_projeto, 'Alta' AS prioridade_proj, 6 AS id_responsavel
    UNION ALL SELECT 'Aplicativo Mobile', 'App para controle de tarefas', '2026-04-01', '2026-08-01', 'Planejamento', 'Média', 4
    UNION ALL SELECT 'Portal Público', 'Portal para clientes e informações públicas', '2026-02-15', '2026-05-30', 'Concluído', 'Baixa', 2
    UNION ALL SELECT 'Portal Administrativo', 'Interface interna para gestão e relatórios', '2026-05-01', '2026-09-30', 'Planejamento', 'Alta', 8
    UNION ALL SELECT 'API de Integração', 'Construir API para integração com parceiros', '2026-05-10', '2026-09-30', 'Planejamento', 'Alta', 11
    UNION ALL SELECT 'Refatoração Frontend', 'Refatorar código React e melhorar performance', '2026-05-15', '2026-08-15', 'Planejamento', 'Alta', 13
    UNION ALL SELECT 'Sistema de Pagamentos', 'Implementar gateway de pagamentos e cobranças', '2026-05-20', '2026-10-01', 'Em andamento', 'Alta', 20
    UNION ALL SELECT 'Portal B2B', 'Portal destinado a clientes corporativos', '2026-04-20', '2026-11-30', 'Em andamento', 'Alta', 15
    UNION ALL SELECT 'Automação de Testes', 'Criar suíte de testes automatizados', '2026-05-05', '2026-07-31', 'Planejamento', 'Média', 12
    UNION ALL SELECT 'Campanha Marketing Q3', 'Planejamento e execução da campanha do terceiro trimestre', '2026-06-01', '2026-09-30', 'Planejamento', 'Média', 25
    UNION ALL SELECT 'Migração Legado', 'Migrar sistema legado para nova arquitetura', '2026-05-25', '2026-10-31', 'Planejamento', 'Alta', 6
    UNION ALL SELECT 'Onboarding Automation', 'Automatizar fluxo de onboarding de clientes', '2026-06-01', '2026-08-01', 'Planejamento', 'Média', 9
    UNION ALL SELECT 'Dashboard Analytics', 'Painel com métricas de uso e vendas', '2026-05-18', '2026-07-30', 'Em andamento', 'Alta', 8
    UNION ALL SELECT 'Suporte Bot', 'Chatbot para suporte inicial aos usuários', '2026-06-10', '2026-09-01', 'Planejamento', 'Baixa', 21
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM projetos p
    WHERE p.nome_projeto = x.nome_projeto
);

# METAS
INSERT INTO metas (id_projeto, titulo_meta, prazo_meta, data_conclusao_meta, status_meta)
SELECT x.id_projeto, x.titulo_meta, x.prazo_meta, x.data_conclusao_meta, x.status_meta
FROM (
    SELECT 1 AS id_projeto, 'Finalizar login e permissões' AS titulo_meta, '2026-03-31' AS prazo_meta, '2026-04-03' AS data_conclusao_meta, 'Concluída' AS status_meta
    UNION ALL
    SELECT 1, 'Entregar dashboard principal', '2026-04-20', NULL, 'Em andamento'
    UNION ALL
    SELECT 2, 'Aprovar protótipo navegável', '2026-04-18', '2026-04-17', 'Concluída'
    UNION ALL
    SELECT 3, 'Publicar portal', '2026-05-20', '2026-05-15', 'Concluída'
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM metas m
    WHERE m.id_projeto = x.id_projeto
      AND m.titulo_meta = x.titulo_meta
);

# TAREFAS
INSERT INTO tarefas (titulo, descricao, id_projeto, id_responsavel, prioridade_task, prazo, status_task)
SELECT
    x.titulo,
    x.descricao,
    x.id_projeto,
    x.id_responsavel,
    x.prioridade_task,
    x.prazo,
    x.status_task
FROM (
    SELECT 'Criar tela de login' AS titulo, 'Desenvolver tela inicial de autenticação' AS descricao, 1 AS id_projeto, 2 AS id_responsavel, 'Alta' AS prioridade_task, '2026-03-20' AS prazo, 'Em andamento' AS status_task
    UNION ALL SELECT 'Criar layout do dashboard', 'Design da tela principal do sistema', 1, 1, 'Média', '2026-03-25', 'Pendente'
    UNION ALL SELECT 'Modelar banco de dados', 'Criar estrutura inicial do banco', 2, 3, 'Alta', '2026-04-10', 'Pendente'
    UNION ALL SELECT 'Publicar páginas institucionais', 'Criar as páginas iniciais do portal público', 3, 4, 'Média', '2026-05-22', 'Em andamento'
    UNION ALL SELECT 'Ajustar SEO e acessibilidade', 'Melhorar headings, contraste e metadados', 3, 2, 'Baixa', '2026-05-28', 'Pendente'
    UNION ALL SELECT 'Criar painel de relatórios', 'Montar tela interna com indicadores do administrativo', 4, 8, 'Alta', '2026-05-25', 'Em andamento'
    UNION ALL SELECT 'Configurar permissões internas', 'Liberar acessos por cargo no portal administrativo', 4, 6, 'Alta', '2026-05-30', 'Pendente'
    UNION ALL SELECT 'Implementar API de projetos', 'Endpoints REST para projetos', 1, 4, 'Alta', '2026-04-05', 'Em andamento'
    UNION ALL SELECT 'Testes automatizados', 'Cobertura inicial de testes', 1, 6, 'Média', '2026-05-01', 'Pendente'
    UNION ALL SELECT 'Implementar autenticação API', 'Adicionar JWT/OAuth e middleware de segurança', 5, 11, 'Alta', '2026-06-15', 'Pendente'
    UNION ALL SELECT 'Criar endpoints de integração', 'Endpoints para parceiros e parceiros externos', 5, 11, 'Alta', '2026-06-30', 'Pendente'
    UNION ALL SELECT 'Refatorar componentes críticos', 'Refatorar componentes que impactam performance', 6, 13, 'Alta', '2026-06-20', 'Pendente'
    UNION ALL SELECT 'Melhorar cobertura de testes', 'Adicionar testes unitários e E2E', 9, 12, 'Média', '2026-07-15', 'Pendente'
    UNION ALL SELECT 'Integrar gateway de pagamentos', 'Implantar e testar gateway de pagamentos', 7, 20, 'Alta', '2026-08-01', 'Em andamento'
    UNION ALL SELECT 'Criar página B2B', 'Desenvolver fluxo de onboarding para clientes B2B', 8, 15, 'Alta', '2026-09-01', 'Em andamento'
    UNION ALL SELECT 'Preparar materiais de campanha', 'Criar artes e textos para campanha Q3', 10, 25, 'Média', '2026-07-05', 'Pendente'
    UNION ALL SELECT 'Migrar módulos legados', 'Planejar e executar migração dos módulos legados', 11, 6, 'Alta', '2026-09-30', 'Planejamento'
    UNION ALL SELECT 'Criar fluxos de onboarding', 'Automatizar emails e tarefas de onboarding', 12, 9, 'Média', '2026-07-15', 'Pendente'
    UNION ALL SELECT 'Configurar Dashboard Analytics', 'Conectar eventos e métricas ao painel', 13, 8, 'Alta', '2026-06-30', 'Em andamento'
    UNION ALL SELECT 'Desenvolver chatbot de suporte', 'Implementar fluxo inicial de respostas automáticas', 14, 21, 'Baixa', '2026-08-15', 'Pendente'
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM tarefas t
    WHERE t.titulo = x.titulo
      AND t.id_projeto = x.id_projeto
);

INSERT INTO tarefas (titulo, descricao, id_projeto, id_responsavel, prioridade_task, tipo_task, data_inicio, data_prevista_termino, progresso, bloqueada, prazo, status_task)
SELECT
    CASE
        WHEN p.nome_projeto LIKE 'Sistema de Gestao' THEN 'Ajustar a base do sistema'
        WHEN p.nome_projeto LIKE 'Aplicativo Mobile' THEN 'Dar o primeiro passo no app'
        WHEN p.nome_projeto LIKE 'Portal Público' THEN 'Subir o portal com calma'
        WHEN p.nome_projeto LIKE 'Portal Administrativo' THEN 'Organizar a área interna'
        WHEN p.nome_projeto LIKE 'API de Integração' THEN 'Conectar a API com parceiros'
        WHEN p.nome_projeto LIKE 'Refatoração Frontend' THEN 'Limpar o front e simplificar'
        WHEN p.nome_projeto LIKE 'Sistema de Pagamentos' THEN 'Fechar o caminho da cobrança'
        WHEN p.nome_projeto LIKE 'Portal B2B' THEN 'Desenhar a jornada do cliente empresa'
        WHEN p.nome_projeto LIKE 'Automação de Testes' THEN 'Ligar os testes automáticos'
        WHEN p.nome_projeto LIKE 'Campanha Marketing Q3' THEN 'Organizar a campanha do trimestre'
        WHEN p.nome_projeto LIKE 'Migração Legado' THEN 'Fazer a virada do legado'
        WHEN p.nome_projeto LIKE 'Onboarding Automation' THEN 'Simplificar a entrada do cliente'
        WHEN p.nome_projeto LIKE 'Dashboard Analytics' THEN 'Montar o painel com os números'
        WHEN p.nome_projeto LIKE 'Suporte Bot' THEN 'Dar voz ao bot'
        ELSE CONCAT('Abrir ', p.nome_projeto)
    END,
    CASE
        WHEN p.nome_projeto LIKE 'Sistema de Gestao' THEN 'Ajustar login, permissões e fluxo do dia a dia'
        WHEN p.nome_projeto LIKE 'Aplicativo Mobile' THEN 'Dar forma à entrega inicial do app'
        WHEN p.nome_projeto LIKE 'Portal Público' THEN 'Separar o que entra na parte pública'
        WHEN p.nome_projeto LIKE 'Portal Administrativo' THEN 'Deixar o uso interno mais leve'
        WHEN p.nome_projeto LIKE 'API de Integração' THEN 'Abrir espaço para integrar com parceiros'
        WHEN p.nome_projeto LIKE 'Refatoração Frontend' THEN 'Deixar o front mais simples de mexer'
        WHEN p.nome_projeto LIKE 'Sistema de Pagamentos' THEN 'Garantir a cobrança sem ruído'
        WHEN p.nome_projeto LIKE 'Portal B2B' THEN 'Pensar no fluxo do cliente empresa'
        WHEN p.nome_projeto LIKE 'Automação de Testes' THEN 'Cobrir os caminhos mais usados'
        WHEN p.nome_projeto LIKE 'Campanha Marketing Q3' THEN 'Juntar tudo que a campanha vai precisar'
        WHEN p.nome_projeto LIKE 'Migração Legado' THEN 'Fazer a troca com o mínimo de impacto'
        WHEN p.nome_projeto LIKE 'Onboarding Automation' THEN 'Tornar a entrada do cliente mais simples'
        WHEN p.nome_projeto LIKE 'Dashboard Analytics' THEN 'Mostrar os dados com clareza'
        WHEN p.nome_projeto LIKE 'Suporte Bot' THEN 'Fazer o bot responder melhor'
        ELSE CONCAT('Primeiro passo para ', p.nome_projeto)
    END,
    p.id_projeto,
    p.id_responsavel,
    'MEDIA',
    'BACK',
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 7 DAY),
    50,
    FALSE,
    DATE_ADD(CURDATE(), INTERVAL 7 DAY),
    'Em andamento'
FROM projetos p
LEFT JOIN tarefas t ON t.id_projeto = p.id_projeto
WHERE t.id_projeto IS NULL;

# CARDS E TAREFAS PARA TODOS OS PROJETOS (KANBAN COMPLETO)
INSERT INTO tarefas (titulo, descricao, id_projeto, id_responsavel, prioridade_task, tipo_task, data_inicio, data_prevista_termino, progresso, bloqueada, prazo, status_task)
SELECT
    CONCAT('Card ', s.status_task, ' - ', p.nome_projeto) AS titulo,
    CONCAT('Card de ', s.status_task, ' do projeto ', p.nome_projeto) AS descricao,
    p.id_projeto,
    p.id_responsavel,
    s.prioridade_task,
    s.tipo_task,
    CURDATE() AS data_inicio,
    DATE_ADD(CURDATE(), INTERVAL s.dias_previstos DAY) AS data_prevista_termino,
    s.progresso,
    FALSE AS bloqueada,
    DATE_ADD(CURDATE(), INTERVAL s.dias_previstos DAY) AS prazo,
    s.status_task
FROM projetos p
CROSS JOIN (
    SELECT 'TO_DO' AS status_task, 'MEDIA' AS prioridade_task, 'FRONT' AS tipo_task, 0 AS progresso, 14 AS dias_previstos
    UNION ALL
    SELECT 'DOING', 'ALTA', 'BACK', 50, 10
    UNION ALL
    SELECT 'TESTE', 'MEDIA', 'FULLSTACK', 75, 7
    UNION ALL
    SELECT 'APROVADO', 'BAIXA', 'FULLSTACK', 100, 3
) AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM tarefas t
    WHERE t.id_projeto = p.id_projeto
      AND t.status_task = s.status_task
      AND t.titulo = CONCAT('Card ', s.status_task, ' - ', p.nome_projeto)
);

# TAREFA BASE PARA TODOS OS PROJETOS
INSERT INTO tarefas (titulo, descricao, id_projeto, id_responsavel, prioridade_task, tipo_task, data_inicio, data_prevista_termino, progresso, bloqueada, prazo, status_task)
SELECT
    CONCAT('Tarefa Base - ', p.nome_projeto) AS titulo,
    CONCAT('Tarefa base para planejamento inicial do projeto ', p.nome_projeto) AS descricao,
    p.id_projeto,
    p.id_responsavel,
    'MEDIA' AS prioridade_task,
    'BACK' AS tipo_task,
    CURDATE() AS data_inicio,
    DATE_ADD(CURDATE(), INTERVAL 7 DAY) AS data_prevista_termino,
    50 AS progresso,
    FALSE AS bloqueada,
    DATE_ADD(CURDATE(), INTERVAL 7 DAY) AS prazo,
    'DOING' AS status_task
FROM projetos p
WHERE NOT EXISTS (
    SELECT 1
    FROM tarefas t
    WHERE t.id_projeto = p.id_projeto
      AND t.titulo = CONCAT('Tarefa Base - ', p.nome_projeto)
);

# HISTORICO DE PROGRESSO
INSERT INTO historico_progresso (id_tarefa, progresso, data_atualizacao, id_usuario)
SELECT x.id_tarefa, x.progresso, NOW(), x.id_usuario
FROM (
    SELECT 1 AS id_tarefa, 40 AS progresso, 2 AS id_usuario
    UNION ALL SELECT 2, 20, 1
    UNION ALL SELECT 3, 10, 3
    UNION ALL SELECT 4, 60, 4
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM historico_progresso h
    WHERE h.id_tarefa = x.id_tarefa
      AND h.progresso = x.progresso
      AND h.id_usuario = x.id_usuario
);

# LOG PROJETO
INSERT INTO log_projeto (id_projeto, id_usuario, mensagem, data_hora)
SELECT x.id_projeto, x.id_usuario, x.mensagem, NOW()
FROM (
    SELECT 1 AS id_projeto, 2 AS id_usuario, 'Usuário iniciou desenvolvimento da tela de login' AS mensagem
    UNION ALL SELECT 1, 1, 'Designer começou o layout do dashboard'
    UNION ALL SELECT 2, 3, 'Analista iniciou modelagem do banco de dados'
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM log_projeto l
    WHERE l.id_projeto = x.id_projeto
      AND l.id_usuario = x.id_usuario
      AND l.mensagem = x.mensagem
);

# LOG SISTEMA
INSERT INTO log_sistema (id_usuario, acao, descricao, data_hora)
SELECT x.id_usuario, x.acao, x.descricao, NOW()
FROM (
    SELECT 1 AS id_usuario, 'login' AS acao, 'Usuário realizou login no sistema' AS descricao
    UNION ALL SELECT 2, 'criar_tarefa', 'Usuário criou a tarefa "Criar tela de login"'
    UNION ALL SELECT 3, 'criar_projeto', 'Usuário criou o projeto "Aplicativo Mobile"'
) AS x
WHERE NOT EXISTS (
    SELECT 1
    FROM log_sistema l
    WHERE l.id_usuario = x.id_usuario
      AND l.acao = x.acao
      AND l.descricao = x.descricao
);

-- Queries de exemplo
SELECT
    tarefas.id_tarefa,
    tarefas.titulo,
    projetos.nome_projeto,
    usuarios.nome AS responsavel,
    tarefas.prioridade_task,
    tarefas.status_task,
    tarefas.prazo
FROM tarefas
JOIN projetos ON tarefas.id_projeto = projetos.id_projeto
JOIN usuarios ON tarefas.id_responsavel = usuarios.id_usuario;

SELECT
    metas.id_meta,
    projetos.nome_projeto,
    metas.titulo_meta,
    metas.prazo_meta,
    metas.data_conclusao_meta,
    CASE
        WHEN metas.data_conclusao_meta IS NULL AND CURDATE() > metas.prazo_meta THEN DATEDIFF(CURDATE(), metas.prazo_meta)
        WHEN metas.data_conclusao_meta IS NULL THEN 0
        ELSE DATEDIFF(metas.data_conclusao_meta, metas.prazo_meta)
    END AS dias_atraso
FROM metas
JOIN projetos ON metas.id_projeto = projetos.id_projeto
ORDER BY dias_atraso DESC;
