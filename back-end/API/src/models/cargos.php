<?php
declare(strict_types=1);

class cargos implements JsonSerializable
{
    public function __construct(
        private ?int $id_cargo = null,
        private string $nome_cargo = ''
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_cargo'   => $this->getIdCargo(),
            'nome_cargo' => $this->getNomeCargo(),
        ];
    }

    public function getIdCargo(): ?int
    {
        return $this->id_cargo;
    }

    public function setIdCargo(int $id_cargo): self
    {
        $this->id_cargo = $id_cargo;
        return $this;
    }

    public function getNomeCargo(): string
    {
        return $this->nome_cargo;
    }

    public function setNomeCargo(string $nome_cargo): self
    {
        $nome_cargo = trim($nome_cargo);
        $nome_cargo = mb_strtolower($nome_cargo, 'UTF-8');
        $nome_cargo = preg_replace('/\s+/', ' ', $nome_cargo);
        $nome_cargo = mb_convert_case($nome_cargo, MB_CASE_TITLE, 'UTF-8');

        $this->nome_cargo = $nome_cargo;
        return $this;
    }
}