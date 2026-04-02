<?php
require_once __DIR__ . '/../http/response.php';
require_once __DIR__ . '/../DAO/tarefasDAO.php';
require_once __DIR__ . '/../DAO/usuariosDAO.php';

class historicoProgressoMiddleware
{
    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Histórico inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->historico)) {
            (new Response(false, 'Histórico inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto historico',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidIdTarefa($idTarefa): self
    {
        if (!isset($idTarefa) || !is_numeric($idTarefa) || (int)$idTarefa <= 0) {
            (new Response(false, 'Tarefa inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo id_tarefa deve ser um ID válido',
            ], null, 400))->send();
            exit();
        }
        $tarefasDAO = new tarefasDAO();
        if (!$tarefasDAO->readById((int)$idTarefa)) {
            (new Response(false, 'Tarefa não encontrada', [
                'codigoError' => 'validation_error',
                'message'     => 'A tarefa informada não existe',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidProgresso($progresso): self
    {
        if (!isset($progresso) || !is_numeric($progresso)) {
            (new Response(false, 'Progresso inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo progresso é obrigatório e deve ser numérico',
            ], null, 400))->send();
            exit();
        }
        if ((int)$progresso < 0 || (int)$progresso > 100) {
            (new Response(false, 'Progresso inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O progresso deve ser um valor entre 0 e 100',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidIdUsuario($idUsuario): self
    {
        if (!isset($idUsuario)) {
            return $this;
        }
        if (!is_numeric($idUsuario) || (int)$idUsuario <= 0) {
            (new Response(false, 'Usuário inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo id_usuario deve ser um ID válido',
            ], null, 400))->send();
            exit();
        }
        $usuariosDAO = new usuariosDAO();
        if (!$usuariosDAO->readById((int)$idUsuario)) {
            (new Response(false, 'Usuário não encontrado', [
                'codigoError' => 'validation_error',
                'message'     => 'O usuário informado não existe',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $h   = $std->historico;
        $this->isValidIdTarefa($h->id_tarefa   ?? null)
             ->isValidProgresso($h->progresso  ?? null)
             ->isValidIdUsuario($h->id_usuario ?? null);
        return $std;
    }
}