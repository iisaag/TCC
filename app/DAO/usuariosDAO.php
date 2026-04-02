<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/usuarios.php';
require_once __DIR__ . '/../models/cargos.php';
require_once __DIR__ . '/../Database.php';

class usuariosDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(usuarios $usuario): usuarios
    {
        $id = $usuario->getIdUsuario();
        return isset($id) ? $this->createWithId($usuario) : $this->createWithoutId($usuario);
    }

    private function createWithoutId(usuarios $usuario): usuarios
    {
        $query = 'INSERT INTO usuarios (
                    nome,
                    email,
                    foto_perfil,
                    cargo,
                    nivel
                ) VALUES (
                    :nome,
                    :email,
                    :foto_perfil,
                    :cargo,
                    :nivel
                )';

        $statement = Database::getConnection()->prepare($query);
        $this->bindCommon($statement, $usuario);
        $statement->execute();

        $usuario->setIdUsuario((int) Database::getConnection()->lastInsertId());
        return $usuario;
    }

    private function createWithId(usuarios $usuario): usuarios
    {
        $query = 'INSERT INTO usuarios (
                    id_usuario,
                    nome,
                    email,
                    foto_perfil,
                    cargo,
                    nivel
                ) VALUES (
                    :id_usuario,
                    :nome,
                    :email,
                    :foto_perfil,
                    :cargo,
                    :nivel
                )';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $usuario->getIdUsuario(), PDO::PARAM_INT);
        $this->bindCommon($statement, $usuario);
        $statement->execute();

        return $usuario;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $query = "
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.foto_perfil,
                u.nivel,
                u.data_criacao,
                c.id_cargo,
                c.nome_cargo
            FROM usuarios u
            LEFT JOIN cargos c ON u.cargo = c.nome_cargo
            ORDER BY u.nome ASC
        ";

        $statement = Database::getConnection()->query($query);
        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }

        return $resultados;
    }

    public function readById(int $id): ?usuarios
    {
        $query = "
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.foto_perfil,
                u.nivel,
                u.data_criacao,
                c.id_cargo,
                c.nome_cargo
            FROM usuarios u
            LEFT JOIN cargos c ON u.cargo = c.nome_cargo
            WHERE u.id_usuario = :id
            LIMIT 1
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->mapear($linha) : null;
    }

    public function readByEmail(string $email): ?usuarios
    {
        $query = "
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.foto_perfil,
                u.nivel,
                u.data_criacao,
                c.id_cargo,
                c.nome_cargo
            FROM usuarios u
            LEFT JOIN cargos c ON u.cargo = c.nome_cargo
            WHERE u.email = :email
            LIMIT 1
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':email', $email, PDO::PARAM_STR);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->mapear($linha) : null;
    }

    public function readByNome(string $nome): array
    {
        $query = "
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.foto_perfil,
                u.nivel,
                u.data_criacao,
                c.id_cargo,
                c.nome_cargo
            FROM usuarios u
            LEFT JOIN cargos c ON u.cargo = c.nome_cargo
            WHERE LOWER(u.nome) LIKE LOWER(:nome)
            ORDER BY u.nome ASC
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

    public function readByCargoNome(string $cargoNome): array
    {
        $query = "
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.foto_perfil,
                u.nivel,
                u.data_criacao,
                c.id_cargo,
                c.nome_cargo
            FROM usuarios u
            LEFT JOIN cargos c ON u.cargo = c.nome_cargo
            WHERE LOWER(c.nome_cargo) LIKE LOWER(:cargo_nome)
            ORDER BY u.nome ASC
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':cargo_nome', "%{$cargoNome}%", PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readByNivel(string $nivel): array
    {
        $query = "
            SELECT
                u.id_usuario,
                u.nome,
                u.email,
                u.foto_perfil,
                u.nivel,
                u.data_criacao,
                c.id_cargo,
                c.nome_cargo
            FROM usuarios u
            LEFT JOIN cargos c ON u.cargo = c.nome_cargo
            WHERE LOWER(u.nivel) = LOWER(:nivel)
            ORDER BY u.nome ASC
        ";

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nivel', $nivel, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ UPDATE
    public function update(usuarios $usuario): bool
    {
        $query = 'UPDATE usuarios
                  SET nome        = :nome,
                      email       = :email,
                      foto_perfil = :foto_perfil,
                      cargo       = :cargo,
                      nivel       = :nivel
                  WHERE id_usuario = :id_usuario';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $usuario->getIdUsuario(), PDO::PARAM_INT);
        $this->bindCommon($statement, $usuario);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(int $id): bool
    {
        $query = 'DELETE FROM usuarios WHERE id_usuario = :id';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ STATS
    public function totalUsuariosPorCargo(): array
    {
        $query = "
            SELECT
                c.id_cargo,
                c.nome_cargo,
                COUNT(u.id_usuario) AS total_usuarios
            FROM cargos c
            LEFT JOIN usuarios u ON u.cargo = c.nome_cargo
            GROUP BY c.id_cargo, c.nome_cargo
            ORDER BY c.nome_cargo ASC
        ";

        $statement = Database::getConnection()->query($query);
        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = [
                'id_cargo'       => $linha->id_cargo,
                'nome_cargo'     => $linha->nome_cargo,
                'total_usuarios' => $linha->total_usuarios,
            ];
        }
        return $resultados;
    }

    public function totalUsuariosPorNivel(): array
    {
        $query = "
            SELECT
                nivel,
                COUNT(*) AS total_usuarios
            FROM usuarios
            GROUP BY nivel
            ORDER BY nivel ASC
        ";

        $statement = Database::getConnection()->query($query);
        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = [
                'nivel'          => $linha->nivel,
                'total_usuarios' => $linha->total_usuarios,
            ];
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ HELPERS
    private function mapear(object $linha): usuarios
    {
        $cargo = new cargos(
            id_cargo:   $linha->id_cargo   ?? null,
            nome_cargo: $linha->nome_cargo ?? ''
        );

        return new usuarios(
            id_usuario:   $linha->id_usuario,
            nome:         $linha->nome,
            email:        $linha->email,
            foto_perfil:  $linha->foto_perfil  ?? null,
            nivel:        $linha->nivel        ?? null,
            data_criacao: $linha->data_criacao ?? null,
            cargo:        $cargo
        );
    }

    private function bindCommon(PDOStatement $statement, usuarios $usuario): void
    {
        $statement->bindValue(':nome',        $usuario->getNome(),                PDO::PARAM_STR);
        $statement->bindValue(':email',       $usuario->getEmail(),               PDO::PARAM_STR);
        $statement->bindValue(':foto_perfil', $usuario->getFotoPerfil(),          PDO::PARAM_STR);
        $statement->bindValue(':cargo',       $usuario->getCargo()->getNomeCargo(), PDO::PARAM_STR);
        $statement->bindValue(':nivel',       $usuario->getNivel(),               PDO::PARAM_STR);
    }
}