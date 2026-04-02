<?php
class logSistema
{
    public function __construct(
        private ?int $id_log_sistema,
        private ?int $id_usuario,
        private ?string $acao,
        private ?string $descricao,
        private ?string $data_hora = null
    ) {}

    public function getIdLogSistema(): ?int { return $this->id_log_sistema; }
    public function setIdLogSistema(int $id): void { $this->id_log_sistema = $id; }

    public function getIdUsuario(): ?int { return $this->id_usuario; }
    public function getAcao(): ?string { return $this->acao; }
    public function getDescricao(): ?string { return $this->descricao; }
    public function getDataHora(): ?string { return $this->data_hora; }
}