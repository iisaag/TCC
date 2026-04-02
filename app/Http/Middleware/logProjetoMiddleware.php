<?php
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../DAO/projetosDAO.php';
require_once __DIR__ . '/../DAO/usuariosDAO.php';

class logProjetoMiddleware
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
        if (!isset($std->log_projeto)) {
            (new Response(false, 'Log inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto log_projeto',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidIdProjeto($idProjeto): self
    {
        if (!isset($idProjeto)) {
            return $this;
        }
        if (!is_numeric($idProjeto) || (int)$idProjeto <= 0) {
            (new Response(false, 'Projeto inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo id_projeto deve ser um ID válido',
            ], null, 400))->send();
            exit();
        }
        $projetosDAO = new projetosDAO();
        if (!$projetosDAO->readById((int)$idProjeto)) {
            (new Response(false, 'Projeto não encontrado', [
                'codigoError' => 'validation_error',
                'message'     => 'O projeto informado não existe',
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

    public function isValidMensagem(?string $mensagem): self
    {
        if (!isset($mensagem) || strlen(trim($mensagem)) === 0) {
            (new Response(false, 'Mensagem inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'A mensagem do log é obrigatória',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $l   = $std->log_projeto;
        $this->isValidIdProjeto($l->id_projeto   ?? null)
             ->isValidIdUsuario($l->id_usuario   ?? null)
             ->isValidMensagem($l->mensagem      ?? null);
        return $std;
    }
}