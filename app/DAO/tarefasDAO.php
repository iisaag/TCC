<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/tarefas.php';
require_once __DIR__ . '/../models/projetos.php';
require_once __DIR__ . '/../models/usuarios.php';
require_once __DIR__ . '/../Database.php';

class tarefasDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(tarefas $tarefa): tarefas
    {
        $id = $tarefa->getIdTarefa();
        return isset($id) ? $this->createWithId($tarefa) : $this->createWithoutId($tarefa);
    }

    private function createWithoutId(tarefas $tarefa): tarefas
    {
        $query = 'INSERT INTO tarefas (
                    titulo, descricao, id_projeto,
                    id_responsavel, prioridade_task, prazo, status_task
                ) VALUES (
                    :titulo, :descricao, :id_projeto,
                    :id_responsavel, :prioridade_task, :prazo, :status_task
                )';

        $statement = Database::getConnection()->prepare($query);
        $this->bindCommon($statement, $tarefa);
        $statement->execute();

        $tarefa->setIdTarefa((int) Database::getConnection()->lastInsertId());
        return $tarefa;
    }

    private function createWithId(tarefas $tarefa): tarefas
    {
        $query = 'INSERT INTO tarefas (
                    id_tarefa, titulo, descricao, id_projeto,
                    id_responsavel, prioridade_task, prazo, status_task
                ) VALUES (
                    :id_tarefa, :titulo, :descricao, :id_projeto,
                    :id_responsavel, :prioridade_task, :prazo, :status_task
                )';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_tarefa', $tarefa->getIdTarefa(), PDO::PARAM_INT);
        $this->bindCommon($statement, $tarefa);
        $statement->execute();

        return $tarefa;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $statement = Database::getConnection()->query(
            $this->baseQuery() . ' ORDER BY t.prazo ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?tarefas
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE t.id_tarefa = :id LIMIT 1'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->hydrate($linha) : null;
    }

    public function readByProjeto(int $idProjeto): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE t.id_projeto = :id ORDER BY t.prazo ASC'
        );
        $statement->bindValue(':id', $idProjeto, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByResponsavel(int $idUsuario): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE t.id_responsavel = :id ORDER BY t.prazo ASC'
        );
        $statement->bindValue(':id', $idUsuario, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByStatus(string $status): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE LOWER(t.status_task) = LOWER(:status) ORDER BY t.prazo ASC'
        );
        $statement->bindValue(':status', $status, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByPrioridade(string $prioridade): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE UPPER(t.prioridade_task) = UPPER(:prioridade) ORDER BY t.prazo ASC'
        );
        $statement->bindValue(':prioridade', $prioridade, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByTitulo(string $titulo): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE LOWER(t.titulo) LIKE LOWER(:titulo) ORDER BY t.titulo ASC'
        );
        $statement->bindValue(':titulo', "%{$titulo}%", PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByProjetoEResponsavel(int $idProjeto, int $idResponsavel): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . '
            WHERE t.id_projeto = :id_projeto
              AND t.id_responsavel = :id_responsavel
            ORDER BY t.prazo ASC'
        );
        $statement->bindValue(':id_projeto',     $idProjeto,     PDO::PARAM_INT);
        $statement->bindValue(':id_responsavel', $idResponsavel, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readAtrasadas(): array
    {
        $statement = Database::getConnection()->query(
            $this->baseQuery() . "
            WHERE t.prazo < CURDATE()
              AND (t.status_task IS NULL OR t.status_task NOT IN ('Concluída', 'Cancelada'))
            ORDER BY t.prazo ASC"
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readSemResponsavel(): array
    {
        $statement = Database::getConnection()->query(
            $this->baseQuery() . ' WHERE t.id_responsavel IS NULL ORDER BY t.prazo ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ UPDATE
    public function update(tarefas $tarefa): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE tarefas SET
                titulo          = :titulo,
                descricao       = :descricao,
                id_projeto      = :id_projeto,
                id_responsavel  = :id_responsavel,
                prioridade_task = :prioridade_task,
                prazo           = :prazo,
                status_task     = :status_task
             WHERE id_tarefa = :id_tarefa'
        );
        $statement->bindValue(':id_tarefa', $tarefa->getIdTarefa(), PDO::PARAM_INT);
        $this->bindCommon($statement, $tarefa);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function atualizarStatus(int $id, string $status): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE tarefas SET status_task = :status WHERE id_tarefa = :id'
        );
        $statement->bindValue(':status', $status, PDO::PARAM_STR);
        $statement->bindValue(':id',     $id,     PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function atribuirResponsavel(int $idTarefa, int $idUsuario): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE tarefas SET id_responsavel = :id_responsavel WHERE id_tarefa = :id_tarefa'
        );
        $statement->bindValue(':id_responsavel', $idUsuario, PDO::PARAM_INT);
        $statement->bindValue(':id_tarefa',      $idTarefa,  PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(int $id): bool
    {
        $statement = Database::getConnection()->prepare(
            'DELETE FROM tarefas WHERE id_tarefa = :id'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ STATS
    public function totalTarefasPorStatus(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT status_task, COUNT(*) AS total FROM tarefas GROUP BY status_task ORDER BY total DESC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = ['status_task' => $linha->status_task, 'total' => $linha->total];
        }
        return $resultados;
    }

    public function totalTarefasPorProjeto(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT p.id_projeto, p.nome_projeto, COUNT(t.id_tarefa) AS total
             FROM projetos p
             LEFT JOIN tarefas t ON t.id_projeto = p.id_projeto
             GROUP BY p.id_projeto, p.nome_projeto
             ORDER BY p.nome_projeto ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = [
                'id_projeto'   => $linha->id_projeto,
                'nome_projeto' => $linha->nome_projeto,
                'total'        => $linha->total,
            ];
        }
        return $resultados;
    }

    public function totalTarefasPorResponsavel(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT u.id_usuario, u.nome, COUNT(t.id_tarefa) AS total
             FROM usuarios u
             LEFT JOIN tarefas t ON t.id_responsavel = u.id_usuario
             GROUP BY u.id_usuario, u.nome
             ORDER BY u.nome ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = [
                'id_usuario' => $linha->id_usuario,
                'nome'       => $linha->nome,
                'total'      => $linha->total,
            ];
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ HELPERS
    private function baseQuery(): string
    {
        return '
        SELECT
            t.id_tarefa,
            t.titulo,
            t.descricao,
            t.prioridade_task,
            t.prazo,
            t.status_task,
            p.id_projeto,
            p.nome_projeto,
            p.status_projeto,
            p.prioridade_proj,
            u.id_usuario      AS id_responsavel,
            u.nome            AS responsavel_nome,
            u.email           AS responsavel_email,
            u.foto_perfil     AS responsavel_foto
        FROM tarefas t
        LEFT JOIN projetos p ON t.id_projeto     = p.id_projeto
        LEFT JOIN usuarios u ON t.id_responsavel = u.id_usuario';
    }

    private function hydrate(object $linha): tarefas
    {
        $projeto = null;
        if (!empty($linha->id_projeto)) {
            $projeto = new projetos(
                id_projeto:      $linha->id_projeto,
                nome_projeto:    $linha->nome_projeto    ?? '',
                descricao:       null,
                data_inicio:     null,
                prazo_final:     null,
                status_projeto:  $linha->status_projeto  ?? null,
                prioridade_proj: $linha->prioridade_proj ?? null
            );
        }

        $responsavel = null;
    if (!empty($linha->id_responsavel)) {
        $responsavel = new usuarios(
            id_usuario:   $linha->id_responsavel,
            nome:         $linha->responsavel_nome  ?? '',
            email:        $linha->responsavel_email ?? '',
            foto_perfil:  $linha->responsavel_foto  ?? null,
            cargo:        new cargos(),
            nivel:        null,
            data_criacao: null
        );
    }

        return new tarefas(
            id_tarefa:       $linha->id_tarefa,
            titulo:          $linha->titulo,
            descricao:       $linha->descricao       ?? null,
            projeto:         $projeto,
            responsavel:     $responsavel,
            prioridade_task: $linha->prioridade_task ?? null,
            prazo:           $linha->prazo           ?? null,
            status_task:     $linha->status_task     ?? null
        );
    }

    private function bindCommon(PDOStatement $statement, tarefas $tarefa): void
    {
        $statement->bindValue(':titulo',          $tarefa->getTitulo(),         PDO::PARAM_STR);
        $statement->bindValue(':descricao',       $tarefa->getDescricao(),      PDO::PARAM_STR);
        $statement->bindValue(':prioridade_task', $tarefa->getPrioridadeTask(), PDO::PARAM_STR);
        $statement->bindValue(':prazo',           $tarefa->getPrazo(),          PDO::PARAM_STR);
        $statement->bindValue(':status_task',     $tarefa->getStatusTask(),     PDO::PARAM_STR);

        $idProjeto = $tarefa->getProjeto()?->getIdProjeto();
        $statement->bindValue(':id_projeto', $idProjeto, $idProjeto === null ? PDO::PARAM_NULL : PDO::PARAM_INT);

        $idResp = $tarefa->getResponsavel()?->getIdUsuario();
        $statement->bindValue(':id_responsavel', $idResp, $idResp === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    }
}