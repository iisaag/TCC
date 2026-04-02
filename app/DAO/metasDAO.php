<?php
declare(strict_types=1);
require_once __DIR__ . '/../models/metas.php';
require_once __DIR__ . '/../models/projetos.php';
require_once __DIR__ . '/../Database.php';

class metasDAO
{
    // ------------------------------------------------------------------ CREATE
    public function create(metas $meta): metas
    {
        $query = 'INSERT INTO metas (
                    id_projeto, titulo_meta, prazo_meta,
                    data_conclusao_meta, status_meta
                ) VALUES (
                    :id_projeto, :titulo_meta, :prazo_meta,
                    :data_conclusao_meta, :status_meta
                )';

        $statement = Database::getConnection()->prepare($query);
        $this->bindCommon($statement, $meta);
        $statement->execute();

        $meta->setIdMeta((int) Database::getConnection()->lastInsertId());
        return $meta;
    }

    // ------------------------------------------------------------------ READ
    public function readAll(): array
    {
        $statement = Database::getConnection()->query(
            $this->baseQuery() . ' ORDER BY m.prazo_meta ASC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?metas
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE m.id_meta = :id LIMIT 1'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        return $linha ? $this->hydrate($linha) : null;
    }

    public function readByProjeto(int $idProjeto): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . ' WHERE m.id_projeto = :id ORDER BY m.prazo_meta ASC'
        );
        $statement->bindValue(':id', $idProjeto, PDO::PARAM_INT);
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
            $this->baseQuery() . ' WHERE LOWER(m.status_meta) = LOWER(:status) ORDER BY m.prazo_meta ASC'
        );
        $statement->bindValue(':status', $status, PDO::PARAM_STR);
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
            $this->baseQuery() . ' WHERE LOWER(m.titulo_meta) LIKE LOWER(:titulo) ORDER BY m.titulo_meta ASC'
        );
        $statement->bindValue(':titulo', "%{$titulo}%", PDO::PARAM_STR);
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
            WHERE m.prazo_meta < CURDATE()
              AND (m.status_meta IS NULL OR m.status_meta NOT IN ('Concluída', 'Cancelada'))
            ORDER BY m.prazo_meta ASC"
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readPendentesByProjeto(int $idProjeto): array
    {
        $statement = Database::getConnection()->prepare(
            $this->baseQuery() . " WHERE m.id_projeto = :id AND m.status_meta = 'Pendente' ORDER BY m.prazo_meta ASC"
        );
        $statement->bindValue(':id', $idProjeto, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // ------------------------------------------------------------------ UPDATE
    public function update(metas $meta): bool
    {
        $statement = Database::getConnection()->prepare(
            'UPDATE metas SET
                id_projeto          = :id_projeto,
                titulo_meta         = :titulo_meta,
                prazo_meta          = :prazo_meta,
                data_conclusao_meta = :data_conclusao_meta,
                status_meta         = :status_meta
             WHERE id_meta = :id_meta'
        );
        $statement->bindValue(':id_meta', $meta->getIdMeta(), PDO::PARAM_INT);
        $this->bindCommon($statement, $meta);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function concluir(int $id, string $dataConclusao): bool
    {
        $statement = Database::getConnection()->prepare(
            "UPDATE metas SET status_meta = 'Concluída', data_conclusao_meta = :data WHERE id_meta = :id"
        );
        $statement->bindValue(':data', $dataConclusao, PDO::PARAM_STR);
        $statement->bindValue(':id',   $id,            PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ DELETE
    public function delete(int $id): bool
    {
        $statement = Database::getConnection()->prepare(
            'DELETE FROM metas WHERE id_meta = :id'
        );
        $statement->bindValue(':id', $id, PDO::PARAM_INT);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // ------------------------------------------------------------------ STATS
    public function totalMetasPorStatus(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT status_meta, COUNT(*) AS total FROM metas GROUP BY status_meta ORDER BY total DESC'
        );

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = ['status_meta' => $linha->status_meta, 'total' => $linha->total];
        }
        return $resultados;
    }

    public function totalMetasPorProjeto(): array
    {
        $statement = Database::getConnection()->query(
            'SELECT p.id_projeto, p.nome_projeto, COUNT(m.id_meta) AS total
             FROM projetos p
             LEFT JOIN metas m ON m.id_projeto = p.id_projeto
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

    // ------------------------------------------------------------------ HELPERS
    private function baseQuery(): string
    {
        return '
        SELECT
            m.id_meta,
            m.titulo_meta,
            m.prazo_meta,
            m.data_conclusao_meta,
            m.status_meta,
            p.id_projeto,
            p.nome_projeto,
            p.status_projeto,
            p.prioridade_proj
        FROM metas m
        JOIN projetos p ON m.id_projeto = p.id_projeto';
    }

    private function hydrate(object $linha): metas
    {
        $projeto = new projetos(
            id_projeto:      $linha->id_projeto,
            nome_projeto:    $linha->nome_projeto,
            descricao:       null,
            data_inicio:     null,
            prazo_final:     null,
            status_projeto:  $linha->status_projeto  ?? null,
            prioridade_proj: $linha->prioridade_proj ?? null
        );

        return new metas(
            id_meta:             $linha->id_meta,
            projeto:             $projeto,
            titulo_meta:         $linha->titulo_meta,
            prazo_meta:          $linha->prazo_meta,
            data_conclusao_meta: $linha->data_conclusao_meta ?? null,
            status_meta:         $linha->status_meta         ?? 'Pendente'
        );
    }

    private function bindCommon(PDOStatement $statement, metas $meta): void
    {
        $statement->bindValue(':id_projeto',          $meta->getProjeto()?->getIdProjeto(), PDO::PARAM_INT);
        $statement->bindValue(':titulo_meta',         $meta->getTituloMeta(),               PDO::PARAM_STR);
        $statement->bindValue(':prazo_meta',          $meta->getPrazoMeta(),                PDO::PARAM_STR);
        $statement->bindValue(':data_conclusao_meta', $meta->getDataConclusaoMeta(),        PDO::PARAM_STR);
        $statement->bindValue(':status_meta',         $meta->getStatusMeta(),               PDO::PARAM_STR);
    }
}