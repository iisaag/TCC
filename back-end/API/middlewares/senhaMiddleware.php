<?php
require_once __DIR__ . '/../http/Response.php';

class senhaMiddleware
{
    private const NIVEIS_VALIDOS = ['admin', 'gestor', 'colaborador'];

    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Dados inválidos', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->senha)) {
            (new Response(false, 'Dados inválidos', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto senha',
            ], null, 400))->send();
            exit();
        }
        return $std;
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

    public function isValidSenha(?string $senha): self
    {
        if (!isset($senha) || strlen($senha) < 6) {
            (new Response(false, 'Senha inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'A senha deve ter pelo menos 6 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidNivelAcesso(?string $nivel_acesso): self
    {
        if (!isset($nivel_acesso) || !in_array(strtolower(trim($nivel_acesso)), self::NIVEIS_VALIDOS, true)) {
            (new Response(false, 'Nível de acesso inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O nível de acesso deve ser: ' . implode(', ', self::NIVEIS_VALIDOS),
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function validarDadosCriacao(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $s   = $std->senha;

        $this->isValidEmail($s->email             ?? null)
             ->isValidSenha($s->senha              ?? null)
             ->isValidNivelAcesso($s->nivel_acesso ?? null);

        $std->senha->email        = strtolower(trim($s->email));
        $std->senha->nivel_acesso = strtolower(trim($s->nivel_acesso));
        return $std;
    }

    public function validarTrocaSenha(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $this->isValidSenha($std->senha->senha ?? null);
        return $std;
    }

    public function validarTrocaNivelAcesso(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $this->isValidNivelAcesso($std->senha->nivel_acesso ?? null);
        $std->senha->nivel_acesso = strtolower(trim($std->senha->nivel_acesso));
        return $std;
    }

    public function validarLogin(): stdClass
    {
        $std = $this->stringJsonToStdClass(file_get_contents('php://input'));
        $s   = $std->senha;

        $this->isValidEmail($s->email ?? null)
             ->isValidSenha($s->senha ?? null);

        $std->senha->email = strtolower(trim($s->email));
        return $std;
    }
}