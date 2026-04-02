<?php
require_once __DIR__ . '/../DAO/tarefasDAO.php';
require_once __DIR__ . '/../Models/tarefas.php';
require_once __DIR__ . '/../Models/projetos.php';
require_once __DIR__ . '/../Models/usuarios.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../Utils/logger.php';

class tarefasControl
{
    public function create(tarefas $tarefa): tarefas
    {
        $id = $tarefa->getIdTarefa();
        if (isset($id)) {
            return $this->createWithId($tarefa);
        } else {
            return $this->createWithoutId($tarefa);
        }
    }

    private function createWithoutId(tarefas $tarefa): tarefas
    {
        $query = 'INSERT INTO tarefas (
                    titulo,
                    descricao,
                    id_projeto,
                    id_responsavel,
                    prioridade_task,
                    prazo,
                    status_task
                ) VALUES (
                    :titulo,
                    :descricao,
                    :id_projeto,
                    :id_responsavel,
                    :prioridade_task,
                    :prazo,
                    :status_task )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':titulo',          $tarefa->getTitulo(),                           PDO::PARAM_STR);
        $statement->bindValue(':descricao',       $tarefa->getDescricao(),                        PDO::PARAM_STR);
        $statement->bindValue(':id_projeto',      $tarefa->getProjeto()?->getIdProjeto(),         PDO::PARAM_INT);
        $statement->bindValue(':id_responsavel',  $tarefa->getResponsavel()?->getIdUsuario(),     PDO::PARAM_INT);
        $statement->bindValue(':prioridade_task', $tarefa->getPrioridadeTask(),                   PDO::PARAM_STR);
        $statement->bindValue(':prazo',           $tarefa->getPrazo(),                            PDO::PARAM_STR);
        $statement->bindValue(':status_task',     $tarefa->getStatusTask(),                       PDO::PARAM_STR);

        $statement->execute();

        $tarefa->setIdTarefa((int) Database::getConnection()->lastInsertId());

        return $tarefa;
    }

    private function createWithId(tarefas $tarefa): tarefas
    {
        $query = 'INSERT INTO tarefas (
                    id_tarefa,
                    titulo,
                    descricao,
                    id_projeto,
                    id_responsavel,
                    prioridade_task,
                    prazo,
                    status_task
                ) VALUES (
                    :id_tarefa,
                    :titulo,
                    :descricao,
                    :id_projeto,
                    :id_responsavel,
                    :prioridade_task,
                    :prazo,
                    :status_task )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_tarefa',       $tarefa->getIdTarefa(),                         PDO::PARAM_INT);
        $statement->bindValue(':titulo',          $tarefa->getTitulo(),                           PDO::PARAM_STR);
        $statement->bindValue(':descricao',       $tarefa->getDescricao(),                        PDO::PARAM_STR);
        $statement->bindValue(':id_projeto',      $tarefa->getProjeto()?->getIdProjeto(),         PDO::PARAM_INT);
        $statement->bindValue(':id_responsavel',  $tarefa->getResponsavel()?->getIdUsuario(),     PDO::PARAM_INT);
        $statement->bindValue(':prioridade_task', $tarefa->getPrioridadeTask(),                   PDO::PARAM_STR);
        $statement->bindValue(':prazo',           $tarefa->getPrazo(),                            PDO::PARAM_STR);
        $statement->bindValue(':status_task',     $tarefa->getStatusTask(),                       PDO::PARAM_STR);

        $statement->execute();

        return $tarefa;
    }

    // -------------------------------------------------------------------------
    // Monta um objeto tarefas a partir de uma linha do banco
    // -------------------------------------------------------------------------
    private function hydrate(object $linha): tarefas
    {
        $projeto = null;
        if (!empty($linha->id_projeto)) {
            $projeto = new projetos(
                id_projeto:      $linha->id_projeto,
                nome_projeto:    $linha->nome_projeto    ?? null,
                descricao:       null,
                data_inicio:     null,
                prazo_final:     null,
                status_projeto:  $linha->status_projeto  ?? null,
                prioridade_proj: $linha->prioridade_proj ?? null
            );
        }

        $responsavel = null;
        if (!empty($linha->id_responsavel)) {
            $responsavel = new usuarios(
                id_usuario:   $linha->id_responsavel,
                nome:         $linha->responsavel_nome  ?? null,
                email:        $linha->responsavel_email ?? null,
                foto_perfil:  $linha->responsavel_foto  ?? null,
                cargo:        new cargos(),
                nivel:        null,
                data_criacao: null
            );
        }

        return new tarefas(
            id_tarefa:       $linha->id_tarefa,
            titulo:          $linha->titulo,
            descricao:       $linha->descricao       ?? null,
            projeto:         $projeto,
            responsavel:     $responsavel,
            prioridade_task: $linha->prioridade_task ?? null,
            prazo:           $linha->prazo           ?? null,
            status_task:     $linha->status_task     ?? null
        );
    }

    // -------------------------------------------------------------------------
    // Query base reutilizada em todos os reads
    // -------------------------------------------------------------------------
    private function baseQuery(): string
    {
        return '
        SELECT
            t.id_tarefa,
            t.titulo,
            t.descricao,
            t.prioridade_task,
            t.prazo,
            t.status_task,
            p.id_projeto,
            p.nome_projeto,
            p.status_projeto,
            p.prioridade_proj,
            u.id_usuario      AS id_responsavel,
            u.nome            AS responsavel_nome,
            u.email           AS responsavel_email,
            u.foto_perfil     AS responsavel_foto
        FROM tarefas t
        LEFT JOIN projetos p ON t.id_projeto     = p.id_projeto
        LEFT JOIN usuarios u ON t.id_responsavel = u.id_usuario';
    }

    public function readAll(): array
    {
        $query = $this->baseQuery() . ' ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?tarefas
    {
        $query = $this->baseQuery() . '
        WHERE t.id_tarefa = :id_tarefa
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_tarefa', $id, PDO::PARAM_INT);
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
        WHERE t.id_projeto = :id_projeto
        ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_projeto', $idProjeto, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByResponsavel(int $idResponsavel): array
    {
        $query = $this->baseQuery() . '
        WHERE t.id_responsavel = :id_responsavel
        ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_responsavel', $idResponsavel, PDO::PARAM_INT);
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
        WHERE t.status_task = :status_task
        ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':status_task', $status, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByPrioridade(string $prioridade): array
    {
        $query = $this->baseQuery() . '
        WHERE t.prioridade_task = :prioridade_task
        ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':prioridade_task', $prioridade, PDO::PARAM_STR);
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
        WHERE t.titulo LIKE :titulo
        ORDER BY t.titulo ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':titulo', '%' . $titulo . '%', PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Tarefas com prazo vencido e status não concluído
    public function readAtrasadas(): array
    {
        $query = $this->baseQuery() . '
        WHERE t.prazo < CURDATE()
          AND (t.status_task IS NULL OR t.status_task NOT IN (\'Concluída\', \'Cancelada\'))
        ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Tarefas sem responsável atribuído
    public function readSemResponsavel(): array
    {
        $query = $this->baseQuery() . '
        WHERE t.id_responsavel IS NULL
        ORDER BY t.prazo ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function update(tarefas $tarefa): bool
    {
        $query = 'UPDATE tarefas
                  SET titulo          = :titulo,
                      descricao       = :descricao,
                      id_projeto      = :id_projeto,
                      id_responsavel  = :id_responsavel,
                      prioridade_task = :prioridade_task,
                      prazo           = :prazo,
                      status_task     = :status_task
                  WHERE id_tarefa = :id_tarefa';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':titulo',          $tarefa->getTitulo(),                       PDO::PARAM_STR);
        $statement->bindValue(':descricao',       $tarefa->getDescricao(),                    PDO::PARAM_STR);
        $statement->bindValue(':id_projeto',      $tarefa->getProjeto()?->getIdProjeto(),     PDO::PARAM_INT);
        $statement->bindValue(':id_responsavel',  $tarefa->getResponsavel()?->getIdUsuario(), PDO::PARAM_INT);
        $statement->bindValue(':prioridade_task', $tarefa->getPrioridadeTask(),               PDO::PARAM_STR);
        $statement->bindValue(':prazo',           $tarefa->getPrazo(),                        PDO::PARAM_STR);
        $statement->bindValue(':status_task',     $tarefa->getStatusTask(),                   PDO::PARAM_STR);
        $statement->bindValue(':id_tarefa',       $tarefa->getIdTarefa(),                     PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // Atualiza apenas o status da tarefa
    public function atualizarStatus(int $id, string $status): bool
    {
        $query = 'UPDATE tarefas
                  SET status_task = :status_task
                  WHERE id_tarefa = :id_tarefa';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':status_task', $status, PDO::PARAM_STR);
        $statement->bindValue(':id_tarefa',   $id,     PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    // Reatribui responsável de uma tarefa
    public function atribuirResponsavel(int $idTarefa, int $idUsuario): bool
    {
        $query = 'UPDATE tarefas
                  SET id_responsavel = :id_responsavel
                  WHERE id_tarefa = :id_tarefa';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_responsavel', $idUsuario,  PDO::PARAM_INT);
        $statement->bindValue(':id_tarefa',      $idTarefa,   PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function totalPorStatus(): void
    {
        try {
            $tarefasDAO = new tarefasDAO();
            $total = $tarefasDAO->totalTarefasPorStatus();

            (new Response(
                success: true,
                message: 'Total de tarefas por status obtido com sucesso',
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
            $tarefasDAO = new tarefasDAO();
            $total = $tarefasDAO->totalTarefasPorProjeto();

            (new Response(
                success: true,
                message: 'Total de tarefas por projeto obtido com sucesso',
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

    public function totalPorResponsavel(): void
    {
        try {
            $tarefasDAO = new tarefasDAO();
            $total = $tarefasDAO->totalTarefasPorResponsavel();

            (new Response(
                success: true,
                message: 'Total de tarefas por responsável obtido com sucesso',
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
            $tarefasDAO = new tarefasDAO();

            $porProjeto      = isset($_GET['id_projeto'])     ? (int)$_GET['id_projeto']     : null;
            $porResponsavel  = isset($_GET['id_responsavel']) ? (int)$_GET['id_responsavel'] : null;
            $porStatus       = $_GET['status']                ?? null;
            $porPrioridade   = $_GET['prioridade']            ?? null;
            $porTitulo       = $_GET['titulo']                ?? null;
            $atrasadas       = isset($_GET['atrasadas']);
            $semResponsavel  = isset($_GET['sem_responsavel']);

            if ($porTitulo) {
                $tarefas = $tarefasDAO->readByTitulo($porTitulo);
            } elseif ($porProjeto && $porResponsavel) {
                $tarefas = $tarefasDAO->readByProjetoEResponsavel($porProjeto, $porResponsavel);
            } elseif ($porProjeto) {
                $tarefas = $tarefasDAO->readByProjeto($porProjeto);
            } elseif ($porResponsavel) {
                $tarefas = $tarefasDAO->readByResponsavel($porResponsavel);
            } elseif ($porStatus) {
                $tarefas = $tarefasDAO->readByStatus($porStatus);
            } elseif ($porPrioridade) {
                $tarefas = $tarefasDAO->readByPrioridade($porPrioridade);
            } elseif ($atrasadas) {
                $tarefas = $tarefasDAO->readAtrasadas();
            } elseif ($semResponsavel) {
                $tarefas = $tarefasDAO->readSemResponsavel();
            } else {
                $tarefas = $tarefasDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Tarefas listadas com sucesso',
                data: ['tarefas' => $tarefas],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar tarefas: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $tarefa = $this->readById($id);

            if (!$tarefa) {
                (new Response(
                    success: false,
                    message: 'Tarefa não encontrada',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_tarefa'       => $tarefa->getIdTarefa(),
                'titulo'          => $tarefa->getTitulo(),
                'descricao'       => $tarefa->getDescricao(),
                'prioridade_task' => $tarefa->getPrioridadeTask(),
                'prazo'           => $tarefa->getPrazo(),
                'status_task'     => $tarefa->getStatusTask(),
                'projeto' => $tarefa->getProjeto() ? [
                    'id_projeto'     => $tarefa->getProjeto()->getIdProjeto(),
                    'nome_projeto'   => $tarefa->getProjeto()->getNomeProjeto(),
                    'status_projeto' => $tarefa->getProjeto()->getStatusProjeto(),
                ] : null,
                'responsavel' => $tarefa->getResponsavel() ? [
                    'id_usuario'  => $tarefa->getResponsavel()->getIdUsuario(),
                    'nome'        => $tarefa->getResponsavel()->getNome(),
                    'email'       => $tarefa->getResponsavel()->getEmail(),
                    'foto_perfil' => $tarefa->getResponsavel()->getFotoPerfil(),
                ] : null,
            ];

            (new Response(
                success: true,
                message: 'Tarefa encontrada com sucesso',
                data: ['tarefa' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar tarefa: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['titulo'])) {
                throw new Exception('Título da tarefa é obrigatório');
            }

            $projeto = null;
            if (!empty($data['projeto']['id_projeto'])) {
                $projeto = new projetos(
                    id_projeto:      $data['projeto']['id_projeto'],
                    nome_projeto:    $data['projeto']['nome_projeto'] ?? '',
                    descricao:       null,
                    data_inicio:     null,
                    prazo_final:     null,
                    status_projeto:  null,
                    prioridade_proj: null
                );
            }

            $responsavel = null;
            if (!empty($data['responsavel']['id_usuario'])) {
                $responsavel = new usuarios(
                    id_usuario:   $data['responsavel']['id_usuario'],
                    nome:         $data['responsavel']['nome']  ?? '',
                    email:        $data['responsavel']['email'] ?? '',
                    foto_perfil:  null,
                    cargo:        new cargos(),
                    nivel:        null,
                    data_criacao: null
                );
            }

            $tarefa = new tarefas(
                id_tarefa:       null,
                titulo:          $data['titulo'],
                descricao:       $data['descricao']       ?? null,
                projeto:         $projeto,
                responsavel:     $responsavel,
                prioridade_task: $data['prioridade_task'] ?? null,
                prazo:           $data['prazo']           ?? null,
                status_task:     $data['status_task']     ?? null
            );

            $tarefasDAO = new tarefasDAO();
            $tarefa = $tarefasDAO->create($tarefa);

            (new Response(
                success: true,
                message: 'Tarefa cadastrada com sucesso',
                data: ['tarefa' => $tarefa],
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

            if (empty($data['titulo'])) {
                throw new Exception('Título da tarefa é obrigatório');
            }

            $projeto = null;
            if (!empty($data['projeto']['id_projeto'])) {
                $projeto = new projetos(
                    id_projeto:      $data['projeto']['id_projeto'],
                    nome_projeto:    $data['projeto']['nome_projeto'] ?? '',
                    descricao:       null,
                    data_inicio:     null,
                    prazo_final:     null,
                    status_projeto:  null,
                    prioridade_proj: null
                );
            }

            $responsavel = null;
            if (!empty($data['responsavel']['id_usuario'])) {
                $responsavel = new usuarios(
                    id_usuario:   $data['responsavel']['id_usuario'],
                    nome:         $data['responsavel']['nome']  ?? '',
                    email:        $data['responsavel']['email'] ?? '',
                    foto_perfil:  null,
                    cargo:        new cargos(),
                    nivel:        null,
                    data_criacao: null
                );
            }

            $tarefa = new tarefas(
                id_tarefa:       $id,
                titulo:          $data['titulo'],
                descricao:       $data['descricao']       ?? null,
                projeto:         $projeto,
                responsavel:     $responsavel,
                prioridade_task: $data['prioridade_task'] ?? null,
                prazo:           $data['prazo']           ?? null,
                status_task:     $data['status_task']     ?? null
            );

            $tarefasDAO = new tarefasDAO();
            $updated = $tarefasDAO->update($tarefa);

            if (!$updated) {
                throw new Exception('Tarefa não encontrada ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Tarefa atualizada com sucesso',
                data: ['tarefa' => $tarefa],
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

    public function editStatus(int $id, array $data): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($data['status_task'])) {
                throw new Exception('Status é obrigatório');
            }

            $tarefasDAO = new tarefasDAO();
            $updated = $tarefasDAO->atualizarStatus($id, $data['status_task']);

            if (!$updated) {
                throw new Exception('Tarefa não encontrada ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Status atualizado com sucesso',
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

    public function editResponsavel(int $id, array $data): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($data['id_responsavel'])) {
                throw new Exception('Responsável é obrigatório');
            }

            $tarefasDAO = new tarefasDAO();
            $updated = $tarefasDAO->atribuirResponsavel($id, (int)$data['id_responsavel']);

            if (!$updated) {
                throw new Exception('Tarefa não encontrada ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Responsável atribuído com sucesso',
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

            $tarefasDAO = new tarefasDAO();
            $tarefasDAO->delete($id);

            (new Response(
                success: true,
                message: 'Tarefa excluída com sucesso',
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
