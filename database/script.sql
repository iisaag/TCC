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
senha VARCHAR(255) NOT NULL,
cargo VARCHAR(100),
nivel VARCHAR(50),
data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

FOREIGN KEY (cargo) REFERENCES cargos(nome_cargo)
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
INSERT INTO usuarios (nome, email, senha, cargo, nivel, data_criacao)
VALUES
('Isabelli', 'belli@email.com', '123', 'Designer', 'Pleno', NOW()),
('Ana Clara', 'ana@email.com', '123', 'Desenvolvedora', 'Pleno', NOW()),
('Isabela', 'bela@email.com', '123', 'Analista', 'Pleno', NOW());

# PROJETOS
INSERT INTO projetos (nome_projeto, descricao, data_inicio, prazo_final, status_projeto, prioridade_proj)
VALUES
('Sistema de Gestão', 'Plataforma para gerenciar projetos', '2026-03-10', '2026-06-30', 'Em andamento', 'Alta'),
('Aplicativo Mobile', 'App para controle de tarefas', '2026-04-01', '2026-08-01', 'Planejamento', 'Média');

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