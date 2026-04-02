<?php
class logProjeto
{
    public function __construct(
        private ?int $id_log_projeto,
        private ?int $id_projeto,
        private ?int $id_usuario,
        private ?string $mensagem,
        private ?string $data_hora = null
    ) {}

    public function getIdLogProjeto(): ?int { return $this->id_log_projeto; }
    public function setIdLogProjeto(int $id): void { $this->id_log_projeto = $id; }

    public function getIdProjeto(): ?int { return $this->id_projeto; }
    public function getIdUsuario(): ?int { return $this->id_usuario; }
    public function getMensagem(): ?string { return $this->mensagem; }
    public function getDataHora(): ?string { return $this->data_hora; }
}