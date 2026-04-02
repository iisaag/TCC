<?php
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../DAO/usuariosDAO.php';
require_once __DIR__ . '/../DAO/equipesDAO.php';

class equipesMiddleware
{
    private const TIPOS_VALIDOS = ['EMPRESA', 'SUBEQUIPE'];

    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Equipe inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->equipe)) {
            (new Response(false, 'Equipe inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto equipe',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidNome(?string $nome): self
    {
        if (!isset($nome) || strlen(trim($nome)) < 2) {
            (new Response(false, 'Nome inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O nome da equipe deve ter pelo menos 2 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidCriadoPor($criado_por): self
    {
        if (!isset($criado_por) || !is_numeric($criado_por) || (int)$criado_por <= 0) {
            (new Response(false, 'Responsável inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo criado_por deve ser um ID de usuário válido',
            ], null, 400))->send();
            exit();
        }

        $usuariosDAO = new usuariosDAO();
        if (!$usuariosDAO->readById((int)$criado_por)) {
            (new Response(false, 'Usuário não encontrado', [
                'codigoError' => 'validation_error',
                'message'     => 'O usuário informado em criado_por não existe',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidEquipePai($equipe_pai): self
    {
        if (!isset($equipe_pai)) {
            return $this; // opcional
        }

        if (!is_numeric($equipe_pai) || (int)$equipe_pai <= 0) {
            (new Response(false, 'Equipe pai inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'O campo equipe_pai deve ser um ID válido',
            ], null, 400))->send();
            exit();
        }

        $equipesDAO = new equipesDAO();
        if (!$equipesDAO->readById((int)$equipe_pai)) {
            (new Response(false, 'Equipe pai não encontrada', [
                'codigoError' => 'validation_error',
                'message'     => 'A equipe pai informada não existe',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidTipo(?string $tipo): self
    {
        if (!isset($tipo)) {
            return $this; // usa default 'SUBEQUIPE'
        }

        if (!in_array(strtoupper(trim($tipo)), self::TIPOS_VALIDOS, true)) {
            (new Response(false, 'Tipo inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O tipo deve ser: ' . implode(', ', self::TIPOS_VALIDOS),
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    private function normalizarNome(string $nome): string
    {
        return mb_convert_case(trim(preg_replace('/\s+/', ' ', $nome)), MB_CASE_TITLE, 'UTF-8');
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $e   = $std->equipe;

        $this->isValidNome($e->nome           ?? null)
             ->isValidCriadoPor($e->criado_por ?? null)
             ->isValidEquipePai($e->equipe_pai ?? null)
             ->isValidTipo($e->tipo            ?? null);

        $std->equipe->nome = $this->normalizarNome($e->nome);
        if (isset($std->equipe->tipo)) {
            $std->equipe->tipo = strtoupper(trim($e->tipo));
        }
        return $std;
    }

    public function validarDadosEdicao(): stdClass
    {
        return $this->validarDadosCriacao();
    }
}