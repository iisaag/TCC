<?php
require_once __DIR__ . '/../http/response.php';
require_once __DIR__ . '/../DAO/projetosDAO.php';
require_once __DIR__ . '/../DAO/usuariosDAO.php';

class tarefasMiddleware
{
    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Tarefa inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->tarefa)) {
            (new Response(false, 'Tarefa inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto tarefa',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidTitulo(?string $titulo): self
    {
        if (!isset($titulo) || strlen(trim($titulo)) < 2) {
            (new Response(false, 'Título inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O título deve ter pelo menos 2 caracteres',
            ], null, 400))->send();
            exit();
        }
        if (strlen($titulo) > 150) {
            (new Response(false, 'Título inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O título deve ter no máximo 150 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
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

    public function isValidIdResponsavel($idResponsavel): self
    {
        if (!isset($idResponsavel)) {
            return $this;
        }
        if (!is_numeric($idResponsavel) || (int)$idResponsavel <= 0) {
            (new Response(false, 'Responsável inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo id_responsavel deve ser um ID válido',
            ], null, 400))->send();
            exit();
        }
        $usuariosDAO = new usuariosDAO();
        if (!$usuariosDAO->readById((int)$idResponsavel)) {
            (new Response(false, 'Responsável não encontrado', [
                'codigoError' => 'validation_error',
                'message'     => 'O usuário informado como responsável não existe',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidPrioridade(?string $prioridade): self
    {
        if (!isset($prioridade)) {
            return $this;
        }
        $permitidos = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
        if (!in_array(strtoupper(trim($prioridade)), $permitidos, true)) {
            (new Response(false, 'Prioridade inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Prioridade deve ser: BAIXA, MEDIA, ALTA ou CRITICA',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidData(?string $data, string $campo): self
    {
        if (!isset($data)) {
            return $this;
        }
        $d = \DateTime::createFromFormat('Y-m-d', $data);
        if (!$d || $d->format('Y-m-d') !== $data) {
            (new Response(false, "Data inválida: {$campo}", [
                'codigoError' => 'validation_error',
                'message'     => "O campo {$campo} deve estar no formato YYYY-MM-DD",
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidStatus(?string $status): self
    {
        if (!isset($status)) {
            return $this;
        }
        $permitidos = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
        if (!in_array(strtoupper(trim($status)), $permitidos, true)) {
            (new Response(false, 'Status inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Status deve ser: PENDENTE, EM_ANDAMENTO, CONCLUIDA ou CANCELADA',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $t   = $std->tarefa;
        $this->isValidTitulo($t->titulo                  ?? null)
             ->isValidIdProjeto($t->id_projeto           ?? null)
             ->isValidIdResponsavel($t->id_responsavel   ?? null)
             ->isValidPrioridade($t->prioridade_task     ?? null)
             ->isValidData($t->prazo ?? null,             'prazo')
             ->isValidStatus($t->status_task             ?? null);
        if (isset($std->tarefa->prioridade_task)) {
            $std->tarefa->prioridade_task = strtoupper(trim($t->prioridade_task));
        }
        if (isset($std->tarefa->status_task)) {
            $std->tarefa->status_task = strtoupper(trim($t->status_task));
        }
        return $std;
    }

    public function validarDadosEdicao(): stdClass
    {
        return $this->validarDadosCriacao();
    }
}