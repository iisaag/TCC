create database TCC;
use tcc;

# TABELA CARGOS
CREATE TABLE cargos (
id_cargo INT AUTO_INCREMENT PRIMARY KEY,
nome_cargo VARCHAR(100) NOT NULL UNIQUE
);


# TABELA USUARIOS
CREATE TABLE usuarios (
id_usuario INT AUTO_INCREMENT PRIMARY KEY,
nome VARCHAR(100) NOT NULL,
email VARCHAR(150) NOT NULL UNIQUE,
foto_perfil VARCHAR(255),
cargo VARCHAR(100),
nivel VARCHAR(50),
data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (cargo) REFERENCES cargos(nome_cargo)
);

# TABELA SENHA
CREATE TABLE senha (
email VARCHAR(150) PRIMARY KEY,
senha VARCHAR(100) NOT NULL,
nivel_acesso VARCHAR(50) NOT NULL,
FOREIGN KEY (email) REFERENCES usuarios(email)
);


#TABELA EQUIPE
CREATE TABLE equipes (
    id_equipe INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    
    criado_por INT NOT NULL, -- usuário dono
    equipe_pai INT DEFAULT NULL, -- NULL = equipe principal
    tipo VARCHAR(50) DEFAULT 'SUBEQUIPE', -- 'EMPRESA' ou 'SUBEQUIPE'
    
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (criado_por) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (equipe_pai) REFERENCES equipes(id_equipe)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

# TABELA PROJETOS
CREATE TABLE projetos (
id_projeto INT AUTO_INCREMENT PRIMARY KEY,
nome_projeto VARCHAR(150) NOT NULL,
descricao TEXT,
data_inicio DATE,
prazo_final DATE,
status_projeto VARCHAR(50),
prioridade_proj VARCHAR(15)
);

# TABELA METAS
CREATE TABLE metas (
id_meta INT AUTO_INCREMENT PRIMARY KEY,
id_projeto INT NOT NULL,
titulo_meta VARCHAR(150) NOT NULL,
prazo_meta DATE NOT NULL,
data_conclusao_meta DATE,
status_meta VARCHAR(50) DEFAULT 'Pendente',

FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto)
);

# TABELA TAREFAS
CREATE TABLE tarefas (
id_tarefa INT AUTO_INCREMENT PRIMARY KEY,
titulo VARCHAR(150) NOT NULL,
descricao TEXT,
id_projeto INT,
id_responsavel INT,
prioridade_task VARCHAR(15),
prazo DATE,
status_task VARCHAR(50),

FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto),
FOREIGN KEY (id_responsavel) REFERENCES usuarios(id_usuario)
);

# TABELA HISTORICO
CREATE TABLE historico_progresso (
id_historico INT AUTO_INCREMENT PRIMARY KEY,
id_tarefa INT,
progresso INT,
data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
id_usuario INT,

FOREIGN KEY (id_tarefa) REFERENCES tarefas(id_tarefa),
FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

# TABELA LOG PROJETOS
CREATE TABLE log_projeto (
id_log_projeto INT AUTO_INCREMENT PRIMARY KEY,
id_projeto INT,
id_usuario INT,
mensagem TEXT,
data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (id_projeto) REFERENCES projetos(id_projeto),
FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

# TABELA LOG SISTEMA
CREATE TABLE log_sistema (
id_log_sistema INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT,
acao VARCHAR(200),
descricao TEXT,
data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
    
    #TESTES
    
# CARGOS
INSERT INTO cargos (nome_cargo)
VALUES
('Designer'),
('Desenvolvedora'),
('Analista');

# USUARIOS
INSERT INTO usuarios (nome, email, foto_perfil, cargo, nivel, data_criacao)
VALUES
('Isabelli', 'belli@email.com', 'uploads/perfis/isabelli.jpg', 'Designer', 'Pleno', NOW()),
('Ana Clara', 'ana@email.com', 'uploads/perfis/anaclara.jpg', 'Desenvolvedora', 'Pleno', NOW()),
('Isabela', 'bela@email.com', NULL, 'Analista', 'Pleno', NOW());

INSERT INTO senha (email, senha, nivel_acesso)
VALUES ('belli@email.com', '123', 'Pleno');

# PROJETOS
INSERT INTO projetos (nome_projeto, descricao, data_inicio, prazo_final, status_projeto, prioridade_proj)
VALUES
('Sistema de Gestão', 'Plataforma para gerenciar projetos', '2026-03-10', '2026-06-30', 'Em andamento', 'Alta'),
('Aplicativo Mobile', 'App para controle de tarefas', '2026-04-01', '2026-08-01', 'Planejamento', 'Média');

# METAS
INSERT INTO metas (id_projeto, titulo_meta, prazo_meta, data_conclusao_meta, status_meta)
VALUES
(1, 'Finalizar login e permissões', '2026-03-31', '2026-04-03', 'Concluída'),
(1, 'Entregar dashboard principal', '2026-04-20', NULL, 'Em andamento'),
(2, 'Aprovar protótipo navegável', '2026-04-18', '2026-04-17', 'Concluída');

# TAREFAS
INSERT INTO tarefas (titulo, descricao, id_projeto, id_responsavel, prioridade_task, prazo, status_task)
VALUES
('Criar tela de login', 'Desenvolver tela inicial de autenticação', 1, 2, 'Alta', '2026-03-20', 'Em andamento'),
('Criar layout do dashboard', 'Design da tela principal do sistema', 1, 1, 'Média', '2026-03-25', 'Pendente'),
('Modelar banco de dados', 'Criar estrutura inicial do banco', 2, 3, 'Alta', '2026-04-10', 'Pendente');

# HISTORICO DE PROGRESSO
INSERT INTO historico_progresso (id_tarefa, progresso, data_atualizacao, id_usuario)
VALUES
(1, 40, NOW(), 2),
(2, 20, NOW(), 1),
(3, 10, NOW(), 3);

# LOG PROJETO
INSERT INTO log_projeto (id_projeto, id_usuario, mensagem, data_hora)
VALUES
(1, 2, 'Usuário iniciou desenvolvimento da tela de login', NOW()),
(1, 1, 'Designer começou o layout do dashboard', NOW()),
(2, 3, 'Analista iniciou modelagem do banco de dados', NOW());

# LOG SISTEMA
INSERT INTO log_sistema (id_usuario, acao, descricao, data_hora)
VALUES
(1, 'login', 'Usuário realizou login no sistema', NOW()),
(2, 'criar_tarefa', 'Usuário criou a tarefa "Criar tela de login"', NOW()),
(3, 'criar_projeto', 'Usuário criou o projeto "Aplicativo Mobile"', NOW());

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
