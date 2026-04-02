<?php
require_once __DIR__ . '/../src/DAO/cargosDAO.php';
require_once __DIR__ . '/../src/models/cargos.php';
require_once __DIR__ . '/../src/DB/Database.php';
require_once __DIR__ . '/../http/Response.php';
require_once __DIR__ . '/../utils/logger.php';

class cargosControl
{
    public function create(cargos $cargo): cargos
    {
        $id = $cargo->getIdCargo();
        if (isset($id)) {
            return $this->createWithId($cargo);
        } else {
            return $this->createWithoutId($cargo);
        }
    }

    private function createWithoutId(cargos $cargo): cargos
    {
        $query = 'INSERT INTO cargos (
                    nome_cargo
                ) VALUES (
                    :nome_cargo )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':nome_cargo', $cargo->getNomeCargo(), PDO::PARAM_STR);

        $statement->execute();

        $cargo->setIdCargo((int) Database::getConnection()->lastInsertId());

        return $cargo;
    }

    private function createWithId(cargos $cargo): cargos
    {
        $query = 'INSERT INTO cargos (
                    id_cargo,
                    nome_cargo
                ) VALUES (
                    :id_cargo,
                    :nome_cargo )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_cargo', $cargo->getIdCargo(), PDO::PARAM_INT);
        $statement->bindValue(':nome_cargo', $cargo->getNomeCargo(), PDO::PARAM_STR);

        $statement->execute();

        return $cargo;
    }

    public function readAll(): array
    {
        $query = '
        SELECT 
            id_cargo,
            nome_cargo
        FROM cargos
        ORDER BY nome_cargo ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $cargo = new cargos($linha->id_cargo, $linha->nome_cargo);
            $resultados[] = $cargo;
        }

        return $resultados;
    }

    public function readById(int $id): ?cargos
    {
        $query = '
        SELECT 
            id_cargo,
            nome_cargo
        FROM cargos
        WHERE id_cargo = :id_cargo
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_cargo', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        return new cargos($linha->id_cargo, $linha->nome_cargo);
    }

    public function readByNome(string $nome): ?cargos
    {
        $query = '
        SELECT 
            id_cargo,
            nome_cargo
        FROM cargos
        WHERE nome_cargo = :nome_cargo
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nome_cargo', $nome, PDO::PARAM_STR);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        return new cargos($linha->id_cargo, $linha->nome_cargo);
    }

    public function update(cargos $cargo): bool
    {
        $query = 'UPDATE cargos 
                  SET nome_cargo = :nome_cargo
                  WHERE id_cargo = :id_cargo';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':nome_cargo', $cargo->getNomeCargo(), PDO::PARAM_STR);
        $statement->bindValue(':id_cargo', $cargo->getIdCargo(), PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function index(): void
    {
        try {
            $cargosDAO = new cargosDAO();

            $porNome = $_GET['nome'] ?? null;

            if ($porNome) {
                $cargo = $cargosDAO->readByNome($porNome);
                $cargos = $cargo ? [$cargo] : [];
            } else {
                $cargos = $cargosDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Cargos listados com sucesso',
                data: ['cargos' => $cargos],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar cargos: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $cargo = $this->readById($id);

            if (!$cargo) {
                (new Response(
                    success: false,
                    message: 'Cargo não encontrado',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_cargo'   => $cargo->getIdCargo(),
                'nome_cargo' => $cargo->getNomeCargo(),
            ];

            (new Response(
                success: true,
                message: 'Cargo encontrado com sucesso',
                data: ['cargo' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar cargo: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['nome_cargo'])) {
                throw new Exception('Nome do cargo é obrigatório');
            }

            $cargo = new cargos(
                id_cargo: null,
                nome_cargo: $data['nome_cargo']
            );

            $cargosDAO = new cargosDAO();
            $cargo = $cargosDAO->create($cargo);

            (new Response(
                success: true,
                message: 'Cargo cadastrado com sucesso',
                data: ['cargo' => $cargo],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function edit(int $id, array $data): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($data['nome_cargo'])) {
                throw new Exception('Nome do cargo é obrigatório');
            }

            $cargo = new cargos(
                id_cargo: $id,
                nome_cargo: $data['nome_cargo']
            );

            $cargosDAO = new cargosDAO();
            $updated = $cargosDAO->update($cargo);

            if (!$updated) {
                throw new Exception('Cargo não encontrado ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Cargo atualizado com sucesso',
                data: ['cargo' => $cargo],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function delete(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            $cargosDAO = new cargosDAO();
            $cargosDAO->delete($id);

            (new Response(
                success: true,
                message: 'Cargo excluído com sucesso',
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }
}