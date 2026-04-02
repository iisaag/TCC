<?php
require_once __DIR__ . '/../src/DAO/usuariosDAO.php';
require_once __DIR__ . '/../src/models/usuarios.php';
require_once __DIR__ . '/../src/models/cargos.php';
require_once __DIR__ . '/../src/DB/Database.php';
require_once __DIR__ . '/../http/Response.php';
require_once __DIR__ . '/../utils/logger.php';

class usuariosControl
{
    public function create(usuarios $usuario): usuarios
    {
        $id = $usuario->getIdUsuario();
        if (isset($id)) {
            return $this->createWithId($usuario);
        } else {
            return $this->createWithoutId($usuario);
        }
    }

    private function createWithoutId(usuarios $usuario): usuarios
    {
        $query = 'INSERT INTO usuarios (
                    nome,
                    email,
                    foto_perfil,
                    cargo,
                    nivel
                ) VALUES (
                    :nome,
                    :email,
                    :foto_perfil,
                    :cargo,
                    :nivel )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':nome',        $usuario->getNome(),       PDO::PARAM_STR);
        $statement->bindValue(':email',       $usuario->getEmail(),      PDO::PARAM_STR);
        $statement->bindValue(':foto_perfil', $usuario->getFotoPerfil(), PDO::PARAM_STR);
        $statement->bindValue(':cargo',       $usuario->getCargo()?->getNomeCargo(), PDO::PARAM_STR);
        $statement->bindValue(':nivel',       $usuario->getNivel(),      PDO::PARAM_STR);

        $statement->execute();

        $usuario->setIdUsuario((int) Database::getConnection()->lastInsertId());

        return $usuario;
    }

    private function createWithId(usuarios $usuario): usuarios
    {
        $query = 'INSERT INTO usuarios (
                    id_usuario,
                    nome,
                    email,
                    foto_perfil,
                    cargo,
                    nivel
                ) VALUES (
                    :id_usuario,
                    :nome,
                    :email,
                    :foto_perfil,
                    :cargo,
                    :nivel )';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':id_usuario',  $usuario->getIdUsuario(),  PDO::PARAM_INT);
        $statement->bindValue(':nome',        $usuario->getNome(),       PDO::PARAM_STR);
        $statement->bindValue(':email',       $usuario->getEmail(),      PDO::PARAM_STR);
        $statement->bindValue(':foto_perfil', $usuario->getFotoPerfil(), PDO::PARAM_STR);
        $statement->bindValue(':cargo',       $usuario->getCargo()?->getNomeCargo(), PDO::PARAM_STR);
        $statement->bindValue(':nivel',       $usuario->getNivel(),      PDO::PARAM_STR);

        $statement->execute();

        return $usuario;
    }

    public function readAll(): array
    {
        $query = '
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.foto_perfil,
            u.nivel,
            u.data_criacao,
            c.id_cargo,
            c.nome_cargo
        FROM usuarios u
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo
        ORDER BY u.nome ASC';

        $statement = Database::getConnection()->query($query);

        $resultados = [];

        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $cargo   = $linha->id_cargo ? new cargos($linha->id_cargo, $linha->nome_cargo) : null;
            $usuario = new usuarios(
                $linha->id_usuario,
                $linha->nome,
                $linha->email,
                $linha->foto_perfil,
                $cargo,
                $linha->nivel,
                $linha->data_criacao
            );
            $resultados[] = $usuario;
        }

        return $resultados;
    }

    public function readById(int $id): ?usuarios
    {
        $query = '
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.foto_perfil,
            u.nivel,
            u.data_criacao,
            c.id_cargo,
            c.nome_cargo
        FROM usuarios u
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo
        WHERE u.id_usuario = :id_usuario
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':id_usuario', $id, PDO::PARAM_INT);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        $cargo = $linha->id_cargo ? new cargos($linha->id_cargo, $linha->nome_cargo) : null;
        return new usuarios(
            $linha->id_usuario,
            $linha->nome,
            $linha->email,
            $linha->foto_perfil,
            $cargo,
            $linha->nivel,
            $linha->data_criacao
        );
    }

    public function readByEmail(string $email): ?usuarios
    {
        $query = '
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.foto_perfil,
            u.nivel,
            u.data_criacao,
            c.id_cargo,
            c.nome_cargo
        FROM usuarios u
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo
        WHERE u.email = :email
        LIMIT 1';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':email', $email, PDO::PARAM_STR);
        $statement->execute();

        $linha = $statement->fetch(PDO::FETCH_OBJ);
        if (!$linha) {
            return null;
        }

        $cargo = $linha->id_cargo ? new cargos($linha->id_cargo, $linha->nome_cargo) : null;
        return new usuarios(
            $linha->id_usuario,
            $linha->nome,
            $linha->email,
            $linha->foto_perfil,
            $cargo,
            $linha->nivel,
            $linha->data_criacao
        );
    }

    public function readByNome(string $nome): array
    {
        $query = '
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.foto_perfil,
            u.nivel,
            u.data_criacao,
            c.id_cargo,
            c.nome_cargo
        FROM usuarios u
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo
        WHERE u.nome LIKE :nome
        ORDER BY u.nome ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nome', '%' . $nome . '%', PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $cargo   = $linha->id_cargo ? new cargos($linha->id_cargo, $linha->nome_cargo) : null;
            $usuario = new usuarios(
                $linha->id_usuario,
                $linha->nome,
                $linha->email,
                $linha->foto_perfil,
                $cargo,
                $linha->nivel,
                $linha->data_criacao
            );
            $resultados[] = $usuario;
        }
        return $resultados;
    }

    public function readByCargo(string $nomeCargo): array
    {
        $query = '
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.foto_perfil,
            u.nivel,
            u.data_criacao,
            c.id_cargo,
            c.nome_cargo
        FROM usuarios u
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo
        WHERE c.nome_cargo = :nome_cargo
        ORDER BY u.nome ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nome_cargo', $nomeCargo, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $cargo   = $linha->id_cargo ? new cargos($linha->id_cargo, $linha->nome_cargo) : null;
            $usuario = new usuarios(
                $linha->id_usuario,
                $linha->nome,
                $linha->email,
                $linha->foto_perfil,
                $cargo,
                $linha->nivel,
                $linha->data_criacao
            );
            $resultados[] = $usuario;
        }
        return $resultados;
    }

    public function readByNivel(string $nivel): array
    {
        $query = '
        SELECT
            u.id_usuario,
            u.nome,
            u.email,
            u.foto_perfil,
            u.nivel,
            u.data_criacao,
            c.id_cargo,
            c.nome_cargo
        FROM usuarios u
        LEFT JOIN cargos c ON u.cargo = c.nome_cargo
        WHERE u.nivel = :nivel
        ORDER BY u.nome ASC';

        $statement = Database::getConnection()->prepare($query);
        $statement->bindValue(':nivel', $nivel, PDO::PARAM_STR);
        $statement->execute();

        $resultados = [];
        while ($linha = $statement->fetch(PDO::FETCH_OBJ)) {
            $cargo   = $linha->id_cargo ? new cargos($linha->id_cargo, $linha->nome_cargo) : null;
            $usuario = new usuarios(
                $linha->id_usuario,
                $linha->nome,
                $linha->email,
                $linha->foto_perfil,
                $cargo,
                $linha->nivel,
                $linha->data_criacao
            );
            $resultados[] = $usuario;
        }
        return $resultados;
    }

    public function update(usuarios $usuario): bool
    {
        $query = 'UPDATE usuarios
                  SET nome        = :nome,
                      email       = :email,
                      foto_perfil = :foto_perfil,
                      cargo       = :cargo,
                      nivel       = :nivel
                  WHERE id_usuario = :id_usuario';

        $statement = Database::getConnection()->prepare($query);

        $statement->bindValue(':nome',        $usuario->getNome(),       PDO::PARAM_STR);
        $statement->bindValue(':email',       $usuario->getEmail(),      PDO::PARAM_STR);
        $statement->bindValue(':foto_perfil', $usuario->getFotoPerfil(), PDO::PARAM_STR);
        $statement->bindValue(':cargo',       $usuario->getCargo()?->getNomeCargo(), PDO::PARAM_STR);
        $statement->bindValue(':nivel',       $usuario->getNivel(),      PDO::PARAM_STR);
        $statement->bindValue(':id_usuario',  $usuario->getIdUsuario(),  PDO::PARAM_INT);

        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function totalPorCargo(): void
    {
        try {
            $usuariosDAO = new usuariosDAO();
            $total = $usuariosDAO->totalUsuariosPorCargo();

            (new Response(
                success: true,
                message: 'Total de usuários por cargo obtido com sucesso',
                data: $total,
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function totalPorNivel(): void
    {
        try {
            $usuariosDAO = new usuariosDAO();
            $total = $usuariosDAO->totalUsuariosPorNivel();

            (new Response(
                success: true,
                message: 'Total de usuários por nível obtido com sucesso',
                data: $total,
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function index(): void
    {
        try {
            $usuariosDAO = new usuariosDAO();

            $porNome  = $_GET['nome']  ?? null;
            $porCargo = $_GET['cargo'] ?? null;
            $porNivel = $_GET['nivel'] ?? null;

            if ($porNome) {
                $usuarios = $usuariosDAO->readByNome($porNome);
            } elseif ($porCargo) {
                $usuarios = $usuariosDAO->readByCargoNome($porCargo);
            } elseif ($porNivel) {
                $usuarios = $usuariosDAO->readByNivel($porNivel);
            } else {
                $usuarios = $usuariosDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Usuários listados com sucesso',
                data: ['usuarios' => $usuarios],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar usuários: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(int $id): void
    {
        try {
            $usuario = $this->readById($id);

            if (!$usuario) {
                (new Response(
                    success: false,
                    message: 'Usuário não encontrado',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'id_usuario'  => $usuario->getIdUsuario(),
                'nome'        => $usuario->getNome(),
                'email'       => $usuario->getEmail(),
                'foto_perfil' => $usuario->getFotoPerfil(),
                'nivel'       => $usuario->getNivel(),
                'data_criacao' => $usuario->getDataCriacao(),
                'cargo' => [
                    'id_cargo'   => $usuario->getCargo()?->getIdCargo(),
                    'nome_cargo' => $usuario->getCargo()?->getNomeCargo(),
                ],
            ];

            (new Response(
                success: true,
                message: 'Usuário encontrado com sucesso',
                data: ['usuario' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar usuário: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['nome'])) {
                throw new Exception('Nome do usuário é obrigatório');
            }

            if (empty($data['email'])) {
                throw new Exception('E-mail do usuário é obrigatório');
            }

            $cargo = null;
            if (!empty($data['cargo']['nome_cargo'])) {
                $cargo = new cargos(
                    id_cargo:   $data['cargo']['id_cargo'] ?? null,
                    nome_cargo: $data['cargo']['nome_cargo']
                );
            }

            $usuario = new usuarios(
                id_usuario:  null,
                nome:        $data['nome'],
                email:       $data['email'],
                foto_perfil: $data['foto_perfil'] ?? null,
                cargo:       $cargo,
                nivel:       $data['nivel'] ?? null,
                data_criacao: null
            );

            $usuariosDAO = new usuariosDAO();
            $usuario = $usuariosDAO->create($usuario);

            (new Response(
                success: true,
                message: 'Usuário cadastrado com sucesso',
                data: ['usuario' => $usuario],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function edit(int $id, array $data): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($data['nome'])) {
                throw new Exception('Nome do usuário é obrigatório');
            }

            if (empty($data['email'])) {
                throw new Exception('E-mail do usuário é obrigatório');
            }

            $cargo = null;
            if (!empty($data['cargo']['nome_cargo'])) {
                $cargo = new cargos(
                    id_cargo:   $data['cargo']['id_cargo'] ?? null,
                    nome_cargo: $data['cargo']['nome_cargo']
                );
            }

            $usuario = new usuarios(
                id_usuario:  $id,
                nome:        $data['nome'],
                email:       $data['email'],
                foto_perfil: $data['foto_perfil'] ?? null,
                cargo:       $cargo,
                nivel:       $data['nivel'] ?? null,
                data_criacao: null
            );

            $usuariosDAO = new usuariosDAO();
            $updated = $usuariosDAO->update($usuario);

            if (!$updated) {
                throw new Exception('Usuário não encontrado ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Usuário atualizado com sucesso',
                data: ['usuario' => $usuario],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function delete(int $id): void
    {
        try {
            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            $usuariosDAO = new usuariosDAO();
            $usuariosDAO->delete($id);

            (new Response(
                success: true,
                message: 'Usuário excluído com sucesso',
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }
}