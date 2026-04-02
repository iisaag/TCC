<?php
declare(strict_types=1);
require_once __DIR__ . '/projetos.php';
require_once __DIR__ . '/usuarios.php';

class tarefas implements JsonSerializable
{
    public function __construct(
        private ?int      $id_tarefa       = null,
        private string    $titulo          = '',
        private ?string   $descricao       = null,
        private ?projetos $projeto         = null,
        private ?usuarios $responsavel     = null,
        private ?string   $prioridade_task = null,
        private ?string   $prazo           = null,
        private ?string   $status_task     = null
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_tarefa'       => $this->getIdTarefa(),
            'titulo'          => $this->getTitulo(),
            'descricao'       => $this->getDescricao(),
            'prioridade_task' => $this->getPrioridadeTask(),
            'prazo'           => $this->getPrazo(),
            'status_task'     => $this->getStatusTask(),
            'projeto' => $this->projeto ? [
                'id_projeto'   => $this->projeto->getIdProjeto(),
                'nome_projeto' => $this->projeto->getNomeProjeto(),
            ] : null,
            'responsavel' => $this->responsavel ? [
                'id_usuario' => $this->responsavel->getIdUsuario(),
                'nome'       => $this->responsavel->getNome(),
                'email'      => $this->responsavel->getEmail(),
            ] : null,
        ];
    }

    public function getIdTarefa(): ?int { return $this->id_tarefa; }
    public function setIdTarefa(int $id): self { $this->id_tarefa = $id; return $this; }

    public function getTitulo(): string { return $this->titulo; }
    public function setTitulo(string $titulo): self
    {
        $titulo = trim($titulo);
        $titulo = preg_replace('/\s+/', ' ', $titulo);
        $titulo = mb_convert_case(mb_strtolower($titulo, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
        $this->titulo = $titulo;
        return $this;
    }

    public function getDescricao(): ?string { return $this->descricao; }
    public function setDescricao(?string $descricao): self { $this->descricao = $descricao; return $this; }

    public function getProjeto(): ?projetos { return $this->projeto; }
    public function setProjeto(?projetos $projeto): self { $this->projeto = $projeto; return $this; }

    public function getResponsavel(): ?usuarios { return $this->responsavel; }
    public function setResponsavel(?usuarios $responsavel): self { $this->responsavel = $responsavel; return $this; }

    public function getPrioridadeTask(): ?string { return $this->prioridade_task; }
    public function setPrioridadeTask(?string $prioridade): self
    {
        $this->prioridade_task = $prioridade ? strtoupper(trim($prioridade)) : null;
        return $this;
    }

    public function getPrazo(): ?string { return $this->prazo; }
    public function setPrazo(?string $prazo): self { $this->prazo = $prazo; return $this; }

    public function getStatusTask(): ?string { return $this->status_task; }
    public function setStatusTask(?string $status): self { $this->status_task = $status ? trim($status) : null; return $this; }
}