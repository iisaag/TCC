<?php
require_once __DIR__ . '/../src/DAO/equipesDAO.php';
require_once __DIR__ . '/../src/models/equipes.php';
require_once __DIR__ . '/../src/DB/Database.php';
require_once __DIR__ . '/../http/Response.php';
require_once __DIR__ . '/../utils/logger.php';

class equipesControl
{
    public function index(): void
    {
        try {
            $equipesDAO = new equipesDAO();

            $porNome          = $_GET['nome']       ?? null;
            $porTipo          = $_GET['tipo']       ?? null;
            $porCriador       = isset($_GET['criado_por']) ? (int)$_GET['criado_por'] : null;
            $porPai           = isset($_GET['equipe_pai']) ? (int)$_GET['equipe_pai'] : null;
            $apenasPrincipais = isset($_GET['principais']);

            if ($porNome) {
                $equipes = $equipesDAO->readByNome($porNome);
            } elseif ($porTipo) {
                $equipes = $equipesDAO->readByTipo($porTipo);
            } elseif ($porCriador) {
                $equipes = $equipesDAO->readByCriadoPor($porCriador);
            } elseif ($porPai) {
                $equipes = $equipesDAO->readSubequipes($porPai);
            } elseif ($apenasPrincipais) {
                $equipes = $equipesDAO->readPrincipais();
            } else {
                $equipes = $equipesDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Equipes listadas com sucesso',
                data: ['equipes' => $equipes],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar equipes: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $equipesDAO = new equipesDAO();
            $equipe = $equipesDAO->readById($id);

            if (!$equipe) {
                (new Response(
                    success: false,
                    message: 'Equipe não encontrada',
                    httpCode: 404
                ))->send();
                return;
            }

            (new Response(
                success: true,
                message: 'Equipe encontrada com sucesso',
                data: ['equipe' => $equipe],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar equipe: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['nome'])) {
                throw new Exception('Nome da equipe é obrigatório');
            }

            if (empty($data['criado_por'])) {
                throw new Exception('Usuário responsável é obrigatório');
            }

            $equipe = new equipes(
                id_equipe:    null,
                nome:         $data['nome'],
                criado_por:   (int)$data['criado_por'],
                equipe_pai:   isset($data['equipe_pai']) ? (int)$data['equipe_pai'] : null,
                tipo:         $data['tipo'] ?? 'SUBEQUIPE',
                data_criacao: null
            );

            $equipesDAO = new equipesDAO();
            $equipe = $equipesDAO->create($equipe);

            (new Response(
                success: true,
                message: 'Equipe cadastrada com sucesso',
                data: ['equipe' => $equipe],
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

            if (empty($data['nome'])) {
                throw new Exception('Nome da equipe é obrigatório');
            }

            if (empty($data['criado_por'])) {
                throw new Exception('Usuário responsável é obrigatório');
            }

            $equipe = new equipes(
                id_equipe:    $id,
                nome:         $data['nome'],
                criado_por:   (int)$data['criado_por'],
                equipe_pai:   isset($data['equipe_pai']) ? (int)$data['equipe_pai'] : null,
                tipo:         $data['tipo'] ?? 'SUBEQUIPE',
                data_criacao: null
            );

            $equipesDAO = new equipesDAO();
            $updated = $equipesDAO->update($equipe);

            if (!$updated) {
                throw new Exception('Equipe não encontrada ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Equipe atualizada com sucesso',
                data: ['equipe' => $equipe],
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

    public function totalSubequipes(): void
    {
        try {
            $equipesDAO = new equipesDAO();
            $total = $equipesDAO->totalSubequipesPorEquipe();

            (new Response(
                success: true,
                message: 'Total de subequipes por equipe obtido com sucesso',
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

            $equipesDAO = new equipesDAO();
            $equipesDAO->delete($id);

            (new Response(
                success: true,
                message: 'Equipe excluída com sucesso',
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