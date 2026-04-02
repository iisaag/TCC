<?php
declare(strict_types=1);

class senha implements JsonSerializable
{
    public function __construct(
        private string   $email        = '',
        private string   $senha        = '',
        private string   $nivel_acesso = '',
        private ?usuarios $usuario     = null
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'email'        => $this->getEmail(),
            'nivel_acesso' => $this->getNivelAcesso(),
            'usuario'      => $this->usuario?->jsonSerialize(),
            // senha nunca exposta no JSON
        ];
    }

    // --- email ---
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): self
    {
        $this->email = strtolower(trim($email));
        return $this;
    }

    // --- senha ---
    public function getSenha(): string { return $this->senha; }
    public function getSenhaHash(): string { return $this->senha; }
    public function setSenha(string $senha): self
    {
        $this->senha = password_hash($senha, PASSWORD_BCRYPT);
        return $this;
    }

    public function setSenhaHash(string $hash): self
    {
        $this->senha = $hash;
        return $this;
    }

    public function verificarSenha(string $senhaPlana): bool
    {
        return password_verify($senhaPlana, $this->senha);
    }

    // --- nivel_acesso ---
    public function getNivelAcesso(): string { return $this->nivel_acesso; }
    public function setNivelAcesso(string $nivel_acesso): self
    {
        $this->nivel_acesso = strtolower(trim($nivel_acesso));
        return $this;
    }

    // --- usuario ---
    public function getUsuario(): ?usuarios { return $this->usuario; }
    public function setUsuario(?usuarios $usuario): self { $this->usuario = $usuario; return $this; }
}