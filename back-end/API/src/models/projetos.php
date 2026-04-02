<?php
declare(strict_types=1);

class projetos implements JsonSerializable
{
    public function __construct(
        private ?int    $id_projeto      = null,
        private string  $nome_projeto    = '',
        private ?string $descricao       = null,
        private ?string $data_inicio     = null,
        private ?string $prazo_final     = null,
        private ?string $status_projeto  = null,
        private ?string $prioridade_proj = null
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_projeto'      => $this->getIdProjeto(),
            'nome_projeto'    => $this->getNomeProjeto(),
            'descricao'       => $this->getDescricao(),
            'data_inicio'     => $this->getDataInicio(),
            'prazo_final'     => $this->getPrazoFinal(),
            'status_projeto'  => $this->getStatusProjeto(),
            'prioridade_proj' => $this->getPrioridadeProj(),
        ];
    }

    public function getIdProjeto(): ?int { return $this->id_projeto; }
    public function setIdProjeto(int $id): self { $this->id_projeto = $id; return $this; }

    public function getNomeProjeto(): string { return $this->nome_projeto; }
    public function setNomeProjeto(string $nome): self
    {
        $nome = trim($nome);
        $nome = preg_replace('/\s+/', ' ', $nome);
        $nome = mb_convert_case(mb_strtolower($nome, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        $this->nome_projeto = $nome;
        return $this;
    }

    public function getDescricao(): ?string { return $this->descricao; }
    public function setDescricao(?string $descricao): self { $this->descricao = $descricao; return $this; }

    public function getDataInicio(): ?string { return $this->data_inicio; }
    public function setDataInicio(?string $data): self { $this->data_inicio = $data; return $this; }

    public function getPrazoFinal(): ?string { return $this->prazo_final; }
    public function setPrazoFinal(?string $prazo): self { $this->prazo_final = $prazo; return $this; }

    public function getStatusProjeto(): ?string { return $this->status_projeto; }
    public function setStatusProjeto(?string $status): self
    {
        $this->status_projeto = $status ? trim($status) : null;
        return $this;
    }

    public function getPrioridadeProj(): ?string { return $this->prioridade_proj; }
    public function setPrioridadeProj(?string $prioridade): self
    {
        $this->prioridade_proj = $prioridade ? strtoupper(trim($prioridade)) : null;
        return $this;
    }
}