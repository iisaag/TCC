<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/senha.php';
require_once __DIR__ . '/../models/usuarios.php';
require_once __DIR__ . '/../models/cargos.php';
require_once __DIR__ . '/../DB/Database.php';

class senhaDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(senha $senha): senha
    {
        $query = 'INSERT INTO senha (email, senha, nivel_acesso)
                  VALUES (:email, :senha, :nivel_acesso)';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':email',        $senha->getEmail(),        PDO::PARAM_STR);
        $statement->bindValue(':senha',        $senha->getSenhaHash(),    PDO::PARAM_STR);
        $statement->bindValue(':nivel_acesso', $senha->getNivelAcesso(),  PDO::PARAM_STR);
        $statement->execute();

        return $senha;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $statement = Database::getConnection()->query(
            $this->baseQuery() . ' ORDER BY u.nome ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByEmail(string $email): ?senha
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE s.email = :email LIMIT 1'
        );
        $statement->bindValue(':email', $email, PDO::PARAM_STR);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->hydrate($linha) : null;
    }

    public function readByNivelAcesso(string $nivel): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE LOWER(s.nivel_acesso) = LOWER(:nivel) ORDER BY u.nome ASC'
        );
        $statement->bindValue(':nivel', $nivel, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ UPDATE
    public function update(senha $senha): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE senha SET senha = :senha, nivel_acesso = :nivel_acesso WHERE email = :email'
        );
        $statement->bindValue(':senha',        $senha->getSenhaHash(),   PDO::PARAM_STR);
        $statement->bindValue(':nivel_acesso', $senha->getNivelAcesso(), PDO::PARAM_STR);
        $statement->bindValue(':email',        $senha->getEmail(),       PDO::PARAM_STR);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(string $email): bool
    {
        $statement = Database::getConnection()->prepare(
            'DELETE FROM senha WHERE email = :email'
        );
        $statement->bindValue(':email', $email, PDO::PARAM_STR);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ HELPERS
    private function baseQuery(): string
    {
        return '
        SELECT
            s.email,
            s.senha,
            s.nivel_acesso,
            u.id_usuario,
            u.nome            AS usuario_nome,
            u.foto_perfil     AS usuario_foto,
            u.nivel           AS usuario_nivel,
            c.id_cargo,
            c.nome_cargo
        FROM senha s
        JOIN usuarios u ON s.email = u.email
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo';
    }

    private function hydrate(object $linha): senha
    {
        $cargo = new cargos(
            id_cargo:   $linha->id_cargo   ?? null,
            nome_cargo: $linha->nome_cargo ?? ''
        );

        $usuario = new usuarios(
            id_usuario:   $linha->id_usuario,
            nome:         $linha->usuario_nome  ?? '',
            email:        $linha->email,
            foto_perfil:  $linha->usuario_foto  ?? null,
            cargo:        $cargo,
            nivel:        $linha->usuario_nivel ?? null,
            data_criacao: null
        );

        $obj = new senha(
            email:        $linha->email,
            senha:        '',
            nivel_acesso: $linha->nivel_acesso,
            usuario:      $usuario
        );
        $obj->setSenhaHash($linha->senha);

        return $obj;
    }
}