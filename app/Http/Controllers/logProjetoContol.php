<?php
require_once __DIR__ . '/../DAO/logProjetoDAO.php';
require_once __DIR__ . '/../Models/logProjeto.php';
require_once __DIR__ . '/../Database.php';
require_once __DIR__ . '/../Http/response.php';

class logProjetoControl
{
    public function index(): void
    {
        try {
            $dao = new logProjetoDAO();

            $projetoId  = isset($_GET['projeto_id'])  ? (int)$_GET['projeto_id']  : null;
            $usuarioId  = isset($_GET['usuario_id'])  ? (int)$_GET['usuario_id']  : null;

            if ($projetoId) {
                $logs = $dao->readByProjetoId($projetoId);
            } elseif ($usuarioId) {
                $logs = $dao->readByUsuarioId($usuarioId);
            } else {
                $logs = $dao->readAll();
            }

            (new Response(
                success: true,
                message: 'Logs listados com sucesso',
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
            $dao = new logProjetoDAO();
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
                'id_log_projeto' => $log->getIdLogProjeto(),
                'id_projeto'     => $log->getIdProjeto(),
                'id_usuario'     => $log->getIdUsuario(),
                'mensagem'       => $log->getMensagem(),
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
            if (empty($data['id_projeto'])) {
                throw new Exception('id_projeto é obrigatório');
            }
            if (empty($data['id_usuario'])) {
                throw new Exception('id_usuario é obrigatório');
            }
            if (empty($data['mensagem'])) {
                throw new Exception('mensagem é obrigatória');
            }

            $log = new logProjeto(
                id_log_projeto: null,
                id_projeto:     (int)$data['id_projeto'],
                id_usuario:     (int)$data['id_usuario'],
                mensagem:       $data['mensagem']
            );

            $dao = new logProjetoDAO();
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

            $dao = new logProjetoDAO();
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

    public function totalPorProjeto(): void
    {
        try {
            $dao   = new logProjetoDAO();
            $total = $dao->totalLogsPorProjeto();

            (new Response(
                success: true,
                message: 'Total de logs por projeto obtido com sucesso',
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
