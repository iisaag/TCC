<?php
require_once __DIR__ . '/../http/Response.php';

class projetosMiddleware
{
    private const STATUS_VALIDOS     = ['PLANEJAMENTO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'];
    private const PRIORIDADES_VALIDAS = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];

    public function stringJsonToStdClass(string $requestBody): stdClass
    {
        $std = json_decode($requestBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            (new Response(false, 'Projeto inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Json inválido',
            ], null, 400))->send();
            exit();
        }
        if (!isset($std->projeto)) {
            (new Response(false, 'Projeto inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'Não foi enviado o objeto projeto',
            ], null, 400))->send();
            exit();
        }
        return $std;
    }

    public function isValidNomeProjeto(?string $nome): self
    {
        if (!isset($nome) || strlen(trim($nome)) < 2) {
            (new Response(false, 'Nome do projeto inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O nome do projeto deve ter pelo menos 2 caracteres',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidData(?string $data, string $campo): self
    {
        if (!isset($data)) {
            return $this; // datas são opcionais
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

    public function isValidPrazoAposInicio(?string $dataInicio, ?string $prazoFinal): self
    {
        if (!isset($dataInicio) || !isset($prazoFinal)) {
            return $this;
        }

        if ($prazoFinal < $dataInicio) {
            (new Response(false, 'Prazo inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O prazo_final não pode ser anterior à data_inicio',
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidStatus(?string $status): self
    {
        if (!isset($status)) {
            return $this; // opcional
        }

        if (!in_array(strtoupper(trim($status)), self::STATUS_VALIDOS, true)) {
            (new Response(false, 'Status inválido', [
                'codigoError' => 'validation_error',
                'message'     => 'O status deve ser: ' . implode(', ', self::STATUS_VALIDOS),
            ], null, 400))->send();
            exit();
        }
        return $this;
    }

    public function isValidPrioridade(?string $prioridade): self
    {
        if (!isset($prioridade)) {
            return $this; // opcional
        }

        if (!in_array(strtoupper(trim($prioridade)), self::PRIORIDADES_VALIDAS, true)) {
            (new Response(false, 'Prioridade inválida', [
                'codigoError' => 'validation_error',
                'message'     => 'A prioridade deve ser: ' . implode(', ', self::PRIORIDADES_VALIDAS),
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
        $p   = $std->projeto;

        $this->isValidNomeProjeto($p->nome_projeto   ?? null)
             ->isValidData($p->data_inicio           ?? null, 'data_inicio')
             ->isValidData($p->prazo_final            ?? null, 'prazo_final')
             ->isValidPrazoAposInicio($p->data_inicio ?? null, $p->prazo_final ?? null)
             ->isValidStatus($p->status_projeto       ?? null)
             ->isValidPrioridade($p->prioridade_proj  ?? null);

        $std->projeto->nome_projeto = $this->normalizarNome($p->nome_projeto);
        if (isset($std->projeto->status_projeto)) {
            $std->projeto->status_projeto = strtoupper(trim($p->status_projeto));
        }
        if (isset($std->projeto->prioridade_proj)) {
            $std->projeto->prioridade_proj = strtoupper(trim($p->prioridade_proj));
        }
        return $std;
    }

    public function validarDadosEdicao(): stdClass
    {
        return $this->validarDadosCriacao();
    }
}