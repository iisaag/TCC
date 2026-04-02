<?php
declare(strict_types=1);
require_once __DIR__ . '/cargos.php';

class usuarios implements JsonSerializable
{
    public function __construct(
        private ?int    $id_usuario   = null,
        private string  $nome         = '',
        private string  $email        = '',
        private ?string $foto_perfil  = null,
        private ?string $nivel        = null,
        private ?string $data_criacao = null,
        private cargos  $cargo        = new cargos()
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_usuario'   => $this->getIdUsuario(),
            'nome'         => $this->getNome(),
            'email'        => $this->getEmail(),
            'foto_perfil'  => $this->getFotoPerfil(),
            'nivel'        => $this->getNivel(),
            'data_criacao' => $this->getDataCriacao(),
            'cargo'        => [
                'id_cargo'   => $this->cargo->getIdCargo(),
                'nome_cargo' => $this->cargo->getNomeCargo(),
            ],
        ];
    }

    // --- id_usuario ---
    public function getIdUsuario(): ?int { return $this->id_usuario; }
    public function setIdUsuario(int $id_usuario): self
    {
        $this->id_usuario = $id_usuario;
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

    // --- email ---
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): self
    {
        $this->email = strtolower(trim($email));
        return $this;
    }

    // --- foto_perfil ---
    public function getFotoPerfil(): ?string { return $this->foto_perfil; }
    public function setFotoPerfil(?string $foto_perfil): self
    {
        $this->foto_perfil = $foto_perfil;
        return $this;
    }

    // --- nivel ---
    public function getNivel(): ?string { return $this->nivel; }
    public function setNivel(?string $nivel): self
    {
        $this->nivel = $nivel;
        return $this;
    }

    // --- data_criacao ---
    public function getDataCriacao(): ?string { return $this->data_criacao; }

    // --- cargo ---
    public function getCargo(): cargos { return $this->cargo; }
    public function setCargo(cargos $cargo): self
    {
        $this->cargo = $cargo;
        return $this;
    }
}