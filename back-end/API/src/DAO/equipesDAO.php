<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/equipes.php';
require_once __DIR__ . '/../DB/Database.php';

class equipesDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(equipes $equipe): equipes
    {
        $id = $equipe->getIdEquipe();
        return isset($id) ? $this->createWithId($equipe) : $this->createWithoutId($equipe);
    }

    private function createWithoutId(equipes $equipe): equipes
    {
        $query = 'INSERT INTO equipes (
                    nome,
                    criado_por,
                    equipe_pai,
                    tipo
                ) VALUES (
                    :nome,
                    :criado_por,
                    :equipe_pai,
                    :tipo
                )';

        $statement = Database::getConnection()->prepare($query);
        $this->bindCommon($statement, $equipe);
        $statement->execute();

        $equipe->setIdEquipe((int) Database::getConnection()->lastInsertId());
        return $equipe;
    }

    private function createWithId(equipes $equipe): equipes
    {
        $query = 'INSERT INTO equipes (
                    id_equipe,
                    nome,
                    criado_por,
                    equipe_pai,
                    tipo
                ) VALUES (
                    :id_equipe,
                    :nome,
                    :criado_por,
                    :equipe_pai,
                    :tipo
                )';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_equipe', $equipe->getIdEquipe(), PDO::PARAM_INT);
        $this->bindCommon($statement, $equipe);
        $statement->execute();

        return $equipe;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                pai.nome AS nome_equipe_pai
            FROM equipes e
            LEFT JOIN equipes pai ON e.equipe_pai = pai.id_equipe
            ORDER BY e.tipo ASC, e.nome ASC
        ";

        $statement = Database::getConnection()->query($query);
        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?equipes
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                pai.nome AS nome_equipe_pai
            FROM equipes e
            LEFT JOIN equipes pai ON e.equipe_pai = pai.id_equipe
            WHERE e.id_equipe = :id
            LIMIT 1
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->mapear($linha) : null;
    }

    public function readByNome(string $nome): array
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                pai.nome AS nome_equipe_pai
            FROM equipes e
            LEFT JOIN equipes pai ON e.equipe_pai = pai.id_equipe
            WHERE LOWER(e.nome) LIKE LOWER(:nome)
            ORDER BY e.nome ASC
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nome', "%{$nome}%", PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    // retorna apenas equipes raiz (sem pai)
    public function readPrincipais(): array
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                NULL AS nome_equipe_pai
            FROM equipes e
            WHERE e.equipe_pai IS NULL
            ORDER BY e.nome ASC
        ";

        $statement = Database::getConnection()->query($query);
        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    // retorna subequipes diretas de uma equipe pai
    public function readSubequipes(int $equipePaiId): array
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                pai.nome AS nome_equipe_pai
            FROM equipes e
            LEFT JOIN equipes pai ON e.equipe_pai = pai.id_equipe
            WHERE e.equipe_pai = :equipe_pai
            ORDER BY e.nome ASC
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':equipe_pai', $equipePaiId, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readByCriadoPor(int $usuarioId): array
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                pai.nome AS nome_equipe_pai
            FROM equipes e
            LEFT JOIN equipes pai ON e.equipe_pai = pai.id_equipe
            WHERE e.criado_por = :criado_por
            ORDER BY e.nome ASC
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':criado_por', $usuarioId, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readByTipo(string $tipo): array
    {
        $query = "
            SELECT
                e.id_equipe,
                e.nome,
                e.criado_por,
                e.equipe_pai,
                e.tipo,
                e.data_criacao,
                pai.nome AS nome_equipe_pai
            FROM equipes e
            LEFT JOIN equipes pai ON e.equipe_pai = pai.id_equipe
            WHERE UPPER(e.tipo) = UPPER(:tipo)
            ORDER BY e.nome ASC
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':tipo', $tipo, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ UPDATE
    public function update(equipes $equipe): bool
    {
        $query = 'UPDATE equipes
                  SET nome       = :nome,
                      criado_por = :criado_por,
                      equipe_pai = :equipe_pai,
                      tipo       = :tipo
                  WHERE id_equipe = :id_equipe';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_equipe', $equipe->getIdEquipe(), PDO::PARAM_INT);
        $this->bindCommon($statement, $equipe);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(int $id): bool
    {
        $query = 'DELETE FROM equipes WHERE id_equipe = :id';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ STATS
    public function totalSubequipesPorEquipe(): array
    {
        $query = "
            SELECT
                pai.id_equipe,
                pai.nome AS nome_equipe,
                COUNT(sub.id_equipe) AS total_subequipes
            FROM equipes pai
            LEFT JOIN equipes sub ON sub.equipe_pai = pai.id_equipe
            WHERE pai.equipe_pai IS NULL
            GROUP BY pai.id_equipe, pai.nome
            ORDER BY pai.nome ASC
        ";

        $statement = Database::getConnection()->query($query);
        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = [
                'id_equipe'         => $linha->id_equipe,
                'nome_equipe'       => $linha->nome_equipe,
                'total_subequipes'  => $linha->total_subequipes,
            ];
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ HELPERS
    private function mapear(object $linha): equipes
    {
        return new equipes(
            id_equipe:    $linha->id_equipe,
            nome:         $linha->nome,
            criado_por:   $linha->criado_por,
            equipe_pai:   $linha->equipe_pai   ?? null,
            tipo:         $linha->tipo,
            data_criacao: $linha->data_criacao ?? null
        );
    }

    private function bindCommon(PDOStatement $statement, equipes $equipe): void
    {
        $statement->bindValue(':nome',       $equipe->getNome(),      PDO::PARAM_STR);
        $statement->bindValue(':criado_por', $equipe->getCriadoPor(), PDO::PARAM_INT);
        $statement->bindValue(':tipo',       $equipe->getTipo(),      PDO::PARAM_STR);

        // equipe_pai pode ser NULL — PDO precisa de PARAM_NULL nesses casos
        $equipePai = $equipe->getEquipePai();
        $statement->bindValue(
            ':equipe_pai',
            $equipePai,
            $equipePai === null ? PDO::PARAM_NULL : PDO::PARAM_INT
        );
    }
}