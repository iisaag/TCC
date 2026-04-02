<?php
require_once __DIR__ . '/../DAO/projetosDAO.php';
require_once __DIR__ . '/../Models/projetos.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../Utils/logger.php';

class projetosControl
{
    public function index(): void
    {
        try {
            $projetosDAO = new projetosDAO();

            $porNome       = $_GET['nome']       ?? null;
            $porStatus     = $_GET['status']     ?? null;
            $porPrioridade = $_GET['prioridade'] ?? null;

            if ($porNome) {
                $projetos = $projetosDAO->readByNome($porNome);
            } elseif ($porStatus) {
                $projetos = $projetosDAO->readByStatus($porStatus);
            } elseif ($porPrioridade) {
                $projetos = $projetosDAO->readByPrioridade($porPrioridade);
            } else {
                $projetos = $projetosDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Projetos listados com sucesso',
                data: ['projetos' => $projetos],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar projetos: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $projetosDAO = new projetosDAO();
            $projeto = $projetosDAO->readById($id);

            if (!$projeto) {
                (new Response(
                    success: false,
                    message: 'Projeto não encontrado',
                    httpCode: 404
                ))->send();
                return;
            }

            (new Response(
                success: true,
                message: 'Projeto encontrado com sucesso',
                data: ['projeto' => $projeto],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar projeto: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['nome_projeto'])) {
                throw new Exception('Nome do projeto é obrigatório');
            }

            $projeto = new projetos(
                id_projeto:      null,
                nome_projeto:    $data['nome_projeto'],
                descricao:       $data['descricao']       ?? null,
                data_inicio:     $data['data_inicio']     ?? null,
                prazo_final:     $data['prazo_final']     ?? null,
                status_projeto:  $data['status_projeto']  ?? null,
                prioridade_proj: $data['prioridade_proj'] ?? null
            );

            $projetosDAO = new projetosDAO();
            $projeto = $projetosDAO->create($projeto);

            (new Response(
                success: true,
                message: 'Projeto cadastrado com sucesso',
                data: ['projeto' => $projeto],
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

            if (empty($data['nome_projeto'])) {
                throw new Exception('Nome do projeto é obrigatório');
            }

            $projeto = new projetos(
                id_projeto:      $id,
                nome_projeto:    $data['nome_projeto'],
                descricao:       $data['descricao']       ?? null,
                data_inicio:     $data['data_inicio']     ?? null,
                prazo_final:     $data['prazo_final']     ?? null,
                status_projeto:  $data['status_projeto']  ?? null,
                prioridade_proj: $data['prioridade_proj'] ?? null
            );

            $projetosDAO = new projetosDAO();
            $updated = $projetosDAO->update($projeto);

            if (!$updated) {
                throw new Exception('Projeto não encontrado ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Projeto atualizado com sucesso',
                data: ['projeto' => $projeto],
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

    public function totalPorStatus(): void
    {
        try {
            $projetosDAO = new projetosDAO();
            $total = $projetosDAO->totalPorStatus();

            (new Response(
                success: true,
                message: 'Total de projetos por status obtido com sucesso',
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

    public function delete(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            $projetosDAO = new projetosDAO();
            $projetosDAO->delete($id);

            (new Response(
                success: true,
                message: 'Projeto excluído com sucesso',
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
