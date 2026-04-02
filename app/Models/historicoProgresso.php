<?php
declare(strict_types=1);
require_once __DIR__ . '/tarefas.php';
require_once __DIR__ . '/usuarios.php';

class historicoProgresso implements JsonSerializable
{
    public function __construct(
        private ?int      $id_historico     = null,
        private ?tarefas  $tarefa           = null,
        private ?int      $progresso        = null,
        private ?string   $data_atualizacao = null,
        private ?usuarios $usuario          = null
    ) {}

    public function jsonSerialize(): array
    {
        return [
            'id_historico'     => $this->getIdHistorico(),
            'progresso'        => $this->getProgresso(),
            'data_atualizacao' => $this->getDataAtualizacao(),
            'tarefa' => $this->tarefa ? [
                'id_tarefa'   => $this->tarefa->getIdTarefa(),
                'titulo'      => $this->tarefa->getTitulo(),
                'status_task' => $this->tarefa->getStatusTask(),
            ] : null,
            'usuario' => $this->usuario ? [
                'id_usuario' => $this->usuario->getIdUsuario(),
                'nome'       => $this->usuario->getNome(),
            ] : null,
        ];
    }

    public function getIdHistorico(): ?int { return $this->id_historico; }
    public function setIdHistorico(int $id): self { $this->id_historico = $id; return $this; }

    public function getTarefa(): ?tarefas { return $this->tarefa; }
    public function setTarefa(?tarefas $tarefa): self { $this->tarefa = $tarefa; return $this; }

    public function getProgresso(): ?int { return $this->progresso; }
    public function setProgresso(?int $progresso): self
    {
        if ($progresso !== null && ($progresso < 0 || $progresso > 100)) {
            throw new InvalidArgumentException('Progresso deve ser entre 0 e 100.');
        }
        $this->progresso = $progresso;
        return $this;
    }

    public function getDataAtualizacao(): ?string { return $this->data_atualizacao; }

    public function getUsuario(): ?usuarios { return $this->usuario; }
    public function setUsuario(?usuarios $usuario): self { $this->usuario = $usuario; return $this; }
}