<?php
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../models/logProjeto.php';

class logProjetoDAO
{
    public function create(logProjeto $log): logProjeto
    {
        $query = 'INSERT INTO log_projeto (
                    id_projeto,
                    id_usuario,
                    mensagem
                ) VALUES (
                    :id_projeto,
                    :id_usuario,
                    :mensagem
                )';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_projeto', $log->getIdProjeto(), PDO::PARAM_INT);
        $statement->bindValue(':id_usuario', $log->getIdUsuario(), PDO::PARAM_INT);
        $statement->bindValue(':mensagem',   $log->getMensagem(),  PDO::PARAM_STR);
        $statement->execute();

        $log->setIdLogProjeto((int) Database::getConnection()->lastInsertId());
        return $log;
    }

    public function readAll(): array
    {
        $query = 'SELECT * FROM log_projeto ORDER BY data_hora DESC';
        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = new logProjeto(
                $linha->id_log_projeto,
                $linha->id_projeto,
                $linha->id_usuario,
                $linha->mensagem,
                $linha->data_hora
            );
        }
        return $resultados;
    }

    public function readById(int $id): ?logProjeto
    {
        $query = 'SELECT * FROM log_projeto WHERE id_log_projeto = :id LIMIT 1';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) return null;

        return new logProjeto(
            $linha->id_log_projeto,
            $linha->id_projeto,
            $linha->id_usuario,
            $linha->mensagem,
            $linha->data_hora
        );
    }

    public function readByProjetoId(int $projetoId): array
    {
        $query = 'SELECT * FROM log_projeto WHERE id_projeto = :id_projeto ORDER BY data_hora DESC';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_projeto', $projetoId, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = new logProjeto(
                $linha->id_log_projeto,
                $linha->id_projeto,
                $linha->id_usuario,
                $linha->mensagem,
                $linha->data_hora
            );
        }
        return $resultados;
    }

    public function readByUsuarioId(int $usuarioId): array
    {
        $query = 'SELECT * FROM log_projeto WHERE id_usuario = :id_usuario ORDER BY data_hora DESC';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $usuarioId, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = new logProjeto(
                $linha->id_log_projeto,
                $linha->id_projeto,
                $linha->id_usuario,
                $linha->mensagem,
                $linha->data_hora
            );
        }
        return $resultados;
    }

    public function delete(int $id): bool
    {
        $query = 'DELETE FROM log_projeto WHERE id_log_projeto = :id';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        return $statement->rowCount() > 0;
    }

    public function totalLogsPorProjeto(): array
    {
        $query = 'SELECT id_projeto, COUNT(*) AS total FROM log_projeto GROUP BY id_projeto';
        $statement = Database::getConnection()->query($query);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}