<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/projetos.php';
require_once __DIR__ . '/../DB/Database.php';

class projetosDAO
{
    public function create(projetos $projeto): projetos
    {
        $id = $projeto->getIdProjeto();
        return isset($id) ? $this->createWithId($projeto) : $this->createWithoutId($projeto);
    }

    private function createWithoutId(projetos $projeto): projetos
    {
        $query = 'INSERT INTO projetos (
                    nome_projeto, descricao, data_inicio,
                    prazo_final, status_projeto, prioridade_proj
                ) VALUES (
                    :nome_projeto, :descricao, :data_inicio,
                    :prazo_final, :status_projeto, :prioridade_proj
                )';

        $statement = Database::getConnection()->prepare($query);
        $this->bindCommon($statement, $projeto);
        $statement->execute();

        $projeto->setIdProjeto((int) Database::getConnection()->lastInsertId());
        return $projeto;
    }

    private function createWithId(projetos $projeto): projetos
    {
        $query = 'INSERT INTO projetos (
                    id_projeto, nome_projeto, descricao, data_inicio,
                    prazo_final, status_projeto, prioridade_proj
                ) VALUES (
                    :id_projeto, :nome_projeto, :descricao, :data_inicio,
                    :prazo_final, :status_projeto, :prioridade_proj
                )';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_projeto', $projeto->getIdProjeto(), PDO::PARAM_INT);
        $this->bindCommon($statement, $projeto);
        $statement->execute();

        return $projeto;
    }

    public function readAll(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT * FROM projetos ORDER BY nome_projeto ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?projetos
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM projetos WHERE id_projeto = :id LIMIT 1'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->mapear($linha) : null;
    }

    public function readByNome(string $nome): array
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM projetos WHERE LOWER(nome_projeto) LIKE LOWER(:nome) ORDER BY nome_projeto ASC'
        );
        $statement->bindValue(':nome', "%{$nome}%", PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readByStatus(string $status): array
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM projetos WHERE LOWER(status_projeto) = LOWER(:status) ORDER BY prazo_final ASC'
        );
        $statement->bindValue(':status', $status, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function readByPrioridade(string $prioridade): array
    {
        $statement = Database::getConnection()->prepare(
            'SELECT * FROM projetos WHERE UPPER(prioridade_proj) = UPPER(:prioridade) ORDER BY prazo_final ASC'
        );
        $statement->bindValue(':prioridade', $prioridade, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->mapear($linha);
        }
        return $resultados;
    }

    public function update(projetos $projeto): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE projetos SET
                nome_projeto    = :nome_projeto,
                descricao       = :descricao,
                data_inicio     = :data_inicio,
                prazo_final     = :prazo_final,
                status_projeto  = :status_projeto,
                prioridade_proj = :prioridade_proj
             WHERE id_projeto = :id_projeto'
        );
        $statement->bindValue(':id_projeto', $projeto->getIdProjeto(), PDO::PARAM_INT);
        $this->bindCommon($statement, $projeto);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function delete(int $id): bool
    {
        $statement = Database::getConnection()->prepare(
            'DELETE FROM projetos WHERE id_projeto = :id'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function totalPorStatus(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT status_projeto, COUNT(*) AS total FROM projetos GROUP BY status_projeto ORDER BY total DESC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = ['status_projeto' => $linha->status_projeto, 'total' => $linha->total];
        }
        return $resultados;
    }

    private function mapear(object $linha): projetos
    {
        return new projetos(
            id_projeto:      $linha->id_projeto,
            nome_projeto:    $linha->nome_projeto,
            descricao:       $linha->descricao       ?? null,
            data_inicio:     $linha->data_inicio     ?? null,
            prazo_final:     $linha->prazo_final     ?? null,
            status_projeto:  $linha->status_projeto  ?? null,
            prioridade_proj: $linha->prioridade_proj ?? null
        );
    }

    private function bindCommon(PDOStatement $statement, projetos $projeto): void
    {
        $statement->bindValue(':nome_projeto',    $projeto->getNomeProjeto(),    PDO::PARAM_STR);
        $statement->bindValue(':descricao',       $projeto->getDescricao(),      PDO::PARAM_STR);
        $statement->bindValue(':data_inicio',     $projeto->getDataInicio(),     PDO::PARAM_STR);
        $statement->bindValue(':prazo_final',     $projeto->getPrazoFinal(),     PDO::PARAM_STR);
        $statement->bindValue(':status_projeto',  $projeto->getStatusProjeto(),  PDO::PARAM_STR);
        $statement->bindValue(':prioridade_proj', $projeto->getPrioridadeProj(), PDO::PARAM_STR);
    }
}