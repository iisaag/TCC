<?php
require_once __DIR__ . '/../DAO/historicoProgressoDAO.php';
require_once __DIR__ . '/../Models/historicoProgresso.php';
require_once __DIR__ . '/../Models/tarefas.php';
require_once __DIR__ . '/../Models/usuarios.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../Utils/logger.php';

class historicoProgressoControl
{
    public function create(historicoProgresso $historico): historicoProgresso
    {
        $id = $historico->getIdHistorico();
        if (isset($id)) {
            return $this->createWithId($historico);
        } else {
            return $this->createWithoutId($historico);
        }
    }

    private function createWithoutId(historicoProgresso $historico): historicoProgresso
    {
        $query = 'INSERT INTO historico_progresso (
                    id_tarefa,
                    progresso,
                    id_usuario
                ) VALUES (
                    :id_tarefa,
                    :progresso,
                    :id_usuario )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_tarefa',  $historico->getTarefa()?->getIdTarefa(),     PDO::PARAM_INT);
        $statement->bindValue(':progresso',  $historico->getProgresso(),                  PDO::PARAM_INT);
        $statement->bindValue(':id_usuario', $historico->getUsuario()?->getIdUsuario(),   PDO::PARAM_INT);

        $statement->execute();

        $historico->setIdHistorico((int) Database::getConnection()->lastInsertId());

        return $historico;
    }

    private function createWithId(historicoProgresso $historico): historicoProgresso
    {
        $query = 'INSERT INTO historico_progresso (
                    id_historico,
                    id_tarefa,
                    progresso,
                    id_usuario
                ) VALUES (
                    :id_historico,
                    :id_tarefa,
                    :progresso,
                    :id_usuario )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_historico', $historico->getIdHistorico(),               PDO::PARAM_INT);
        $statement->bindValue(':id_tarefa',    $historico->getTarefa()?->getIdTarefa(),    PDO::PARAM_INT);
        $statement->bindValue(':progresso',    $historico->getProgresso(),                 PDO::PARAM_INT);
        $statement->bindValue(':id_usuario',   $historico->getUsuario()?->getIdUsuario(),  PDO::PARAM_INT);

        $statement->execute();

        return $historico;
    }

    // -------------------------------------------------------------------------
    // Monta um objeto historicoProgresso a partir de uma linha do banco
    // -------------------------------------------------------------------------
    private function hydrate(object $linha): historicoProgresso
    {
        $tarefa = null;
        if (!empty($linha->id_tarefa)) {
            $tarefa = new tarefas(
                id_tarefa:       $linha->id_tarefa,
                titulo:          $linha->tarefa_titulo     ?? null,
                descricao:       null,
                projeto:         null,
                responsavel:     null,
                prioridade_task: $linha->tarefa_prioridade ?? null,
                prazo:           $linha->tarefa_prazo      ?? null,
                status_task:     $linha->tarefa_status     ?? null
            );
        }

        $usuario = null;
        if (!empty($linha->id_usuario)) {
            $usuario = new usuarios(
                id_usuario:   $linha->id_usuario,
                nome:         $linha->usuario_nome  ?? null,
                email:        $linha->usuario_email ?? null,
                foto_perfil:  $linha->usuario_foto  ?? null,
                cargo:        new cargos(),
                nivel:        null,
                data_criacao: null
            );
        }

        return new historicoProgresso(
            id_historico:     $linha->id_historico,
            tarefa:           $tarefa,
            progresso:        $linha->progresso,
            data_atualizacao: $linha->data_atualizacao ?? null,
            usuario:          $usuario
        );
    }

    // -------------------------------------------------------------------------
    // Query base reutilizada em todos os reads
    // -------------------------------------------------------------------------
    private function baseQuery(): string
    {
        return '
        SELECT
            h.id_historico,
            h.progresso,
            h.data_atualizacao,
            t.id_tarefa,
            t.titulo          AS tarefa_titulo,
            t.prioridade_task AS tarefa_prioridade,
            t.prazo           AS tarefa_prazo,
            t.status_task     AS tarefa_status,
            u.id_usuario,
            u.nome            AS usuario_nome,
            u.email           AS usuario_email,
            u.foto_perfil     AS usuario_foto
        FROM historico_progresso h
        LEFT JOIN tarefas  t ON h.id_tarefa  = t.id_tarefa
        LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario';
    }

    public function readAll(): array
    {
        $query = $this->baseQuery() . ' ORDER BY h.data_atualizacao DESC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readById(int $id): ?historicoProgresso
    {
        $query = $this->baseQuery() . '
        WHERE h.id_historico = :id_historico
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_historico', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        return $this->hydrate($linha);
    }

    public function readByTarefa(int $idTarefa): array
    {
        $query = $this->baseQuery() . '
        WHERE h.id_tarefa = :id_tarefa
        ORDER BY h.data_atualizacao DESC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_tarefa', $idTarefa, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function readByUsuario(int $idUsuario): array
    {
        $query = $this->baseQuery() . '
        WHERE h.id_usuario = :id_usuario
        ORDER BY h.data_atualizacao DESC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $idUsuario, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Histórico de uma tarefa por um usuário específico
    public function readByTarefaEUsuario(int $idTarefa, int $idUsuario): array
    {
        $query = $this->baseQuery() . '
        WHERE h.id_tarefa  = :id_tarefa
          AND h.id_usuario = :id_usuario
        ORDER BY h.data_atualizacao DESC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_tarefa',  $idTarefa,  PDO::PARAM_INT);
        $statement->bindValue(':id_usuario', $idUsuario, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Registros dentro de um intervalo de datas
    public function readByPeriodo(string $dataInicio, string $dataFim): array
    {
        $query = $this->baseQuery() . '
        WHERE h.data_atualizacao BETWEEN :data_inicio AND :data_fim
        ORDER BY h.data_atualizacao DESC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':data_inicio', $dataInicio, PDO::PARAM_STR);
        $statement->bindValue(':data_fim',    $dataFim,    PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    // Último registro de progresso de uma tarefa
    public function readUltimoByTarefa(int $idTarefa): ?historicoProgresso
    {
        $query = $this->baseQuery() . '
        WHERE h.id_tarefa = :id_tarefa
        ORDER BY h.data_atualizacao DESC
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_tarefa', $idTarefa, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        return $this->hydrate($linha);
    }

    // Registros com progresso acima de um valor mínimo
    public function readByProgressoMinimo(int $progressoMinimo): array
    {
        $query = $this->baseQuery() . '
        WHERE h.progresso >= :progresso
        ORDER BY h.data_atualizacao DESC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':progresso', $progressoMinimo, PDO::PARAM_INT);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $resultados[] = $this->hydrate($linha);
        }
        return $resultados;
    }

    public function totalRegistrosPorTarefa(): void
    {
        try {
            $historicoDAO = new historicoProgressoDAO();
            $total = $historicoDAO->totalRegistrosPorTarefa();

            (new Response(
                success: true,
                message: 'Total de registros por tarefa obtido com sucesso',
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

    public function totalRegistrosPorUsuario(): void
    {
        try {
            $historicoDAO = new historicoProgressoDAO();
            $total = $historicoDAO->totalRegistrosPorUsuario();

            (new Response(
                success: true,
                message: 'Total de registros por usuário obtido com sucesso',
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
            $historicoDAO = new historicoProgressoDAO();

            $porTarefa      = isset($_GET['id_tarefa'])  ? (int)$_GET['id_tarefa']  : null;
            $porUsuario     = isset($_GET['id_usuario']) ? (int)$_GET['id_usuario'] : null;
            $dataInicio     = $_GET['data_inicio']       ?? null;
            $dataFim        = $_GET['data_fim']          ?? null;
            $progressoMin   = isset($_GET['progresso_min']) ? (int)$_GET['progresso_min'] : null;

            if ($porTarefa && $porUsuario) {
                $historicos = $historicoDAO->readByTarefaEUsuario($porTarefa, $porUsuario);
            } elseif ($porTarefa) {
                $historicos = $historicoDAO->readByTarefa($porTarefa);
            } elseif ($porUsuario) {
                $historicos = $historicoDAO->readByUsuario($porUsuario);
            } elseif ($dataInicio && $dataFim) {
                $historicos = $historicoDAO->readByPeriodo($dataInicio, $dataFim);
            } elseif ($progressoMin !== null) {
                $historicos = $historicoDAO->readByProgressoMinimo($progressoMin);
            } else {
                $historicos = $historicoDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Histórico listado com sucesso',
                data: ['historico' => $historicos],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar histórico: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $historico = $this->readById($id);

            if (!$historico) {
                (new Response(
                    success: false,
                    message: 'Registro não encontrado',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_historico'     => $historico->getIdHistorico(),
                'progresso'        => $historico->getProgresso(),
                'data_atualizacao' => $historico->getDataAtualizacao(),
                'tarefa' => $historico->getTarefa() ? [
                    'id_tarefa'       => $historico->getTarefa()->getIdTarefa(),
                    'titulo'          => $historico->getTarefa()->getTitulo(),
                    'status_task'     => $historico->getTarefa()->getStatusTask(),
                    'prioridade_task' => $historico->getTarefa()->getPrioridadeTask(),
                    'prazo'           => $historico->getTarefa()->getPrazo(),
                ] : null,
                'usuario' => $historico->getUsuario() ? [
                    'id_usuario'  => $historico->getUsuario()->getIdUsuario(),
                    'nome'        => $historico->getUsuario()->getNome(),
                    'email'       => $historico->getUsuario()->getEmail(),
                    'foto_perfil' => $historico->getUsuario()->getFotoPerfil(),
                ] : null,
            ];

            (new Response(
                success: true,
                message: 'Registro encontrado com sucesso',
                data: ['historico' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar registro: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function showUltimo(int $idTarefa): void
    {
        try {
            $historico = $this->readUltimoByTarefa($idTarefa);

            if (!$historico) {
                (new Response(
                    success: false,
                    message: 'Nenhum registro encontrado para esta tarefa',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_historico'     => $historico->getIdHistorico(),
                'progresso'        => $historico->getProgresso(),
                'data_atualizacao' => $historico->getDataAtualizacao(),
                'tarefa' => $historico->getTarefa() ? [
                    'id_tarefa'   => $historico->getTarefa()->getIdTarefa(),
                    'titulo'      => $historico->getTarefa()->getTitulo(),
                    'status_task' => $historico->getTarefa()->getStatusTask(),
                ] : null,
                'usuario' => $historico->getUsuario() ? [
                    'id_usuario' => $historico->getUsuario()->getIdUsuario(),
                    'nome'       => $historico->getUsuario()->getNome(),
                ] : null,
            ];

            (new Response(
                success: true,
                message: 'Último registro obtido com sucesso',
                data: ['historico' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar último registro: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['progresso']) && $data['progresso'] !== 0) {
                throw new Exception('Progresso é obrigatório');
            }

            if ($data['progresso'] < 0 || $data['progresso'] > 100) {
                throw new Exception('Progresso deve ser um valor entre 0 e 100');
            }

            $tarefa = null;
            if (!empty($data['tarefa']['id_tarefa'])) {
                $tarefa = new tarefas(
                    id_tarefa:       $data['tarefa']['id_tarefa'],
                    titulo:          $data['tarefa']['titulo'] ?? '',
                    descricao:       null,
                    projeto:         null,
                    responsavel:     null,
                    prioridade_task: null,
                    prazo:           null,
                    status_task:     null
                );
            }

            $usuario = null;
            if (!empty($data['usuario']['id_usuario'])) {
                $usuario = new usuarios(
                    id_usuario:   $data['usuario']['id_usuario'],
                    nome:         $data['usuario']['nome']  ?? '',
                    email:        $data['usuario']['email'] ?? '',
                    foto_perfil:  null,
                    cargo:        new cargos(),
                    nivel:        null,
                    data_criacao: null
                );
            }

            $historico = new historicoProgresso(
                id_historico:     null,
                tarefa:           $tarefa,
                progresso:        (int)$data['progresso'],
                data_atualizacao: null,
                usuario:          $usuario
            );

            $historicoDAO = new historicoProgressoDAO();
            $historico = $historicoDAO->create($historico);

            (new Response(
                success: true,
                message: 'Progresso registrado com sucesso',
                data: ['historico' => $historico],
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

            $historicoDAO = new historicoProgressoDAO();
            $historicoDAO->delete($id);

            (new Response(
                success: true,
                message: 'Registro excluído com sucesso',
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
