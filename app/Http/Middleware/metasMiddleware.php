<?php
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../DAO/projetosDAO.php';

class metasMiddleware
{
    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Meta inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->meta)) {
            (new Response(false, 'Meta inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto meta',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidIdProjeto($idProjeto): self
    {
        if (!isset($idProjeto) || !is_numeric($idProjeto) || (int)$idProjeto <= 0) {
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

    public function isValidTituloMeta(?string $titulo): self
    {
        if (!isset($titulo) || strlen(trim($titulo)) < 2) {
            (new Response(false, 'Título inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O título da meta deve ter pelo menos 2 caracteres',
            ], null, 400))->send();
            exit();
        }
        if (strlen($titulo) > 150) {
            (new Response(false, 'Título inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O título da meta deve ter no máximo 150 caracteres',
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

    public function isValidStatusMeta(?string $status): self
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
        $m   = $std->meta;
        $this->isValidIdProjeto($m->id_projeto              ?? null)
             ->isValidTituloMeta($m->titulo_meta            ?? null)
             ->isValidData($m->prazo_meta ?? null,           'prazo_meta')
             ->isValidData($m->data_conclusao_meta ?? null,  'data_conclusao_meta')
             ->isValidStatusMeta($m->status_meta            ?? null);
        if (isset($std->meta->status_meta)) {
            $std->meta->status_meta = strtoupper(trim($m->status_meta));
        }
        return $std;
    }

    public function validarDadosEdicao(): stdClass
    {
        return $this->validarDadosCriacao();
    }
}