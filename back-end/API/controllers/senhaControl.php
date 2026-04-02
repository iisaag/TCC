<?php
require_once __DIR__ . '/../src/DAO/senhaDAO.php';
require_once __DIR__ . '/../src/models/senha.php';
require_once __DIR__ . '/../src/models/usuarios.php';
require_once __DIR__ . '/../src/DB/Database.php';
require_once __DIR__ . '/../http/Response.php';
require_once __DIR__ . '/../utils/logger.php';

class senhaControl
{
    public function index(): void
    {
        try {
            $senhaDAO = new senhaDAO();

            $porNivel = $_GET['nivel_acesso'] ?? null;

            if ($porNivel) {
                $registros = $senhaDAO->readByNivelAcesso($porNivel);
            } else {
                $registros = $senhaDAO->readAll();
            }

            (new Response(
                success: true,
                message: 'Registros listados com sucesso',
                data: ['senhas' => $registros],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao listar registros: ' . $e->getMessage(),
                httpCode: 400
            ))->send();
        }
    }

    public function show(string $email): void
    {
        try {
            $senhaDAO = new senhaDAO();
            $registro = $senhaDAO->readByEmail($email);

            if (!$registro) {
                (new Response(
                    success: false,
                    message: 'Registro não encontrado',
                    httpCode: 404
                ))->send();
                return;
            }

            $dados = [
                'email'        => $registro->getEmail(),
                'nivel_acesso' => $registro->getNivelAcesso(),
                'usuario' => [
                    'id_usuario'  => $registro->getUsuario()?->getIdUsuario(),
                    'nome'        => $registro->getUsuario()?->getNome(),
                    'foto_perfil' => $registro->getUsuario()?->getFotoPerfil(),
                ],
            ];

            (new Response(
                success: true,
                message: 'Registro encontrado com sucesso',
                data: ['senha' => $dados],
                httpCode: 200
            ))->send();
        } catch (Exception $e) {
            (new Response(
                success: false,
                message: 'Erro ao buscar registro: ' . $e->getMessage(),
                httpCode: 500
            ))->send();
        }
    }

    public function store(array $data): void
    {
        try {
            if (empty($data['email'])) {
                throw new Exception('E-mail é obrigatório');
            }

            if (empty($data['senha'])) {
                throw new Exception('Senha é obrigatória');
            }

            if (empty($data['nivel_acesso'])) {
                throw new Exception('Nível de acesso é obrigatório');
            }

            $registro = new senha(
                email:        $data['email'],
                senha:        $data['senha'],
                nivel_acesso: $data['nivel_acesso'],
                usuario:      null
            );

            $senhaDAO = new senhaDAO();
            $registro = $senhaDAO->create($registro);

            (new Response(
                success: true,
                message: 'Senha cadastrada com sucesso',
                data: ['email' => $registro->getEmail()],
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

    public function editSenha(string $email, array $data): void
    {
        try {
            if (empty($email)) {
                throw new Exception('E-mail é obrigatório');
            }

            if (empty($data['senha'])) {
                throw new Exception('Nova senha é obrigatória');
            }

            $senhaDAO = new senhaDAO();
            $atual    = $senhaDAO->readByEmail($email);

            if (!$atual) {
                throw new Exception('Registro não encontrado');
            }

            $registro = new senha(
                email:        $email,
                senha:        $data['senha'],
                nivel_acesso: $data['nivel_acesso'] ?? $atual->getNivelAcesso(),
                usuario:      null
            );

            $updated = $senhaDAO->update($registro);

            if (!$updated) {
                throw new Exception('Registro não encontrado ou nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Senha atualizada com sucesso',
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

    public function editNivelAcesso(string $email, array $data): void
    {
        try {
            if (empty($email)) {
                throw new Exception('E-mail é obrigatório');
            }

            if (empty($data['nivel_acesso'])) {
                throw new Exception('Nível de acesso é obrigatório');
            }

            $senhaDAO = new senhaDAO();
            $atual    = $senhaDAO->readByEmail($email);

            if (!$atual) {
                throw new Exception('Registro não encontrado');
            }

            $registro = new senha(
                email:        $email,
                senha:        '',
                nivel_acesso: $data['nivel_acesso'],
                usuario:      null
            );
            $registro->setSenhaHash($atual->getSenhaHash());

            $updated = $senhaDAO->update($registro);

            if (!$updated) {
                throw new Exception('Nenhuma alteração realizada');
            }

            (new Response(
                success: true,
                message: 'Nível de acesso atualizado com sucesso',
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

    public function verificarSenha(array $data): void
    {
        try {
            if (empty($data['email'])) {
                throw new Exception('E-mail é obrigatório');
            }

            if (empty($data['senha'])) {
                throw new Exception('Senha é obrigatória');
            }

            $senhaDAO = new senhaDAO();
            $registro = $senhaDAO->readByEmail($data['email']);

            if (!$registro) {
                (new Response(
                    success: false,
                    message: 'Credenciais inválidas',
                    httpCode: 401
                ))->send();
                return;
            }

            if (!$registro->verificarSenha($data['senha'])) {
                (new Response(
                    success: false,
                    message: 'Credenciais inválidas',
                    httpCode: 401
                ))->send();
                return;
            }

            (new Response(
                success: true,
                message: 'Autenticação realizada com sucesso',
                data: [
                    'email'        => $registro->getEmail(),
                    'nivel_acesso' => $registro->getNivelAcesso(),
                    'usuario' => [
                        'id_usuario'  => $registro->getUsuario()?->getIdUsuario(),
                        'nome'        => $registro->getUsuario()?->getNome(),
                        'foto_perfil' => $registro->getUsuario()?->getFotoPerfil(),
                    ],
                ],
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

    public function delete(string $email): void
    {
        try {
            if (empty($email)) {
                throw new Exception('E-mail inválido');
            }

            $senhaDAO = new senhaDAO();
            $senhaDAO->delete($email);

            (new Response(
                success: true,
                message: 'Registro excluído com sucesso',
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