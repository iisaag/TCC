<?php
declare(strict_types=1);

class equipes implements JsonSerializable
{
    public function __construct(
        private ?int    $id_equipe    = null,
        private string  $nome         = '',
        private int     $criado_por   = 0,
        private ?int    $equipe_pai   = null,
        private string  $tipo         = 'SUBEQUIPE',
        private ?string $data_criacao = null
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_equipe'    => $this->getIdEquipe(),
            'nome'         => $this->getNome(),
            'criado_por'   => $this->getCriadoPor(),
            'equipe_pai'   => $this->getEquipePai(),
            'tipo'         => $this->getTipo(),
            'data_criacao' => $this->getDataCriacao(),
        ];
    }

    // --- id_equipe ---
    public function getIdEquipe(): ?int { return $this->id_equipe; }
    public function setIdEquipe(int $id_equipe): self
    {
        $this->id_equipe = $id_equipe;
        return $this;
    }

    // --- nome ---
    public function getNome(): string { return $this->nome; }
    public function setNome(string $nome): self
    {
        $nome = trim($nome);
        $nome = mb_strtolower($nome, 'UTF-8');
        $nome = preg_replace('/\s+/', ' ', $nome);
        $nome = mb_convert_case($nome, MB_CASE_TITLE, 'UTF-8');
        $this->nome = $nome;
        return $this;
    }

    // --- criado_por ---
    public function getCriadoPor(): int { return $this->criado_por; }
    public function setCriadoPor(int $criado_por): self
    {
        $this->criado_por = $criado_por;
        return $this;
    }

    // --- equipe_pai ---
    public function getEquipePai(): ?int { return $this->equipe_pai; }
    public function setEquipePai(?int $equipe_pai): self
    {
        $this->equipe_pai = $equipe_pai;
        return $this;
    }

    public function isPrincipal(): bool
    {
        return $this->equipe_pai === null;
    }

    // --- tipo ---
    public function getTipo(): string { return $this->tipo; }
    public function setTipo(string $tipo): self
    {
        $tipo = strtoupper(trim($tipo));
        if (!in_array($tipo, ['EMPRESA', 'SUBEQUIPE'], true)) {
            throw new InvalidArgumentException("Tipo inválido: '{$tipo}'. Use 'EMPRESA' ou 'SUBEQUIPE'.");
        }
        $this->tipo = $tipo;
        return $this;
    }

    // --- data_criacao ---
    public function getDataCriacao(): ?string { return $this->data_criacao; }
}