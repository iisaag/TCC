<?php
require_once __DIR__ . '/../Http/response.php';
require_once __DIR__ . '/../DAO/cargosDAO.php';

class usuariosMiddleware
{
    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Usuário inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->usuario)) {
            (new Response(false, 'Usuário inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto usuario',
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
                'message'     => 'O nome deve ter pelo menos 2 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidEmail(?string $email): self
    {
        if (!isset($email) || !filter_var(trim($email), FILTER_VALIDATE_EMAIL)) {
            (new Response(false, 'E-mail inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O e-mail informado não é válido',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidCargo(?string $cargo): self
    {
        if (!isset($cargo)) {
            return $this; // cargo é opcional
        }

        $cargosDAO = new cargosDAO();
        $existe = $cargosDAO->readByNome($cargo);
        if (!$existe) {
            (new Response(false, 'Cargo não encontrado', [
                'codigoError' => 'validation_error',
                'message'     => 'O cargo informado não existe',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidNivel(?string $nivel): self
    {
        if (!isset($nivel)) {
            return $this; // nivel é opcional
        }
        if (strlen(trim($nivel)) < 1) {
            (new Response(false, 'Nível inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O nível informado não é válido',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    private function normalizarNome(string $nome): string
    {
        return mb_convert_case(trim(preg_replace('/\s+/', ' ', $nome)), MB_CASE_TITLE, 'UTF-8');
    }

    private function normalizarEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $u   = $std->usuario;

        $this->isValidNome($u->nome   ?? null)
             ->isValidEmail($u->email ?? null)
             ->isValidCargo($u->cargo ?? null)
             ->isValidNivel($u->nivel ?? null);

        $std->usuario->nome  = $this->normalizarNome($u->nome);
        $std->usuario->email = $this->normalizarEmail($u->email);
        return $std;
    }

    public function validarDadosEdicao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $u   = $std->usuario;

        $this->isValidNome($u->nome   ?? null)
             ->isValidCargo($u->cargo ?? null)
             ->isValidNivel($u->nivel ?? null);

        $std->usuario->nome = $this->normalizarNome($u->nome);
        return $std;
        // e-mail não é editável, por isso não é revalidado aqui
    }
}