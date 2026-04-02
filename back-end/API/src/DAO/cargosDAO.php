<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/cargos.php';
require_once __DIR__ . '/../DB/Database.php';

class cargosDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(cargos $cargo): cargos
    {
        $query = 'INSERT INTO cargos (nome_cargo) VALUES (:nome_cargo)';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nome_cargo', $cargo->getNomeCargo(), PDO::PARAM_STR);
        $statement->execute();

        $cargo->setIdCargo((int) Database::getConnection()->lastInsertId());
        return $cargo;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT * FROM cargos ORDER BY nome_cargo ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?cargos
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM cargos WHERE id_cargo = :id LIMIT 1'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->mapear($linha) : null;
    }

    public function readByNome(string $nome): ?cargos
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM cargos WHERE LOWER(nome_cargo) = LOWER(:nome) LIMIT 1'
        );
        $statement->bindValue(':nome', $nome, PDO::PARAM_STR);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->mapear($linha) : null;
    }

    public function searchByNome(string $nome): array
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM cargos WHERE LOWER(nome_cargo) LIKE LOWER(:nome) ORDER BY nome_cargo ASC'
        );
        $statement->bindValue(':nome', "%{$nome}%", PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ UPDATE
    public function update(cargos $cargo): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE cargos SET nome_cargo = :nome_cargo WHERE id_cargo = :id_cargo'
        );
        $statement->bindValue(':nome_cargo', $cargo->getNomeCargo(), PDO::PARAM_STR);
        $statement->bindValue(':id_cargo',   $cargo->getIdCargo(),   PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(int $id): bool
    {
        $statement = Database::getConnection()->prepare(
            'DELETE FROM cargos WHERE id_cargo = :id'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ STATS
    public function totalCargos(): int
    {
        $statement = Database::getConnection()->query(
            'SELECT COUNT(*) AS total FROM cargos'
        );
        return (int) $statement->fetch(PDO::FETCH_OBJ)->total;
    }

    // ------------------------------------------------------------------ HELPERS
    private function mapear(object $linha): cargos
    {
        return new cargos(
            id_cargo:   $linha->id_cargo,
            nome_cargo: $linha->nome_cargo
        );
    }
}