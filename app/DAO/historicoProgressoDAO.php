<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/historicoProgresso.php';
require_once __DIR__ . '/../models/tarefas.php';
require_once __DIR__ . '/../models/usuarios.php';
require_once __DIR__ . '/../models/cargos.php';
require_once __DIR__ . '/../Database.php';

class historicoProgressoDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(historicoProgresso $historico): historicoProgresso
    {
        $query = 'INSERT INTO historico_progresso (id_tarefa, progresso, id_usuario)
                  VALUES (:id_tarefa, :progresso, :id_usuario)';

        $statement = Database::getConnection()->prepare($query);
        $this->bindCommon($statement, $historico);
        $statement->execute();

        $historico->setIdHistorico((int) Database::getConnection()->lastInsertId());
        return $historico;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $statement = Database::getConnection()->query(
            $this->baseQuery() . ' ORDER BY h.data_atualizacao DESC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?historicoProgresso
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE h.id_historico = :id LIMIT 1'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->hydrate($linha) : null;
    }

    public function readByTarefa(int $idTarefa): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE h.id_tarefa = :id ORDER BY h.data_atualizacao DESC'
        );
        $statement->bindValue(':id', $idTarefa, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByUsuario(int $idUsuario): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE h.id_usuario = :id ORDER BY h.data_atualizacao DESC'
        );
        $statement->bindValue(':id', $idUsuario, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByTarefaEUsuario(int $idTarefa, int $idUsuario): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . '
            WHERE h.id_tarefa = :id_tarefa AND h.id_usuario = :id_usuario
            ORDER BY h.data_atualizacao DESC'
        );
        $statement->bindValue(':id_tarefa',  $idTarefa,  PDO::PARAM_INT);
        $statement->bindValue(':id_usuario', $idUsuario, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByPeriodo(string $dataInicio, string $dataFim): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . '
            WHERE h.data_atualizacao BETWEEN :data_inicio AND :data_fim
            ORDER BY h.data_atualizacao DESC'
        );
        $statement->bindValue(':data_inicio', $dataInicio, PDO::PARAM_STR);
        $statement->bindValue(':data_fim',    $dataFim,    PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readUltimoByTarefa(int $idTarefa): ?historicoProgresso
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE h.id_tarefa = :id ORDER BY h.data_atualizacao DESC LIMIT 1'
        );
        $statement->bindValue(':id', $idTarefa, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->hydrate($linha) : null;
    }

    public function readByProgressoMinimo(int $progressoMinimo): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE h.progresso >= :progresso ORDER BY h.data_atualizacao DESC'
        );
        $statement->bindValue(':progresso', $progressoMinimo, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(int $id): bool
    {
        $statement = Database::getConnection()->prepare(
            'DELETE FROM historico_progresso WHERE id_historico = :id'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ STATS
    public function totalRegistrosPorTarefa(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT t.id_tarefa, t.titulo, COUNT(h.id_historico) AS total
             FROM tarefas t
             LEFT JOIN historico_progresso h ON h.id_tarefa = t.id_tarefa
             GROUP BY t.id_tarefa, t.titulo
             ORDER BY t.titulo ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = ['id_tarefa' => $linha->id_tarefa, 'titulo' => $linha->titulo, 'total' => $linha->total];
        }
        return $resultados;
    }

    public function totalRegistrosPorUsuario(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT u.id_usuario, u.nome, COUNT(h.id_historico) AS total
             FROM usuarios u
             LEFT JOIN historico_progresso h ON h.id_usuario = u.id_usuario
             GROUP BY u.id_usuario, u.nome
             ORDER BY u.nome ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = ['id_usuario' => $linha->id_usuario, 'nome' => $linha->nome, 'total' => $linha->total];
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ HELPERS
    private function baseQuery(): string
    {
        return '
        SELECT
            h.id_historico,
            h.progresso,
            h.data_atualizacao,
            t.id_tarefa,
            t.titulo          AS tarefa_titulo,
            t.prioridade_task AS tarefa_prioridade,
            t.prazo           AS tarefa_prazo,
            t.status_task     AS tarefa_status,
            u.id_usuario,
            u.nome            AS usuario_nome,
            u.email           AS usuario_email,
            u.foto_perfil     AS usuario_foto
        FROM historico_progresso h
        LEFT JOIN tarefas  t ON h.id_tarefa  = t.id_tarefa
        LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario';
    }

    private function hydrate(object $linha): historicoProgresso
    {
        $tarefa = null;
        if (!empty($linha->id_tarefa)) {
            $tarefa = new tarefas(
                id_tarefa:       $linha->id_tarefa,
                titulo:          $linha->tarefa_titulo     ?? '',
                descricao:       null,
                projeto:         null,
                responsavel:     null,
                prioridade_task: $linha->tarefa_prioridade ?? null,
                prazo:           $linha->tarefa_prazo      ?? null,
                status_task:     $linha->tarefa_status     ?? null
            );
        }

        $usuario = null;
        if (!empty($linha->id_usuario)) {
            $usuario = new usuarios(
                id_usuario:   $linha->id_usuario,
                nome:         $linha->usuario_nome  ?? '',
                email:        $linha->usuario_email ?? '',
                foto_perfil:  $linha->usuario_foto  ?? null,
                cargo:        new cargos(),
                nivel:        null,
                data_criacao: null
            );
        }

        return new historicoProgresso(
            id_historico:     $linha->id_historico,
            tarefa:           $tarefa,
            progresso:        $linha->progresso        ?? null,
            data_atualizacao: $linha->data_atualizacao ?? null,
            usuario:          $usuario
        );
    }

    private function bindCommon(PDOStatement $statement, historicoProgresso $historico): void
    {
        $idTarefa = $historico->getTarefa()?->getIdTarefa();
        $statement->bindValue(':id_tarefa', $idTarefa, $idTarefa === null ? PDO::PARAM_NULL : PDO::PARAM_INT);

        $statement->bindValue(':progresso', $historico->getProgresso(), PDO::PARAM_INT);

        $idUsuario = $historico->getUsuario()?->getIdUsuario();
        $statement->bindValue(':id_usuario', $idUsuario, $idUsuario === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
    }
}