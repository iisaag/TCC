CREATE DATABASE IF NOT EXISTS TCC
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE TCC;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- CARGOS
-- =====================================================
CREATE TABLE cargos (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    nome_cargo VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO cargos (nome_cargo) VALUES
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
('Chefe de Analise');

-- =====================================================
-- USUARIOS (COMPATÍVEL COM SEU BACK)
-- =====================================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(30),
    localizacao VARCHAR(120),
    perfil_tags TEXT,
    perfil_sobre TEXT,
    foto_perfil LONGTEXT,

    -- 🔥 VOLTOU COMO STRING PRA NÃO QUEBRAR SEU DASHBOARD
    cargo VARCHAR(100),

    nivel VARCHAR(50),
    status_atual VARCHAR(40) DEFAULT 'Ativo',
    id_equipe INT DEFAULT NULL,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cargo) REFERENCES cargos(nome_cargo)
) ENGINE=InnoDB;

-- =====================================================
-- SENHA
-- =====================================================
CREATE TABLE senha (
    email VARCHAR(150) PRIMARY KEY,
    senha VARCHAR(100) NOT NULL,
    nivel_acesso VARCHAR(50) NOT NULL,
    FOREIGN KEY (email) REFERENCES usuarios(email)
) ENGINE=InnoDB;

-- =====================================================
-- EQUIPES
-- =====================================================
CREATE TABLE equipes (
    id_equipe INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    criado_por INT,
    equipe_pai INT,
    tipo VARCHAR(50),
    id_lider INT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (criado_por) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_lider) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (equipe_pai) REFERENCES equipes(id_equipe)
) ENGINE=InnoDB;

-- =====================================================
-- PROJETOS
-- =====================================================
CREATE TABLE projetos (
    id_projeto INT AUTO_INCREMENT PRIMARY KEY,
    nome_projeto VARCHAR(150) NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    prazo_final DATE,
    status_projeto VARCHAR(50),
    prioridade_proj VARCHAR(15),
    id_responsavel INT,

    FOREIGN KEY (id_responsavel)
        REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================
-- SPRINTS
-- =====================================================
CREATE TABLE sprints (
    id_sprint INT AUTO_INCREMENT PRIMARY KEY,
    id_projeto INT,
    nome_sprint VARCHAR(120) NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    status_sprint VARCHAR(20),

    FOREIGN KEY (id_projeto)
        REFERENCES projetos(id_projeto)
) ENGINE=InnoDB;

-- =====================================================
-- TAREFAS
-- =====================================================
CREATE TABLE tarefas (
    id_tarefa INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    id_projeto INT,
    id_sprint INT NULL,
    id_responsavel INT,
    prioridade_task VARCHAR(15),
    tipo_task VARCHAR(20),
    data_inicio DATE,
    data_prevista_termino DATE,
    progresso TINYINT CHECK (progresso BETWEEN 0 AND 100),
    bloqueada BOOLEAN DEFAULT FALSE,
    prazo DATE,
    status_task VARCHAR(50),

    FOREIGN KEY (id_projeto)
        REFERENCES projetos(id_projeto),

    FOREIGN KEY (id_sprint)
        REFERENCES sprints(id_sprint),

    FOREIGN KEY (id_responsavel)
        REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================
-- HISTÓRICO
-- =====================================================
CREATE TABLE historico_progresso (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    id_tarefa INT,
    progresso INT,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT,
    FOREIGN KEY (id_tarefa) REFERENCES tarefas(id_tarefa),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================
-- LOG PROJETO
-- =====================================================
CREATE TABLE log_projeto (
    id_log_projeto INT AUTO_INCREMENT PRIMARY KEY,
    id_projeto INT,
    id_usuario INT,
    mensagem TEXT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================
-- LOG SISTEMA
-- =====================================================
CREATE TABLE log_sistema (
    id_log_sistema INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    acao VARCHAR(200),
    descricao TEXT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================
CREATE TABLE notificacoes_usuario (
    id_notificacao INT AUTO_INCREMENT PRIMARY KEY,
    id_destinatario INT,
    id_autor INT,
    tipo VARCHAR(80),
    titulo VARCHAR(180),
    mensagem TEXT,
    url VARCHAR(255),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    lida_em DATETIME NULL,

    FOREIGN KEY (id_destinatario)
        REFERENCES usuarios(id_usuario),

    FOREIGN KEY (id_autor)
        REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- =====================================================
-- SESSIONS (Laravel)
-- =====================================================
CREATE TABLE sessions (
    id VARCHAR(191) PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload LONGTEXT NOT NULL,
    last_activity INT NOT NULL,
    INDEX(user_id),
    INDEX(last_activity)
);

-- =====================================================
-- CACHE
-- =====================================================
CREATE TABLE cache (
    key VARCHAR(255) PRIMARY KEY,
    value MEDIUMTEXT NOT NULL,
    expiration INT NOT NULL
);

CREATE TABLE cache_locks (
    key VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255),
    expiration INT NOT NULL
);

-- =====================================================
-- JOBS
-- =====================================================
CREATE TABLE jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    queue VARCHAR(255),
    payload LONGTEXT,
    attempts TINYINT UNSIGNED,
    reserved_at INT NULL,
    available_at INT,
    created_at INT
);

CREATE TABLE job_batches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    total_jobs INT,
    pending_jobs INT,
    failed_jobs INT,
    failed_job_ids LONGTEXT,
    options MEDIUMTEXT,
    cancelled_at INT,
    created_at INT,
    finished_at INT
);

CREATE TABLE failed_jobs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE,
    connection TEXT,
    queue TEXT,
    payload LONGTEXT,
    exception LONGTEXT,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PASSWORD RESET
-- =====================================================
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255),
    created_at TIMESTAMP NULL
);

-- =====================================================
-- SANCTUM
-- =====================================================
CREATE TABLE personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type VARCHAR(255),
    tokenable_id BIGINT UNSIGNED,
    name VARCHAR(255),
    token VARCHAR(64) UNIQUE,
    abilities TEXT,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);


CREATE TABLE IF NOT EXISTS tarefa_usuarios_relacionados (
    id_tarefa INT NOT NULL,
    id_usuario INT NOT NULL,
    PRIMARY KEY (id_tarefa, id_usuario),

    FOREIGN KEY (id_tarefa) REFERENCES tarefas(id_tarefa)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;
-- =====================================================
-- USUARIOS (SEUS DADOS COMPLETOS)
-- =====================================================
INSERT INTO usuarios
(nome,email,telefone,localizacao,perfil_tags,perfil_sobre,foto_perfil,cargo,nivel)
VALUES
('Isabelli Arantes','belli@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Chefe de Design','Pleno'),
('Ana Clara Moreira','ana@ivyteam.com',NULL,'São Paulo, BR',NULL,NULL,NULL,'Chefe de Desenvolvimento','Pleno'),
('Isabela Rangel','bela@ivyteam.com',NULL,'Rio de Janeiro, BR',NULL,NULL,NULL,'Chefe de Analise','Pleno'),
('Bruno Costa','bruno@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Desenvolvedor','Sênior'),
('Carla Pereira','carla@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Suporte','Júnior'),
('Daniel Souza','daniel@ivyteam.com',NULL,'Belo Horizonte, BR',NULL,NULL,NULL,'Gerente','Sênior'),
('Eva Martins','eva@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Designer','Pleno'),
('Felipe Ramos','felipe@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Administrador','Pleno'),
('Gabriela Lima','gabriela@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Financeiro','Pleno'),
('Hugo Silva','hugo@ivyteam.com',NULL,NULL,NULL,NULL,NULL,'Marketing','Júnior'),
('Lucas Almeida','lucas.almeida@ivyteam.com',NULL,'São Paulo, BR',NULL,NULL,NULL,'Desenvolvedor','Pleno'),
('Mariana Santos','mariana.santos@ivyteam.com',NULL,'Recife, BR',NULL,NULL,NULL,'Desenvolvedor','Júnior'),
('Rafael Gomes','rafael.gomes@ivyteam.com',NULL,'Porto Alegre, BR',NULL,NULL,NULL,'Desenvolvedor','Sênior'),
('Tiago Rocha','tiago.rocha@ivyteam.com',NULL,'Curitiba, BR',NULL,NULL,NULL,'Desenvolvedor','Pleno'),
('Laura Pinto','laura.pinto@ivyteam.com',NULL,'Salvador, BR',NULL,NULL,NULL,'Designer','Pleno'),
('Marcos Lima','marcos.lima@ivyteam.com',NULL,'Fortaleza, BR',NULL,NULL,NULL,'Designer','Júnior'),
('Patricia Nunes','patricia.nunes@ivyteam.com',NULL,'Natal, BR',NULL,NULL,NULL,'Designer','Pleno'),
('Gustavo Fernandes','gustavo.fernandes@ivyteam.com',NULL,'Belém, BR',NULL,NULL,NULL,'Analista','Pleno'),
('Renata Costa','renata.costa@ivyteam.com',NULL,'Manaus, BR',NULL,NULL,NULL,'Analista','Júnior'),
('Bruno Mello','bruno.mello@ivyteam.com',NULL,'Belo Horizonte, BR',NULL,NULL,NULL,'Gerente','Sênior'),
('Sofia Ribeiro','sofia.ribeiro@ivyteam.com',NULL,'São Paulo, BR',NULL,NULL,NULL,'Suporte','Júnior'),
('Paulo Nunes','paulo.nunes@ivyteam.com',NULL,'Campinas, BR',NULL,NULL,NULL,'Suporte','Pleno'),
('Ricardo Santos','ricardo.santos@ivyteam.com',NULL,'Porto Alegre, BR',NULL,NULL,NULL,'Administrador','Pleno'),
('Mariana Oliveira','mariana.oliveira@ivyteam.com',NULL,'Recife, BR',NULL,NULL,NULL,'Financeiro','Pleno'),
('Igor Alves','igor.alves@ivyteam.com',NULL,'Rio de Janeiro, BR',NULL,NULL,NULL,'Marketing','Pleno'),
('Camila Duarte','camila.duarte@ivyteam.com',NULL,'Vitória, BR',NULL,NULL,NULL,'Vendas','Pleno');

-- =====================================================
-- SENHAS
-- =====================================================
INSERT INTO senha VALUES
('belli@ivyteam.com','123','adm'),
('ana@ivyteam.com','0809','adm'),
('bela@ivyteam.com','0906','adm'),
('bruno@ivyteam.com','2222','adm'),
('carla@ivyteam.com','3333','usuario'),
('daniel@ivyteam.com','4444','adm'),
('eva@ivyteam.com','5555','usuario');

-- =====================================================
-- EQUIPES
-- =====================================================
INSERT INTO equipes (nome,criado_por,tipo,id_lider) VALUES
('Equipe Design',1,'SUBEQUIPE',1),
('Equipe Backend',2,'SUBEQUIPE',2),
('Núcleo Produto',3,'EMPRESA',3);

-- =====================================================
-- PROJETOS
-- =====================================================
INSERT INTO projetos (nome_projeto,descricao,data_inicio,prazo_final,status_projeto,prioridade_proj,id_responsavel) VALUES
('Sistema de Gestao','Plataforma de controle','2026-03-10','2026-06-30','Em andamento','Alta',3),
('Aplicativo Mobile','App de tarefas','2026-04-01','2026-08-01','Planejamento','Média',2);

-- =====================================================
-- TAREFAS
-- =====================================================
INSERT INTO tarefas (titulo,descricao,id_projeto,id_responsavel,prioridade_task,tipo_task,data_inicio,data_prevista_termino,progresso,bloqueada,prazo,status_task)
SELECT
CASE
WHEN p.nome_projeto LIKE 'Sistema de Gestao' THEN 'Ajustar a base do sistema'
WHEN p.nome_projeto LIKE 'Aplicativo Mobile' THEN 'Dar o primeiro passo no app'
ELSE CONCAT('Abrir ',p.nome_projeto)
END,
CASE
WHEN p.nome_projeto LIKE 'Sistema de Gestao' THEN 'Ajustar login e permissões'
WHEN p.nome_projeto LIKE 'Aplicativo Mobile' THEN 'Criar estrutura inicial'
ELSE 'Tarefa inicial'
END,
p.id_projeto,
p.id_responsavel,
'MEDIA',
'BACK',
CURDATE(),
DATE_ADD(CURDATE(),INTERVAL 7 DAY),
50,
FALSE,
DATE_ADD(CURDATE(),INTERVAL 7 DAY),
'Em andamento'
FROM projetos p;

-- =====================================================
-- KANBAN TASKS
-- =====================================================
INSERT INTO tarefas (titulo,descricao,id_projeto,id_responsavel,prioridade_task,tipo_task,data_inicio,data_prevista_termino,progresso,bloqueada,prazo,status_task)
SELECT
CONCAT('Card ',s.status_task,' - ',p.nome_projeto),
CONCAT('Card de ',s.status_task),
p.id_projeto,
p.id_responsavel,
s.prioridade_task,
s.tipo_task,
CURDATE(),
DATE_ADD(CURDATE(),INTERVAL s.dias_previstos DAY),
s.progresso,
FALSE,
DATE_ADD(CURDATE(),INTERVAL s.dias_previstos DAY),
s.status_task
FROM projetos p
CROSS JOIN (
SELECT 'TO_DO' status_task,'MEDIA' prioridade_task,'FRONT' tipo_task,0 progresso,14 dias_previstos
UNION ALL SELECT 'DOING','ALTA','BACK',50,10
UNION ALL SELECT 'TESTE','MEDIA','FULLSTACK',75,7
UNION ALL SELECT 'APROVADO','BAIXA','FULLSTACK',100,3
) s;

-- =====================================================
-- HISTÓRICO
-- =====================================================
INSERT INTO historico_progresso (id_tarefa,progresso,id_usuario)
SELECT 1,40,1 UNION ALL
SELECT 2,20,2;

-- =====================================================
-- LOGS
-- =====================================================
INSERT INTO log_projeto (id_projeto,id_usuario,mensagem)
SELECT 1,1,'Início do projeto';

INSERT INTO log_sistema (id_usuario,acao,descricao)
SELECT 1,'login','Login realizado';

-- =====================================================
-- NOTIFICAÇÕES
-- =====================================================
INSERT INTO notificacoes_usuario (id_destinatario,id_autor,tipo,titulo,mensagem,url)
VALUES
(1,2,'tarefa','Nova tarefa','Você recebeu uma tarefa','/desempenho'),
(2,3,'projeto','Novo projeto','Você foi atribuído','/projetos');




INSERT INTO tarefas
(titulo,descricao,id_projeto,id_responsavel,prioridade_task,tipo_task,data_inicio,data_prevista_termino,progresso,bloqueada,prazo,status_task)
VALUES

-- JAN
('Planejamento inicial sistema','Definição arquitetura',1,1,'ALTA','BACK','2026-01-05','2026-01-20',100,FALSE,'2026-01-20','APROVADO'),
('Wireframe app','Protótipo mobile',2,2,'MEDIA','FRONT','2026-01-10','2026-01-25',90,FALSE,'2026-01-25','TESTE'),

-- FEV
('API login','Autenticação sistema',1,4,'ALTA','BACK','2026-02-01','2026-02-20',100,FALSE,'2026-02-20','APROVADO'),
('UI dashboard','Interface principal',2,6,'MEDIA','FRONT','2026-02-05','2026-02-25',70,FALSE,'2026-02-25','DOING'),

-- MAR
('Módulo usuários','CRUD completo',1,2,'ALTA','BACK','2026-03-01','2026-03-25',80,FALSE,'2026-03-25','DOING'),
('Tela tarefas','Lista e filtros',2,3,'MEDIA','FRONT','2026-03-05','2026-03-28',60,FALSE,'2026-03-28','DOING'),

-- ABR
('Sistema permissões','Roles e acessos',1,5,'ALTA','BACK','2026-04-01','2026-04-20',100,FALSE,'2026-04-20','APROVADO'),
('Notificações push','Alertas app',2,7,'MEDIA','FULLSTACK','2026-04-10','2026-04-30',50,FALSE,'2026-04-30','DOING'),

-- MAI
('Relatórios sistema','Dashboards KPI',1,8,'ALTA','BACK','2026-05-01','2026-05-25',90,FALSE,'2026-05-25','TESTE'),
('Performance app','otimização mobile',2,9,'MEDIA','FRONT','2026-05-05','2026-05-28',70,FALSE,'2026-05-28','DOING'),

-- JUN
('Integração banco','API completa',1,10,'ALTA','BACK','2026-06-01','2026-06-20',100,FALSE,'2026-06-20','APROVADO'),
('Chat interno','Comunicação equipe',2,11,'MEDIA','FULLSTACK','2026-06-10','2026-06-30',80,FALSE,'2026-06-30','DOING'),

-- JUL
('Segurança avançada','Hardening sistema',1,12,'ALTA','BACK','2026-07-01','2026-07-20',95,FALSE,'2026-07-20','TESTE'),
('UX mobile','melhoria experiência',2,13,'MEDIA','FRONT','2026-07-05','2026-07-28',60,FALSE,'2026-07-28','DOING'),

-- AGO
('Logs sistema','Auditoria completa',1,14,'ALTA','BACK','2026-08-01','2026-08-25',100,FALSE,'2026-08-25','APROVADO'),
('Push notifications','alertas avançados',2,15,'MEDIA','FULLSTACK','2026-08-10','2026-08-30',70,FALSE,'2026-08-30','DOING'),

-- SET
('Backup automático','infraestrutura',1,16,'ALTA','BACK','2026-09-01','2026-09-20',85,FALSE,'2026-09-20','TESTE'),
('Tela relatórios app','analytics mobile',2,17,'MEDIA','FRONT','2026-09-05','2026-09-28',60,FALSE,'2026-09-28','DOING'),

-- OUT
('Refatoração geral','limpeza código',1,18,'ALTA','BACK','2026-10-01','2026-10-25',70,FALSE,'2026-10-25','DOING'),
('Melhoria UI','design system',2,19,'MEDIA','FRONT','2026-10-05','2026-10-28',80,FALSE,'2026-10-28','DOING'),

-- NOV
('Testes finais','QA completo',1,20,'ALTA','BACK','2026-11-01','2026-11-20',90,FALSE,'2026-11-20','TESTE'),
('Performance final','otimização geral',2,21,'MEDIA','FULLSTACK','2026-11-05','2026-11-28',85,FALSE,'2026-11-28','DOING'),

-- DEZ
('Deploy final','produção sistema',1,22,'ALTA','BACK','2026-12-01','2026-12-15',100,FALSE,'2026-12-15','APROVADO'),
('Release app','publicação store',2,23,'MEDIA','FULLSTACK','2026-12-10','2026-12-28',100,FALSE,'2026-12-28','APROVADO');

INSERT INTO historico_progresso (id_tarefa, progresso, id_usuario, data_atualizacao)
SELECT id_tarefa, progresso, id_responsavel, DATE_ADD(data_inicio, INTERVAL 5 DAY)
FROM tarefas;

INSERT INTO log_projeto (id_projeto,id_usuario,mensagem)
SELECT id_projeto,id_responsavel,CONCAT('Atualização mensal projeto ',nome_projeto)
FROM projetos;
INSERT INTO log_sistema (id_usuario,acao,descricao)
SELECT id_responsavel,'update','Atualização de tarefa no sistema'
FROM tarefas;

ALTER TABLE tarefas 
ADD COLUMN  created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE historico_progresso 
ADD COLUMN  created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

SET SQL_SAFE_UPDATES = 0;

UPDATE tarefas
SET created_at = COALESCE(created_at, data_inicio);

UPDATE historico_progresso
SET created_at = COALESCE(created_at, data_atualizacao, NOW());


UPDATE tarefas
SET created_at = data_inicio
WHERE created_at IS NULL;
SET SQL_SAFE_UPDATES = 1;

SELECT 
    DATE_FORMAT(COALESCE(created_at, data_inicio), '%Y-%m') AS mes,
    COUNT(*) AS total_tarefas,
    SUM(CASE WHEN status_task = 'APROVADO' THEN 1 ELSE 0 END) AS concluidas,
    AVG(progresso) AS media_progresso
FROM tarefas
GROUP BY mes
ORDER BY mes ASC;