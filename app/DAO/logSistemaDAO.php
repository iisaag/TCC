<?php
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../models/logSistema.php';

class logSistemaDAO
{
    public function create(logSistema $log): logSistema
    {
        $query = 'INSERT INTO log_sistema (
                    id_usuario,
                    acao,
                    descricao
                ) VALUES (
                    :id_usuario,
                    :acao,
                    :descricao
                )';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $log->getIdUsuario(), PDO::PARAM_INT);
        $statement->bindValue(':acao',       $log->getAcao(),      PDO::PARAM_STR);
        $statement->bindValue(':descricao',  $log->getDescricao(), PDO::PARAM_STR);
        $statement->execute();

        $log->setIdLogSistema((int) Database::getConnection()->lastInsertId());
        return $log;
    }

    public function readAll(): array
    {
        $query = 'SELECT * FROM log_sistema ORDER BY data_hora DESC';
        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?logSistema
    {
        $query = 'SELECT * FROM log_sistema WHERE id_log_sistema = :id LIMIT 1';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) return null;

        return $this->mapear($linha);
    }

    public function readByUsuarioId(int $usuarioId): array
    {
        $query = 'SELECT * FROM log_sistema WHERE id_usuario = :id_usuario ORDER BY data_hora DESC';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $usuarioId, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readByAcao(string $acao): array
    {
        $query = 'SELECT * FROM log_sistema WHERE acao = :acao ORDER BY data_hora DESC';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':acao', $acao, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function delete(int $id): bool
    {
        $query = 'DELETE FROM log_sistema WHERE id_log_sistema = :id';
        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();
        return $statement->rowCount() > 0;
    }

    public function totalLogsPorUsuario(): array
    {
        $query = 'SELECT id_usuario, COUNT(*) AS total FROM log_sistema GROUP BY id_usuario';
        $statement = Database::getConnection()->query($query);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public function totalLogsPorAcao(): array
    {
        $query = 'SELECT acao, COUNT(*) AS total FROM log_sistema GROUP BY acao ORDER BY total DESC';
        $statement = Database::getConnection()->query($query);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    private function mapear(object $linha): logSistema
    {
        return new logSistema(
            $linha->id_log_sistema,
            $linha->id_usuario,
            $linha->acao,
            $linha->descricao,
            $linha->data_hora
        );
    }
}