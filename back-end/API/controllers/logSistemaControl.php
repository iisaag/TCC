<?php
require_once __DIR__ . '/../src/DAO/logSistemaDAO.php';
require_once __DIR__ . '/../src/models/logSistema.php';
require_once __DIR__ . '/../src/DB/Database.php';
require_once __DIR__ . '/../http/Response.php';

class logSistemaControl
{
    public function index(): void
    {
        try {
            $dao = new logSistemaDAO();

            $usuarioId = isset($_GET['usuario_id']) ? (int)$_GET['usuario_id'] : null;
            $acao      = $_GET['acao'] ?? null;

            if ($usuarioId) {
                $logs = $dao->readByUsuarioId($usuarioId);
            } elseif ($acao) {
                $logs = $dao->readByAcao($acao);
            } else {
                $logs = $dao->readAll();
            }

            (new Response(
                success: true,
                message: 'Logs do sistema listados com sucesso',
                data: ['logs' => $logs],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar logs: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $dao = new logSistemaDAO();
            $log = $dao->readById($id);

            if (!$log) {
                (new Response(
                    success: false,
                    message: 'Log não encontrado',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_log_sistema' => $log->getIdLogSistema(),
                'id_usuario'     => $log->getIdUsuario(),
                'acao'           => $log->getAcao(),
                'descricao'      => $log->getDescricao(),
                'data_hora'      => $log->getDataHora(),
            ];

            (new Response(
                success: true,
                message: 'Log encontrado com sucesso',
                data: ['log' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar log: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['id_usuario'])) {
                throw new Exception('id_usuario é obrigatório');
            }
            if (empty($data['acao'])) {
                throw new Exception('acao é obrigatória');
            }
            if (empty($data['descricao'])) {
                throw new Exception('descricao é obrigatória');
            }

            $log = new logSistema(
                id_log_sistema: null,
                id_usuario:     (int)$data['id_usuario'],
                acao:           $data['acao'],
                descricao:      $data['descricao']
            );

            $dao = new logSistemaDAO();
            $log = $dao->create($log);

            (new Response(
                success: true,
                message: 'Log registrado com sucesso',
                data: ['log' => $log],
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

            $dao = new logSistemaDAO();
            $dao->delete($id);

            (new Response(
                success: true,
                message: 'Log excluído com sucesso',
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

    public function totalPorUsuario(): void
    {
        try {
            $dao   = new logSistemaDAO();
            $total = $dao->totalLogsPorUsuario();

            (new Response(
                success: true,
                message: 'Total de logs por usuário obtido com sucesso',
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

    public function totalPorAcao(): void
    {
        try {
            $dao   = new logSistemaDAO();
            $total = $dao->totalLogsPorAcao();

            (new Response(
                success: true,
                message: 'Total de logs por ação obtido com sucesso',
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
}