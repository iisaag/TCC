<?php

namespace Tests\Feature;

use App\Models\BoardColuna;
use App\Models\Cargo;
use App\Models\Equipe;
use App\Models\Projeto;
use App\Models\Senha;
use App\Models\Sprint;
use App\Models\Tarefa;
use App\Models\Usuario;
use App\Support\LixeiraProjetos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Regras de negócio do AivyPM, testadas pela API como a interface usa.
 * Roda em SQLite em memória (phpunit.xml), sem tocar no banco de desenvolvimento.
 */
class RegrasNegocioTest extends TestCase
{
    use RefreshDatabase;

    private function criarUsuario(string $nivel = 'usuario', array $dados = []): Usuario
    {
        static $n = 0;
        $n++;

        $usuario = Usuario::create(array_merge([
            'nome' => "Pessoa {$n}",
            'email' => "pessoa{$n}@teste.com",
        ], $dados));

        Senha::create([
            'email' => $usuario->email,
            'senha' => 'segredo123',
            'nivel_acesso' => $nivel,
        ]);

        return $usuario;
    }

    private function logarComo(Usuario $usuario): static
    {
        $nivel = Senha::find($usuario->email)?->nivel_acesso;

        return $this->withSession(['auth.user' => [
            'id' => $usuario->id_usuario,
            'email' => $usuario->email,
            'name' => $usuario->nome,
            'nivel_acesso' => $nivel,
            'permissions' => ['total' => $nivel === 'adm'],
        ]]);
    }

    private function criarProjeto(array $dados = []): Projeto
    {
        $projeto = Projeto::create(array_merge(['nome_projeto' => 'Projeto Teste', 'kanban_padrao' => true], $dados));

        foreach ([['A Fazer', 0, 1, false], ['Em andamento', 50, 2, false], ['Teste', 75, 3, false], ['Aprovado', 100, 4, true]] as [$nome, $progresso, $ordem, $arquiva]) {
            BoardColuna::create(['id_projeto' => $projeto->id_projeto, 'nome' => $nome, 'progresso' => $progresso, 'ordem' => $ordem, 'arquiva_ao_concluir' => $arquiva]);
        }

        return $projeto;
    }

    // ------------------------------------------------------------------
    // Autenticação e permissões
    // ------------------------------------------------------------------

    public function test_login_com_senha_correta_entra_e_com_senha_errada_nao(): void
    {
        $usuario = $this->criarUsuario();

        $this->post('/login', ['email' => strtoupper($usuario->email), 'senha' => 'segredo123'])
            ->assertRedirect('/home');

        $this->post('/logout');

        $this->post('/login', ['email' => $usuario->email, 'senha' => 'errada'])
            ->assertSessionHasErrors('email');
    }

    public function test_senha_e_gravada_com_hash(): void
    {
        $usuario = $this->criarUsuario();

        $this->assertStringStartsWith('$2y$', Senha::find($usuario->email)->getRawOriginal('senha'));
    }

    public function test_rotas_internas_exigem_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->getJson('/api/tarefas')->assertStatus(401);
    }

    public function test_usuario_comum_nao_cria_nem_exclui_projeto(): void
    {
        $usuario = $this->criarUsuario();
        $projeto = $this->criarProjeto();

        $this->logarComo($usuario)->postJson('/api/projetos', ['nome_projeto' => 'Novo'])->assertStatus(403);
        $this->logarComo($usuario)->deleteJson("/api/projetos/{$projeto->id_projeto}")->assertStatus(403);
        $this->logarComo($usuario)->get('/gestao')->assertStatus(403);
    }

    public function test_admin_cria_projeto_com_as_quatro_colunas_padrao(): void
    {
        $admin = $this->criarUsuario('adm');

        $resposta = $this->logarComo($admin)->postJson('/api/projetos', [
            'nome_projeto' => 'sistema   novo',
            'prioridade_proj' => 'Alta prioridade',
        ])->assertCreated();

        $id = $resposta->json('data.projeto.id_projeto');

        $this->assertSame('Sistema Novo', Projeto::find($id)->nome_projeto);
        $this->assertSame('ALTA', Projeto::find($id)->prioridade_proj);
        $this->assertSame(
            ['A Fazer', 'Em andamento', 'Teste', 'Aprovado'],
            BoardColuna::where('id_projeto', $id)->orderBy('ordem')->pluck('nome')->all()
        );
    }

    // ------------------------------------------------------------------
    // Sprints e quadro
    // ------------------------------------------------------------------

    public function test_so_pode_haver_uma_sprint_ativa_por_projeto(): void
    {
        $admin = $this->criarUsuario('adm');
        $projeto = $this->criarProjeto();
        $dados = ['id_projeto' => $projeto->id_projeto, 'data_inicio' => '2026-10-01', 'data_fim' => '2026-10-15'];

        $this->logarComo($admin)->postJson('/api/sprints', $dados)->assertCreated();
        $this->logarComo($admin)->postJson('/api/sprints', $dados)->assertStatus(422);
    }

    public function test_encerrar_sprint_arquiva_concluidas_e_devolve_o_resto_para_pendencias(): void
    {
        $admin = $this->criarUsuario('adm');
        $projeto = $this->criarProjeto();
        $sprint = Sprint::create(['id_projeto' => $projeto->id_projeto, 'nome_sprint' => 'S1', 'data_inicio' => '2026-10-01', 'data_fim' => '2026-10-15', 'status_sprint' => 'ATIVA']);

        $aprovada = Tarefa::create(['titulo' => 'Pronta', 'id_projeto' => $projeto->id_projeto, 'id_sprint' => $sprint->id_sprint, 'status_task' => 'Teste', 'progresso' => 75]);
        DB::table('tarefas')->where('id_tarefa', $aprovada->id_tarefa)->update(['status_task' => 'APROVADO', 'progresso' => 100]);
        $aberta = Tarefa::create(['titulo' => 'Pela metade', 'id_projeto' => $projeto->id_projeto, 'id_sprint' => $sprint->id_sprint, 'status_task' => 'Doing', 'progresso' => 50]);

        $this->logarComo($admin)->patchJson("/api/sprints/{$sprint->id_sprint}/encerrar")->assertOk();

        $this->assertSame('ENCERRADA', $sprint->fresh()->status_sprint);
        $this->assertNotNull($sprint->fresh()->encerrada_em);
        $this->assertTrue((bool) $aprovada->fresh()->em_historico);
        $this->assertNotNull($aprovada->fresh()->concluida_em);
        $this->assertNull($aberta->fresh()->id_sprint);
        $this->assertFalse((bool) $aberta->fresh()->em_historico);
    }

    public function test_card_aprovado_fica_na_sprint_ate_ela_ser_encerrada(): void
    {
        $admin = $this->criarUsuario('adm');
        $usuario = $this->criarUsuario();
        $projeto = $this->criarProjeto();
        $sprint = Sprint::create(['id_projeto' => $projeto->id_projeto, 'nome_sprint' => 'S1', 'data_inicio' => '2026-10-01', 'data_fim' => '2026-10-15', 'status_sprint' => 'ATIVA']);
        $tarefa = Tarefa::create(['titulo' => 'Card', 'id_projeto' => $projeto->id_projeto, 'status_task' => 'To Do', 'progresso' => 0]);

        $this->assertSame('TO_DO', $tarefa->fresh()->status_task);

        $this->logarComo($usuario)->patchJson("/api/tarefas/{$tarefa->id_tarefa}", [
            'id_sprint' => $sprint->id_sprint,
            'status_task' => 'Aprovado',
            'progresso' => 100,
        ])->assertOk();

        // Continua na coluna Aprovado da sprint, já contando como concluído.
        $tarefa->refresh();
        $this->assertSame('APROVADO', $tarefa->status_task);
        $this->assertFalse($tarefa->em_historico);
        $this->assertSame($sprint->id_sprint, (int) $tarefa->id_sprint);
        $this->assertNotNull($tarefa->concluida_em);
        $this->assertDatabaseHas('historico_progresso', ['id_tarefa' => $tarefa->id_tarefa, 'progresso' => 100, 'id_usuario' => $usuario->id_usuario]);

        // Criar outro card não mexe no card aprovado.
        $this->logarComo($usuario)->postJson('/api/tarefas', [
            'titulo' => 'Outro card',
            'id_projeto' => $projeto->id_projeto,
            'status_task' => 'To Do',
            'progresso' => 0,
        ])->assertCreated();
        $this->assertFalse($tarefa->fresh()->em_historico);

        // Só ao encerrar a sprint ele vai para o histórico.
        $this->logarComo($admin)->patchJson("/api/sprints/{$sprint->id_sprint}/encerrar")->assertOk();
        $this->assertTrue($tarefa->fresh()->em_historico);
        $this->assertNull($tarefa->fresh()->id_sprint);
    }

    public function test_card_aprovado_fora_de_sprint_vai_direto_para_o_historico(): void
    {
        $usuario = $this->criarUsuario();
        $projeto = $this->criarProjeto();

        $id = $this->logarComo($usuario)->postJson('/api/tarefas', [
            'titulo' => 'Já pronto',
            'id_projeto' => $projeto->id_projeto,
            'status_task' => 'Aprovado',
            'progresso' => 100,
        ])->assertCreated()->json('data.tarefa.id_tarefa');

        $this->assertTrue(Tarefa::find($id)->em_historico);
    }

    public function test_tarefa_nao_aceita_coluna_de_outro_projeto(): void
    {
        $usuario = $this->criarUsuario();
        $projetoA = $this->criarProjeto();
        $projetoB = $this->criarProjeto(['nome_projeto' => 'Outro']);
        $colunaDoB = BoardColuna::where('id_projeto', $projetoB->id_projeto)->first();

        $this->logarComo($usuario)->postJson('/api/tarefas', [
            'titulo' => 'Card',
            'id_projeto' => $projetoA->id_projeto,
            'id_coluna' => $colunaDoB->id_coluna,
        ])->assertStatus(422);
    }

    public function test_coluna_com_tarefas_nao_pode_ser_excluida_e_so_admin_exclui(): void
    {
        $admin = $this->criarUsuario('adm');
        $usuario = $this->criarUsuario();
        $projeto = $this->criarProjeto();
        $coluna = BoardColuna::where('id_projeto', $projeto->id_projeto)->first();
        Tarefa::create(['titulo' => 'Card', 'id_projeto' => $projeto->id_projeto, 'id_coluna' => $coluna->id_coluna]);

        $this->logarComo($usuario)->deleteJson("/api/colunas/{$coluna->id_coluna}")->assertStatus(403);
        $this->logarComo($admin)->deleteJson("/api/colunas/{$coluna->id_coluna}")->assertStatus(422);
    }

    // ------------------------------------------------------------------
    // Funcionários
    // ------------------------------------------------------------------

    public function test_trocar_email_mantem_o_acesso_e_nao_apaga_a_foto(): void
    {
        $admin = $this->criarUsuario('adm');
        $usuario = $this->criarUsuario('usuario', ['foto_perfil' => 'data:image/png;base64,AAAA']);

        $this->logarComo($admin)->putJson("/api/usuarios/{$usuario->id_usuario}", [
            'nome' => $usuario->nome,
            'email' => 'novo.email@teste.com',
            'nivel_acesso' => 'usuario',
            'senha' => 'novaSenha1',
        ])->assertOk();

        $this->assertSame('data:image/png;base64,AAAA', $usuario->fresh()->foto_perfil);
        $this->assertNotNull(Senha::find('novo.email@teste.com'));

        $this->post('/logout');
        $this->post('/login', ['email' => 'novo.email@teste.com', 'senha' => 'novaSenha1'])->assertRedirect('/home');
    }

    public function test_nao_remove_o_proprio_acesso_nem_o_do_ultimo_admin(): void
    {
        $admin = $this->criarUsuario('adm');

        $this->logarComo($admin)->putJson("/api/usuarios/{$admin->id_usuario}", [
            'nome' => $admin->nome,
            'email' => $admin->email,
            'nivel_acesso' => 'usuario',
        ])->assertStatus(422);

        $this->logarComo($admin)->patchJson("/api/senhas/{$admin->email}/nivel-acesso", ['nivel_acesso' => 'usuario'])
            ->assertStatus(422);

        $this->assertSame('adm', Senha::find($admin->email)->nivel_acesso);
    }

    public function test_nao_desativa_responsavel_de_projeto_nem_a_si_mesmo(): void
    {
        $admin = $this->criarUsuario('adm');
        $responsavel = $this->criarUsuario();
        $this->criarProjeto(['id_responsavel' => $responsavel->id_usuario]);

        $this->logarComo($admin)->deleteJson("/api/usuarios/{$responsavel->id_usuario}")->assertStatus(422);
        $this->logarComo($admin)->deleteJson("/api/usuarios/{$admin->id_usuario}")->assertStatus(422);
    }

    public function test_desativar_mantem_logs_e_restaurar_devolve_o_acesso(): void
    {
        $admin = $this->criarUsuario('adm');
        $usuario = $this->criarUsuario();
        DB::table('log_sistema')->insert(['id_usuario' => $usuario->id_usuario, 'acao' => 'teste', 'descricao' => 'x', 'data_hora' => now()]);

        $this->logarComo($admin)->deleteJson("/api/usuarios/{$usuario->id_usuario}")->assertOk();

        $this->assertDatabaseHas('log_sistema', ['acao' => 'teste', 'id_usuario' => null]);
        $this->assertNull(Senha::find($usuario->email));

        $registro = DB::table('usuarios_excluidos')->where('email', $usuario->email)->value('id');
        $this->logarComo($admin)->postJson("/api/usuarios/excluidos/{$registro}/restaurar")->assertOk();

        $this->post('/logout');
        $this->post('/login', ['email' => $usuario->email, 'senha' => 'segredo123'])->assertRedirect('/home');
    }

    // ------------------------------------------------------------------
    // Cargos e equipes
    // ------------------------------------------------------------------

    public function test_cargo_em_uso_nao_pode_ser_excluido(): void
    {
        $admin = $this->criarUsuario('adm');
        $cargo = Cargo::create(['nome_cargo' => 'Analista']);
        $this->criarUsuario('usuario', ['cargo' => 'Analista']);

        $this->logarComo($admin)->deleteJson("/api/cargos/{$cargo->id_cargo}")->assertStatus(422);
    }

    public function test_so_uma_equipe_principal_e_sem_ciclo_na_hierarquia(): void
    {
        $admin = $this->criarUsuario('adm');
        $empresa = Equipe::create(['nome' => 'Empresa', 'tipo' => 'EMPRESA', 'criado_por' => $admin->id_usuario]);
        $time = Equipe::create(['nome' => 'Time', 'tipo' => 'SUBEQUIPE', 'equipe_pai' => $empresa->id_equipe, 'criado_por' => $admin->id_usuario]);

        $this->logarComo($admin)->postJson('/api/equipes', [
            'nome' => 'Outra Empresa',
            'tipo' => 'EMPRESA',
            'criado_por' => $admin->id_usuario,
        ])->assertStatus(422);

        $this->logarComo($admin)->putJson("/api/equipes/{$empresa->id_equipe}", [
            'nome' => 'Empresa',
            'tipo' => 'SUBEQUIPE',
            'equipe_pai' => $time->id_equipe,
            'criado_por' => $admin->id_usuario,
        ])->assertStatus(422);
    }

    public function test_lider_de_equipe_vira_administrador(): void
    {
        $admin = $this->criarUsuario('adm');
        $lider = $this->criarUsuario();

        $this->logarComo($admin)->postJson('/api/equipes', [
            'nome' => 'Backend',
            'criado_por' => $admin->id_usuario,
            'id_lider' => $lider->id_usuario,
        ])->assertCreated();

        $this->assertSame('adm', Senha::find($lider->email)->nivel_acesso);
    }

    public function test_ex_lider_volta_a_usuario_mas_quem_ja_era_admin_continua(): void
    {
        $admin = $this->criarUsuario('adm');
        $outroAdmin = $this->criarUsuario('adm');
        $lider = $this->criarUsuario();

        $equipe = $this->logarComo($admin)->postJson('/api/equipes', [
            'nome' => 'Backend',
            'criado_por' => $admin->id_usuario,
            'id_lider' => $lider->id_usuario,
        ])->json('data.equipe.id_equipe');

        $this->assertSame('adm', Senha::find($lider->email)->nivel_acesso);

        // Troca o líder por quem já era administrador antes.
        $this->logarComo($admin)->putJson("/api/equipes/{$equipe}", [
            'nome' => 'Backend',
            'criado_por' => $admin->id_usuario,
            'id_lider' => $outroAdmin->id_usuario,
        ])->assertOk();

        $this->assertSame('usuario', Senha::find($lider->email)->nivel_acesso);

        // Excluir a equipe não tira o acesso de quem já era admin.
        $this->logarComo($admin)->deleteJson("/api/equipes/{$equipe}")->assertOk();
        $this->assertSame('adm', Senha::find($outroAdmin->email)->nivel_acesso);
    }

    public function test_funcionario_restaurado_volta_para_a_mesma_equipe(): void
    {
        $admin = $this->criarUsuario('adm');
        $equipe = Equipe::create(['nome' => 'Design', 'tipo' => 'SUBEQUIPE', 'criado_por' => $admin->id_usuario]);
        $usuario = $this->criarUsuario('usuario', ['id_equipe' => $equipe->id_equipe]);

        $this->logarComo($admin)->deleteJson("/api/usuarios/{$usuario->id_usuario}")->assertOk();
        $registro = DB::table('usuarios_excluidos')->where('email', $usuario->email)->value('id');
        $this->logarComo($admin)->postJson("/api/usuarios/excluidos/{$registro}/restaurar")->assertOk();

        $this->assertSame($equipe->id_equipe, (int) Usuario::where('email', $usuario->email)->value('id_equipe'));
    }

    public function test_status_do_projeto_aceita_so_os_valores_da_tela(): void
    {
        $admin = $this->criarUsuario('adm');

        $id = $this->logarComo($admin)->postJson('/api/projetos', ['nome_projeto' => 'Sem status'])
            ->assertCreated()
            ->json('data.projeto.id_projeto');
        $this->assertSame('Planejamento', Projeto::find($id)->status_projeto);

        $this->logarComo($admin)->putJson("/api/projetos/{$id}", ['nome_projeto' => 'Sem status', 'status_projeto' => 'concluido'])
            ->assertOk();
        $this->assertSame('Concluído', Projeto::find($id)->status_projeto);

        $this->logarComo($admin)->putJson("/api/projetos/{$id}", ['nome_projeto' => 'Sem status', 'status_projeto' => 'Qualquer coisa'])
            ->assertStatus(422);
    }

    // ------------------------------------------------------------------
    // Lixeira de projetos, dashboard e notificações
    // ------------------------------------------------------------------

    public function test_projeto_excluido_sai_do_dashboard_e_e_apagado_apos_sete_dias(): void
    {
        $admin = $this->criarUsuario('adm');
        $projeto = $this->criarProjeto();
        Tarefa::create(['titulo' => 'Card', 'id_projeto' => $projeto->id_projeto, 'status_task' => 'TO_DO', 'progresso' => 0]);

        $this->logarComo($admin)->getJson('/api/dashboard')->assertJsonPath('data.kpis.tarefas_pendentes', 1);

        $this->logarComo($admin)->deleteJson("/api/projetos/{$projeto->id_projeto}")->assertOk();
        $this->logarComo($admin)->getJson('/api/dashboard')
            ->assertJsonPath('data.kpis.tarefas_pendentes', 0)
            ->assertJsonPath('data.kpis.projetos_ativos', 0);

        DB::table('projetos_excluidos')->update(['expira_em' => now()->subMinute()]);
        LixeiraProjetos::purgarExpirados();

        $this->assertNull(Projeto::find($projeto->id_projeto));
        $this->assertSame(0, Tarefa::count());
    }

    public function test_dashboard_reconhece_conclusao_em_quadro_personalizado(): void
    {
        $admin = $this->criarUsuario('adm');
        $projeto = Projeto::create(['nome_projeto' => 'Custom', 'kanban_padrao' => false]);
        $coluna = BoardColuna::create(['id_projeto' => $projeto->id_projeto, 'nome' => 'Finalizado', 'progresso' => 100, 'ordem' => 1, 'arquiva_ao_concluir' => true]);
        Tarefa::create(['titulo' => 'Card', 'id_projeto' => $projeto->id_projeto, 'id_coluna' => $coluna->id_coluna, 'status_task' => 'Finalizado', 'progresso' => 100, 'em_historico' => true]);

        $this->logarComo($admin)->getJson('/api/dashboard')
            ->assertJsonPath('data.kpis.tarefas_pendentes', 0)
            ->assertJsonPath('data.kpis.tarefas_concluidas', 1);
    }

    public function test_arrastar_card_no_quadro_personalizado_conclui_e_reabre(): void
    {
        $usuario = $this->criarUsuario();
        $projeto = Projeto::create(['nome_projeto' => 'Custom', 'kanban_padrao' => false]);
        $ideias = BoardColuna::create(['id_projeto' => $projeto->id_projeto, 'nome' => 'Ideias', 'progresso' => 10, 'ordem' => 1, 'arquiva_ao_concluir' => false]);
        $publicado = BoardColuna::create(['id_projeto' => $projeto->id_projeto, 'nome' => 'Publicado', 'progresso' => 100, 'ordem' => 2, 'arquiva_ao_concluir' => true]);
        $tarefa = Tarefa::create(['titulo' => 'Card', 'id_projeto' => $projeto->id_projeto, 'id_coluna' => $ideias->id_coluna, 'status_task' => 'Ideias', 'progresso' => 10]);

        // Mesmo payload que a tela envia ao soltar o card em outra coluna.
        $mover = fn (BoardColuna $coluna) => $this->logarComo($usuario)->patchJson("/api/tarefas/{$tarefa->id_tarefa}", [
            'id_coluna' => $coluna->id_coluna,
            'status_task' => $coluna->nome,
            'progresso' => $coluna->progresso,
            'em_historico' => $coluna->arquiva_ao_concluir,
        ])->assertOk();

        $mover($publicado);
        $tarefa->refresh();
        $this->assertSame($publicado->id_coluna, (int) $tarefa->id_coluna);
        $this->assertTrue($tarefa->em_historico);
        $this->assertNotNull($tarefa->concluida_em);

        $mover($ideias);
        $tarefa->refresh();
        $this->assertSame(10, (int) $tarefa->progresso);
        $this->assertFalse($tarefa->em_historico);
        $this->assertNull($tarefa->concluida_em);
    }

    public function test_usuario_comum_nao_ve_log_do_sistema_no_sino(): void
    {
        $usuario = $this->criarUsuario();
        DB::table('log_sistema')->insert(['id_usuario' => null, 'acao' => 'acao_admin', 'descricao' => 'segredo', 'data_hora' => now()]);

        $titulos = collect($this->logarComo($usuario)->getJson('/api/notificacoes')->json('data.notifications'))->pluck('title');

        $this->assertNotContains('acao_admin', $titulos);
    }
}
