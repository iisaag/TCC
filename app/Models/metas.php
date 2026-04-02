<?php
declare(strict_types=1);
require_once __DIR__ . '/projetos.php';

class metas implements JsonSerializable
{
    public function __construct(
        private ?int      $id_meta             = null,
        private ?projetos $projeto             = null,
        private string    $titulo_meta         = '',
        private string    $prazo_meta          = '',
        private ?string   $data_conclusao_meta = null,
        private string    $status_meta         = 'Pendente'
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_meta'             => $this->getIdMeta(),
            'titulo_meta'         => $this->getTituloMeta(),
            'prazo_meta'          => $this->getPrazoMeta(),
            'data_conclusao_meta' => $this->getDataConclusaoMeta(),
            'status_meta'         => $this->getStatusMeta(),
            'projeto' => $this->projeto ? [
                'id_projeto'   => $this->projeto->getIdProjeto(),
                'nome_projeto' => $this->projeto->getNomeProjeto(),
            ] : null,
        ];
    }

    public function getIdMeta(): ?int { return $this->id_meta; }
    public function setIdMeta(int $id): self { $this->id_meta = $id; return $this; }

    public function getProjeto(): ?projetos { return $this->projeto; }
    public function setProjeto(?projetos $projeto): self { $this->projeto = $projeto; return $this; }

    public function getTituloMeta(): string { return $this->titulo_meta; }
    public function setTituloMeta(string $titulo): self
    {
        $titulo = trim($titulo);
        $titulo = preg_replace('/\s+/', ' ', $titulo);
        $titulo = mb_convert_case(mb_strtolower($titulo, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        $this->titulo_meta = $titulo;
        return $this;
    }

    public function getPrazoMeta(): string { return $this->prazo_meta; }
    public function setPrazoMeta(string $prazo): self { $this->prazo_meta = $prazo; return $this; }

    public function getDataConclusaoMeta(): ?string { return $this->data_conclusao_meta; }
    public function setDataConclusaoMeta(?string $data): self { $this->data_conclusao_meta = $data; return $this; }

    public function getStatusMeta(): string { return $this->status_meta; }
    public function setStatusMeta(string $status): self { $this->status_meta = trim($status); return $this; }

    public function isConcluida(): bool { return $this->data_conclusao_meta !== null; }
}