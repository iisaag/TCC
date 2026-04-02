<?php
require_once __DIR__ . '/../http/response.php';

class CargosMiddleware
{
    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Cargo inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->cargo)) {
            (new Response(false, 'Cargo inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto cargo',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidNomeCargo(?string $nome): self
    {
        if (!isset($nome) || strlen(trim($nome)) < 2) {
            (new Response(false, 'Nome do cargo inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O nome do cargo deve ter pelo menos 2 caracteres',
            ], null, 400))->send();
            exit();
        }
        if (strlen($nome) > 100) {
            (new Response(false, 'Nome do cargo inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O nome do cargo deve ter no máximo 100 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    private function normalizarNomeCargo(string $nome): string
    {
        return mb_convert_case(trim(preg_replace('/\s+/', ' ', $nome)), MB_CASE_TITLE, 'UTF-8');
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $this->isValidNomeCargo($std->cargo->nome_cargo ?? null);
        $std->cargo->nome_cargo = $this->normalizarNomeCargo($std->cargo->nome_cargo);
        return $std;
    }

    public function validarDadosEdicao(): stdClass
    {
        return $this->validarDadosCriacao();
    }
}