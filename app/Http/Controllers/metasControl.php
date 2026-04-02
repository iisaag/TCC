<?php
require_once __DIR__ . '/../DAO/metasDAO.php';
require_once __DIR__ . '/../Models/metas.php';
require_once __DIR__ . '/../Models/projetos.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../Utils/logger.php';

class metasControl
{
    public function create(metas $meta): metas
    {
        $id = $meta->getIdMeta();
        if (isset($id)) {
            return $this->createWithId($meta);
        } else {
            return $this->createWithoutId($meta);
        }
    }

    private function createWithoutId(metas $meta): metas
    {
        $query = 'INSERT INTO metas (
                    id_projeto,
                    titulo_meta,
                    prazo_meta,
                    data_conclusao_meta,
                    status_meta
                ) VALUES (
                    :id_projeto,
                    :titulo_meta,
                    :prazo_meta,
                    :data_conclusao_meta,
                    :status_meta )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_projeto',          $meta->getProjeto()->getIdProjeto(), PDO::PARAM_INT);
        $statement->bindValue(':titulo_meta',         $meta->getTituloMeta(),              PDO::PARAM_STR);
        $statement->bindValue(':prazo_meta',          $meta->getPrazoMeta(),               PDO::PARAM_STR);
        $statement->bindValue(':data_conclusao_meta', $meta->getDataConclusaoMeta(),       PDO::PARAM_STR);
        $statement->bindValue(':status_meta',         $meta->getStatusMeta() ?? 'Pendente', PDO::PARAM_STR);

        $statement->execute();

        $meta->setIdMeta((int) Database::getConnection()->lastInsertId());

        return $meta;
    }

    private function createWithId(metas $meta): metas
    {
        $query = 'INSERT INTO metas (
                    id_meta,
                    id_projeto,
                    titulo_meta,
                    prazo_meta,
                    data_conclusao_meta,
                    status_meta
                ) VALUES (
                    :id_meta,
                    :id_projeto,
                    :titulo_meta,
                    :prazo_meta,
                    :data_conclusao_meta,
                    :status_meta )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_meta',             $meta->getIdMeta(),                  PDO::PARAM_INT);
        $statement->bindValue(':id_projeto',          $meta->getProjeto()->getIdProjeto(), PDO::PARAM_INT);
        $statement->bindValue(':titulo_meta',         $meta->getTituloMeta(),              PDO::PARAM_STR);
        $statement->bindValue(':prazo_meta',          $meta->getPrazoMeta(),               PDO::PARAM_STR);
        $statement->bindValue(':data_conclusao_meta', $meta->getDataConclusaoMeta(),       PDO::PARAM_STR);
        $statement->bindValue(':status_meta',         $meta->getStatusMeta() ?? 'Pendente', PDO::PARAM_STR);

        $statement->execute();

        return $meta;
    }

    // -------------------------------------------------------------------------
    // Monta um objeto metas a partir de uma linha do banco
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Query base reutilizada em todos os reads
    // -------------------------------------------------------------------------
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

    public function readAll(): array
    {
        $query = $this->baseQuery() . ' ORDER BY m.prazo_meta ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?metas
    {
        $query = $this->baseQuery() . '
        WHERE m.id_meta = :id_meta
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_meta', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        return $this->hydrate($linha);
    }

    public function readByProjeto(int $idProjeto): array
    {
        $query = $this->baseQuery() . '
        WHERE m.id_projeto = :id_projeto
        ORDER BY m.prazo_meta ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_projeto', $idProjeto, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByStatus(string $status): array
    {
        $query = $this->baseQuery() . '
        WHERE m.status_meta = :status_meta
        ORDER BY m.prazo_meta ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':status_meta', $status, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByTitulo(string $titulo): array
    {
        $query = $this->baseQuery() . '
        WHERE m.titulo_meta LIKE :titulo_meta
        ORDER BY m.titulo_meta ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':titulo_meta', '%' . $titulo . '%', PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Metas com prazo vencido e status ainda não concluído
    public function readAtrasadas(): array
    {
        $query = $this->baseQuery() . '
        WHERE m.prazo_meta < CURDATE()
          AND (m.status_meta IS NULL OR m.status_meta NOT IN (\'Concluída\', \'Cancelada\'))
        ORDER BY m.prazo_meta ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Metas pendentes de um projeto específico
    public function readPendentesByProjeto(int $idProjeto): array
    {
        $query = $this->baseQuery() . '
        WHERE m.id_projeto = :id_projeto
          AND m.status_meta = \'Pendente\'
        ORDER BY m.prazo_meta ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_projeto', $idProjeto, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function update(metas $meta): bool
    {
        $query = 'UPDATE metas
                  SET id_projeto          = :id_projeto,
                      titulo_meta         = :titulo_meta,
                      prazo_meta          = :prazo_meta,
                      data_conclusao_meta = :data_conclusao_meta,
                      status_meta         = :status_meta
                  WHERE id_meta = :id_meta';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_projeto',          $meta->getProjeto()->getIdProjeto(), PDO::PARAM_INT);
        $statement->bindValue(':titulo_meta',         $meta->getTituloMeta(),              PDO::PARAM_STR);
        $statement->bindValue(':prazo_meta',          $meta->getPrazoMeta(),               PDO::PARAM_STR);
        $statement->bindValue(':data_conclusao_meta', $meta->getDataConclusaoMeta(),       PDO::PARAM_STR);
        $statement->bindValue(':status_meta',         $meta->getStatusMeta(),              PDO::PARAM_STR);
        $statement->bindValue(':id_meta',             $meta->getIdMeta(),                  PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // Apenas atualiza o status da meta (ex: concluir sem editar tudo)
    public function concluir(int $id, string $dataConclusao): bool
    {
        $query = 'UPDATE metas
                  SET status_meta         = \'Concluída\',
                      data_conclusao_meta = :data_conclusao_meta
                  WHERE id_meta = :id_meta';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':data_conclusao_meta', $dataConclusao, PDO::PARAM_STR);
        $statement->bindValue(':id_meta',             $id,            PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function totalPorStatus(): void
    {
        try {
            $metasDAO = new metasDAO();
            $total = $metasDAO->totalMetasPorStatus();

            (new Response(
                success: true,
                message: 'Total de metas por status obtido com sucesso',
                data: $total,
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

    public function totalPorProjeto(): void
    {
        try {
            $metasDAO = new metasDAO();
            $total = $metasDAO->totalMetasPorProjeto();

            (new Response(
                success: true,
                message: 'Total de metas por projeto obtido com sucesso',
                data: $total,
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

    public function index(): void
    {
        try {
            $metasDAO = new metasDAO();

            $porProjeto  = isset($_GET['id_projeto'])  ? (int)$_GET['id_projeto'] : null;
            $porStatus   = $_GET['status']             ?? null;
            $porTitulo   = $_GET['titulo']             ?? null;
            $atrasadas   = isset($_GET['atrasadas']);
            $pendentes   = isset($_GET['pendentes'])   && $porProjeto;

            if ($porTitulo) {
                $metas = $metasDAO->readByTitulo($porTitulo);
            } elseif ($pendentes) {
                $metas = $metasDAO->readPendentesByProjeto($porProjeto);
            } elseif ($porProjeto) {
                $metas = $metasDAO->readByProjeto($porProjeto);
            } elseif ($porStatus) {
                $metas = $metasDAO->readByStatus($porStatus);
            } elseif ($atrasadas) {
                $metas = $metasDAO->readAtrasadas();
            } else {
                $metas = $metasDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Metas listadas com sucesso',
                data: ['metas' => $metas],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar metas: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $meta = $this->readById($id);

            if (!$meta) {
                (new Response(
                    success: false,
                    message: 'Meta não encontrada',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_meta'             => $meta->getIdMeta(),
                'titulo_meta'         => $meta->getTituloMeta(),
                'prazo_meta'          => $meta->getPrazoMeta(),
                'data_conclusao_meta' => $meta->getDataConclusaoMeta(),
                'status_meta'         => $meta->getStatusMeta(),
                'projeto' => [
                    'id_projeto'      => $meta->getProjeto()->getIdProjeto(),
                    'nome_projeto'    => $meta->getProjeto()->getNomeProjeto(),
                    'status_projeto'  => $meta->getProjeto()->getStatusProjeto(),
                    'prioridade_proj' => $meta->getProjeto()->getPrioridadeProj(),
                ],
            ];

            (new Response(
                success: true,
                message: 'Meta encontrada com sucesso',
                data: ['meta' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar meta: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['titulo_meta'])) {
                throw new Exception('Título da meta é obrigatório');
            }

            if (empty($data['prazo_meta'])) {
                throw new Exception('Prazo da meta é obrigatório');
            }

            if (empty($data['projeto']['id_projeto'])) {
                throw new Exception('Projeto é obrigatório');
            }

            $projeto = new projetos(
                id_projeto:      $data['projeto']['id_projeto'],
                nome_projeto:    $data['projeto']['nome_projeto'] ?? '',
                descricao:       null,
                data_inicio:     null,
                prazo_final:     null,
                status_projeto:  null,
                prioridade_proj: null
            );

            $meta = new metas(
                id_meta:             null,
                projeto:             $projeto,
                titulo_meta:         $data['titulo_meta'],
                prazo_meta:          $data['prazo_meta'],
                data_conclusao_meta: $data['data_conclusao_meta'] ?? null,
                status_meta:         $data['status_meta']         ?? 'Pendente'
            );

            $metasDAO = new metasDAO();
            $meta = $metasDAO->create($meta);

            (new Response(
                success: true,
                message: 'Meta cadastrada com sucesso',
                data: ['meta' => $meta],
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

            if (empty($data['titulo_meta'])) {
                throw new Exception('Título da meta é obrigatório');
            }

            if (empty($data['prazo_meta'])) {
                throw new Exception('Prazo da meta é obrigatório');
            }

            if (empty($data['projeto']['id_projeto'])) {
                throw new Exception('Projeto é obrigatório');
            }

            $projeto = new projetos(
                id_projeto:      $data['projeto']['id_projeto'],
                nome_projeto:    $data['projeto']['nome_projeto'] ?? '',
                descricao:       null,
                data_inicio:     null,
                prazo_final:     null,
                status_projeto:  null,
                prioridade_proj: null
            );

            $meta = new metas(
                id_meta:             $id,
                projeto:             $projeto,
                titulo_meta:         $data['titulo_meta'],
                prazo_meta:          $data['prazo_meta'],
                data_conclusao_meta: $data['data_conclusao_meta'] ?? null,
                status_meta:         $data['status_meta']         ?? 'Pendente'
            );

            $metasDAO = new metasDAO();
            $updated = $metasDAO->update($meta);

            if (!$updated) {
                throw new Exception('Meta não encontrada ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Meta atualizada com sucesso',
                data: ['meta' => $meta],
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

    public function concluirMeta(int $id, array $data): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            $dataConclusao = $data['data_conclusao_meta'] ?? date('Y-m-d');

            $metasDAO = new metasDAO();
            $updated  = $metasDAO->concluir($id, $dataConclusao);

            if (!$updated) {
                throw new Exception('Meta não encontrada ou já concluída');
            }

            (new Response(
                success: true,
                message: 'Meta concluída com sucesso',
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

            $metasDAO = new metasDAO();
            $metasDAO->delete($id);

            (new Response(
                success: true,
                message: 'Meta excluída com sucesso',
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
