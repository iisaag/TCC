<?php
require_once __DIR__ . '/../http/response.php';
require_once __DIR__ . '/../DAO/usuariosDAO.php';

class logSistemaMiddleware
{
    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Log inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->log_sistema)) {
            (new Response(false, 'Log inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto log_sistema',
            ], null, 400))->send();
            exit();
        }
        return $std;
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

    public function isValidAcao(?string $acao): self
    {
        if (!isset($acao) || strlen(trim($acao)) === 0) {
            (new Response(false, 'Ação inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo acao é obrigatório',
            ], null, 400))->send();
            exit();
        }
        if (strlen($acao) > 200) {
            (new Response(false, 'Ação inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo acao deve ter no máximo 200 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidDescricao(?string $descricao): self
    {
        if (!isset($descricao) || strlen(trim($descricao)) === 0) {
            (new Response(false, 'Descrição inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo descricao é obrigatório',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $l   = $std->log_sistema;
        $this->isValidIdUsuario($l->id_usuario ?? null)
             ->isValidAcao($l->acao            ?? null)
             ->isValidDescricao($l->descricao  ?? null);
        return $std;
    }
}