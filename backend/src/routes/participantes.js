module.exports = function registrarRotasParticipantes(app, contexto) {
  const { db, autenticar, crypto, clausulaGrupoPorId, grupoEhPrivado, buscarGrupoDoParticipante, notificarUsuarioMensagens } = contexto;

// O criador começa como administrador; somente administradores podem convidar.
app.post('/api/grupos/:grupoId/convites', autenticar, async (req, res) => {
  const { idPublico } = req.body;
  if (!/^\d{6}$/.test(String(idPublico || ''))) {
    return res.status(400).json({ erro: 'Informe o ID de usuário de seis dígitos.' });
  }

  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await db.promise().query(
      `SELECT g.id, g.codigo FROM grupos g
       LEFT JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       WHERE ${grupoBusca.sql} AND gm.administrador = 1
       LIMIT 1`,
      [req.usuario.id, ...grupoBusca.parametros]
    );
    if (!grupos.length) return res.status(403).json({ erro: 'Somente administradores podem convidar para este grupo.' });

    const [usuarios] = await db.promise().query(
      'SELECT id FROM usuarios WHERE id_publico = ?', [String(idPublico)]
    );
    if (!usuarios.length) return res.status(404).json({ erro: 'Não existe usuário com esse ID.' });
    const convidadoId = usuarios[0].id;
    if (convidadoId === req.usuario.id) return res.status(400).json({ erro: 'Você já faz parte deste grupo.' });

    const [membros] = await db.promise().query(
      'SELECT 1 FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?', [grupos[0].id, convidadoId]
    );
    if (membros.length) return res.status(409).json({ erro: 'Esse usuário já participa do grupo.' });

    const [convitesPendentes] = await db.promise().query(
      `SELECT id FROM convites_grupo
       WHERE grupo_id = ? AND convidado_id = ? AND status = 'pendente' LIMIT 1`,
      [grupos[0].id, convidadoId]
    );
    if (convitesPendentes.length) return res.status(409).json({ erro: 'Já existe um convite pendente para esse usuário.' });

    await db.promise().query(
      `INSERT INTO convites_grupo (grupo_id, convidante_id, convidado_id, status)
       VALUES (?, ?, ?, 'pendente')`,
      [grupos[0].id, req.usuario.id, convidadoId]
    );
    notificarUsuarioMensagens(convidadoId, 'notificacao', { tipo: 'convite-grupo', grupoId: grupos[0].id });
    return res.status(201).json({ mensagem: 'Convite enviado com sucesso.' });
  } catch (erro) {
    console.error('Erro ao enviar convite:', erro);
    return res.status(500).json({ erro: 'Não foi possível enviar o convite.' });
  }
});

app.get('/api/convites', autenticar, async (req, res) => {
  try {
    const [convites] = await db.promise().query(
      `SELECT c.id, c.criado_em, u.id_publico AS id_convidante,
              u.nome_usuario AS nome_convidante, g.nome AS nome_grupo,
              g.codigo AS chave_grupo, g.id_unico
       FROM convites_grupo c
       JOIN usuarios u ON u.id = c.convidante_id
       JOIN grupos g ON g.id = c.grupo_id
       WHERE c.convidado_id = ? AND c.status = 'pendente'
       ORDER BY c.criado_em DESC`,
      [req.usuario.id]
    );
    return res.json(convites);
  } catch (erro) {
    console.error('Erro ao carregar convites:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar os convites.' });
  }
});

app.post('/api/convites/:id/resposta', autenticar, async (req, res) => {
  const { acao } = req.body;
  if (!['aceitar', 'rejeitar'].includes(acao)) {
    return res.status(400).json({ erro: 'Escolha aceitar ou rejeitar o convite.' });
  }

  const conexao = await db.promise().getConnection();
  try {
    await conexao.beginTransaction();
    const [convites] = await conexao.query(
      `SELECT grupo_id, convidado_id FROM convites_grupo
       WHERE id = ? AND convidado_id = ? AND status = 'pendente' FOR UPDATE`,
      [req.params.id, req.usuario.id]
    );
    if (!convites.length) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Convite não encontrado ou já respondido.' });
    }

    const convite = convites[0];
    if (acao === 'aceitar') {
      await conexao.query(
        'INSERT INTO grupo_membros (grupo_id, usuario_id, administrador) VALUES (?, ?, 0)',
        [convite.grupo_id, convite.convidado_id]
      );
    }
    await conexao.query(
      `UPDATE convites_grupo SET status = ?, respondido_em = CURRENT_TIMESTAMP WHERE id = ?`,
      [acao === 'aceitar' ? 'aceito' : 'rejeitado', req.params.id]
    );
    await conexao.commit();
    return res.json({ mensagem: acao === 'aceitar' ? 'Você entrou no grupo.' : 'Convite rejeitado.' });
  } catch (erro) {
    await conexao.rollback();
    console.error('Erro ao responder convite:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder ao convite.' });
  } finally {
    conexao.release();
  }
});

app.get('/api/grupos/:grupoId/participantes', autenticar, async (req, res) => {
  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [membros] = await db.promise().query(
      `SELECT u.id_publico, u.nome_usuario, gm.administrador
       FROM grupos g
       JOIN grupo_membros acesso ON acesso.grupo_id = g.id AND acesso.usuario_id = ?
       JOIN grupo_membros gm ON gm.grupo_id = g.id
       JOIN usuarios u ON u.id = gm.usuario_id
       WHERE ${grupoBusca.sql}
       ORDER BY gm.administrador DESC, u.nome_usuario`,
      [req.usuario.id, ...grupoBusca.parametros]
    );
    if (!membros.length) {
      const [acesso] = await db.promise().query(
        `SELECT g.id FROM grupos g
         LEFT JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
         WHERE ${grupoBusca.sql} AND gm.usuario_id IS NOT NULL LIMIT 1`,
        [req.usuario.id, ...grupoBusca.parametros]
      );
      if (!acesso.length) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    }
    return res.json(membros);
  } catch (erro) {
    console.error('Erro ao carregar participantes:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar os participantes.' });
  }
});

// Somente administradores do grupo podem promover um participante.
app.post('/api/grupos/:grupoId/administradores', autenticar, async (req, res) => {
  const idPublico = String(req.body.idPublico || '').trim();
  if (!/^\d{6}$/.test(idPublico)) {
    return res.status(400).json({ erro: 'ID de usuário inválido.' });
  }

  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await db.promise().query(
      `SELECT g.id FROM grupos g
       LEFT JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       WHERE ${grupoBusca.sql} AND gm.administrador = 1
       LIMIT 1`,
      [req.usuario.id, ...grupoBusca.parametros]
    );
    if (!grupos.length) {
      return res.status(403).json({ erro: 'Somente administradores deste grupo podem promover participantes.' });
    }

    const grupoId = grupos[0].id;
    const [membros] = await db.promise().query(
      `SELECT gm.usuario_id, gm.administrador
       FROM grupo_membros gm
       JOIN usuarios u ON u.id = gm.usuario_id
       WHERE gm.grupo_id = ? AND u.id_publico = ?
       LIMIT 1`,
      [grupoId, idPublico]
    );
    if (!membros.length) {
      return res.status(404).json({ erro: 'Esse usuário não participa do grupo.' });
    }
    if (Number(membros[0].administrador) === 1) {
      return res.status(409).json({ erro: 'Esse participante já é administrador.' });
    }

    await db.promise().query(
      'UPDATE grupo_membros SET administrador = 1 WHERE grupo_id = ? AND usuario_id = ?',
      [grupoId, membros[0].usuario_id]
    );
    return res.json({ mensagem: 'Participante promovido a administrador.' });
  } catch (erro) {
    console.error('Erro ao promover participante:', erro);
    return res.status(500).json({ erro: 'Não foi possível promover o participante.' });
  }
});

// Administradores podem rebaixar outro administrador a participante comum.
app.patch('/api/grupos/:grupoId/administradores', autenticar, async (req, res) => {
  const idPublico = String(req.body.idPublico || '').trim();
  if (!/^\d{6}$/.test(idPublico)) return res.status(400).json({ erro: 'ID de usuário inválido.' });
  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await db.promise().query(
      `SELECT g.id FROM grupos g JOIN grupo_membros gm ON gm.grupo_id = g.id
       WHERE ${grupoBusca.sql} AND gm.usuario_id = ? AND gm.administrador = 1 LIMIT 1`,
      [...grupoBusca.parametros, req.usuario.id]
    );
    if (!grupos.length) return res.status(403).json({ erro: 'Somente administradores deste grupo podem rebaixar participantes.' });
    const grupoId = grupos[0].id;
    const [alvos] = await db.promise().query(
      `SELECT gm.usuario_id, gm.administrador FROM grupo_membros gm
       JOIN usuarios u ON u.id = gm.usuario_id WHERE gm.grupo_id = ? AND u.id_publico = ? LIMIT 1`,
      [grupoId, idPublico]
    );
    if (!alvos.length) return res.status(404).json({ erro: 'Esse usuário não participa do grupo.' });
    if (Number(alvos[0].administrador) !== 1) return res.status(409).json({ erro: 'Esse participante já é membro.' });
    if (Number(alvos[0].usuario_id) === Number(req.usuario.id)) return res.status(400).json({ erro: 'Você não pode rebaixar a si mesmo.' });
    const [[{ total }]] = await db.promise().query(
      'SELECT COUNT(*) AS total FROM grupo_membros WHERE grupo_id = ? AND administrador = 1', [grupoId]
    );
    if (Number(total) <= 1) return res.status(409).json({ erro: 'O grupo precisa manter ao menos um administrador.' });
    await db.promise().query('UPDATE grupo_membros SET administrador = 0 WHERE grupo_id = ? AND usuario_id = ?', [grupoId, alvos[0].usuario_id]);
    return res.json({ mensagem: 'Administrador rebaixado a membro.' });
  } catch (erro) {
    console.error('Erro ao rebaixar administrador:', erro);
    return res.status(500).json({ erro: 'Não foi possível rebaixar o administrador.' });
  }
});

// Somente administradores podem remover outros participantes do grupo.
app.delete('/api/grupos/:grupoId/participantes', autenticar, async (req, res) => {
  const idPublico = String(req.body.idPublico || '').trim();
  if (!/^\d{6}$/.test(idPublico)) return res.status(400).json({ erro: 'ID de usuário inválido.' });
  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await db.promise().query(
      `SELECT g.id FROM grupos g JOIN grupo_membros gm ON gm.grupo_id = g.id
       WHERE ${grupoBusca.sql} AND gm.usuario_id = ? AND gm.administrador = 1 LIMIT 1`,
      [...grupoBusca.parametros, req.usuario.id]
    );
    if (!grupos.length) return res.status(403).json({ erro: 'Somente administradores deste grupo podem remover participantes.' });
    const grupoId = grupos[0].id;
    const [alvos] = await db.promise().query(
      `SELECT gm.usuario_id, gm.administrador FROM grupo_membros gm
       JOIN usuarios u ON u.id = gm.usuario_id WHERE gm.grupo_id = ? AND u.id_publico = ? LIMIT 1`,
      [grupoId, idPublico]
    );
    if (!alvos.length) return res.status(404).json({ erro: 'Esse usuário não participa do grupo.' });
    if (Number(alvos[0].usuario_id) === Number(req.usuario.id)) return res.status(400).json({ erro: 'Use a opção de sair para deixar o grupo.' });
    if (Number(alvos[0].administrador) === 1) {
      const [[{ total }]] = await db.promise().query(
        'SELECT COUNT(*) AS total FROM grupo_membros WHERE grupo_id = ? AND administrador = 1', [grupoId]
      );
      if (Number(total) <= 1) return res.status(409).json({ erro: 'O grupo precisa manter ao menos um administrador.' });
    }
    await db.promise().query('DELETE FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?', [grupoId, alvos[0].usuario_id]);
    return res.json({ mensagem: 'Participante removido do grupo.' });
  } catch (erro) {
    console.error('Erro ao remover participante:', erro);
    return res.status(500).json({ erro: 'Não foi possível remover o participante.' });
  }
});

// Solicita entrada em grupo privado usando o código. Administradores aprovam na tela de notificações.
app.post('/api/grupos/solicitar-entrada', autenticar, async (req, res) => {
  const codigo = String(req.body.codigo || '').trim();
  if (!/^\d{6}$/.test(codigo)) return res.status(400).json({ erro: 'Informe um código válido de seis dígitos.' });

  try {
    const [grupos] = await db.promise().query(
      'SELECT id, privacidade, criador_id FROM grupos WHERE codigo = ? ORDER BY id DESC', [codigo]
    );
    const gruposPrivados = grupos.filter((grupo) => grupoEhPrivado(grupo.privacidade));
    if (!gruposPrivados.length) {
      return res.status(404).json({ erro: 'Grupo privado não encontrado para esse código.' });
    }
    if (gruposPrivados.length > 1) return res.status(409).json({ erro: 'Esse código corresponde a mais de um grupo privado. Peça ao administrador um código atualizado.' });
    const grupo = gruposPrivados[0];
    const [membros] = await db.promise().query(
      'SELECT 1 FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?', [grupo.id, req.usuario.id]
    );
    if (membros.length) return res.status(409).json({ erro: 'Você já participa deste grupo.' });
    const [pendentes] = await db.promise().query(
      `SELECT id FROM solicitacoes_grupo WHERE grupo_id = ? AND solicitante_id = ? AND status = 'pendente' LIMIT 1`,
      [grupo.id, req.usuario.id]
    );
    if (pendentes.length) return res.status(409).json({ erro: 'Sua solicitação já está aguardando aprovação.' });

    await db.promise().query(
      `INSERT INTO solicitacoes_grupo (grupo_id, solicitante_id, status) VALUES (?, ?, 'pendente')`,
      [grupo.id, req.usuario.id]
    );
    const [administradores] = await db.promise().query(
      'SELECT usuario_id FROM grupo_membros WHERE grupo_id = ? AND administrador = 1', [grupo.id]
    );
    administradores.forEach(({ usuario_id }) => {
      notificarUsuarioMensagens(usuario_id, 'notificacao', { tipo: 'solicitacao-grupo', grupoId: grupo.id });
    });
    return res.status(201).json({ mensagem: 'Solicitação enviada aos administradores do grupo.' });
  } catch (erro) {
    console.error('Erro ao solicitar entrada no grupo privado:', erro);
    return res.status(500).json({ erro: 'Não foi possível enviar a solicitação.' });
  }
});

// Código de grupo aberto adiciona o usuário imediatamente como participante comum.
app.post('/api/grupos/entrar-aberto', autenticar, async (req, res) => {
  const codigo = String(req.body.codigo || '').trim();
  if (!/^\d{6}$/.test(codigo)) return res.status(400).json({ erro: 'Informe um código válido de seis dígitos.' });

  try {
    const [grupos] = await db.promise().query(
      'SELECT id, privacidade FROM grupos WHERE codigo = ? ORDER BY id DESC', [codigo]
    );
    const gruposAbertos = grupos.filter((grupo) => !grupoEhPrivado(grupo.privacidade));
    if (!gruposAbertos.length) {
      return res.status(404).json({ erro: 'Grupo aberto não encontrado para esse código.' });
    }
    if (gruposAbertos.length > 1) return res.status(409).json({ erro: 'Esse código corresponde a mais de um grupo aberto. Peça ao administrador um código atualizado.' });

    await db.promise().query(
      'INSERT INTO grupo_membros (grupo_id, usuario_id, administrador) VALUES (?, ?, 0)',
      [gruposAbertos[0].id, req.usuario.id]
    );
    return res.status(201).json({ mensagem: 'Você entrou no grupo aberto.' });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Você já participa deste grupo.' });
    console.error('Erro ao entrar no grupo aberto:', erro);
    return res.status(500).json({ erro: 'Não foi possível entrar no grupo.' });
  }
});

// Pedidos privados pendentes ficam visíveis somente aos administradores daquele grupo.
app.get('/api/solicitacoes-grupo', autenticar, async (req, res) => {
  try {
    const [solicitacoes] = await db.promise().query(
      `SELECT s.id, s.criado_em, u.id_publico AS id_solicitante,
              u.nome_usuario AS nome_solicitante, g.nome AS nome_grupo,
              g.codigo AS chave_grupo, g.id_unico
       FROM solicitacoes_grupo s
       JOIN grupos g ON g.id = s.grupo_id
       JOIN usuarios u ON u.id = s.solicitante_id
       LEFT JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       WHERE s.status = 'pendente' AND gm.administrador = 1
       ORDER BY s.criado_em DESC`,
      [req.usuario.id]
    );
    return res.json(solicitacoes);
  } catch (erro) {
    console.error('Erro ao carregar solicitações de entrada:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar as solicitações.' });
  }
});

app.post('/api/solicitacoes-grupo/:id/resposta', autenticar, async (req, res) => {
  const { acao } = req.body;
  if (!['aceitar', 'rejeitar'].includes(acao)) {
    return res.status(400).json({ erro: 'Escolha aceitar ou rejeitar a solicitação.' });
  }

  const conexao = await db.promise().getConnection();
  try {
    await conexao.beginTransaction();
    const [solicitacoes] = await conexao.query(
      `SELECT s.id, s.grupo_id, s.solicitante_id
       FROM solicitacoes_grupo s
       JOIN grupos g ON g.id = s.grupo_id
       LEFT JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       WHERE s.id = ? AND s.status = 'pendente'
         AND gm.administrador = 1
       FOR UPDATE`,
      [req.usuario.id, req.params.id]
    );
    if (!solicitacoes.length) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Solicitação não encontrada ou você não é administrador deste grupo.' });
    }
    const solicitacao = solicitacoes[0];
    if (acao === 'aceitar') {
      await conexao.query(
        'INSERT IGNORE INTO grupo_membros (grupo_id, usuario_id, administrador) VALUES (?, ?, 0)',
        [solicitacao.grupo_id, solicitacao.solicitante_id]
      );
    }
    await conexao.query(
      `UPDATE solicitacoes_grupo SET status = ?, respondido_em = CURRENT_TIMESTAMP WHERE id = ?`,
      [acao === 'aceitar' ? 'aceito' : 'rejeitado', solicitacao.id]
    );
    await conexao.commit();
    return res.json({ mensagem: acao === 'aceitar' ? 'Solicitação aceita; o usuário entrou no grupo.' : 'Solicitação rejeitada.' });
  } catch (erro) {
    await conexao.rollback();
    console.error('Erro ao responder solicitação de entrada:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder à solicitação.' });
  } finally {
    conexao.release();
  }
});

// Rota para Excluir um Grupo de Estudo (Baseada no id_unico)
app.delete('/api/grupos/:id', autenticar, async (req, res) => {
  const { id } = req.params;

  try {
    const eNumero = !isNaN(id);

    const sql = eNumero
      ? "DELETE FROM grupos WHERE (id = ? OR id_unico = ?) AND criador_id = ? AND EXISTS (SELECT 1 FROM grupo_membros gm WHERE gm.grupo_id = grupos.id AND gm.usuario_id = ? AND gm.administrador = 1)"
      : "DELETE FROM grupos WHERE id_unico = ? AND criador_id = ? AND EXISTS (SELECT 1 FROM grupo_membros gm WHERE gm.grupo_id = grupos.id AND gm.usuario_id = ? AND gm.administrador = 1)";

    const params = eNumero ? [id, id, req.usuario.id, req.usuario.id] : [id, req.usuario.id, req.usuario.id];

    // ATENÇÃO: É necessário usar db.promise().query() aqui!
    const [resultado] = await db.promise().query(sql, params);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: "Grupo não encontrado." });
    }

    return res.json({ mensagem: "Grupo excluído com sucesso!" });
  } catch (erro) {
    console.error("Erro ao excluir grupo:", erro);
    return res.status(500).json({ erro: "Erro ao excluir o grupo do banco de dados." });
  }
});

// Um membro pode sair. Ao sair um administrador, preserva-se a administração;
// o último membro causa a exclusão automática do grupo.
app.delete('/api/grupos/:grupoId/sair', autenticar, async (req, res) => {
  const conexao = await db.promise().getConnection();
  try {
    await conexao.beginTransaction();
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await conexao.query(
      `SELECT g.id, gm.administrador
       FROM grupos g
       JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       WHERE ${grupoBusca.sql}
       LIMIT 1 FOR UPDATE`,
      [req.usuario.id, ...grupoBusca.parametros]
    );
    if (!grupos.length) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Você não participa deste grupo ou ele não existe.' });
    }

    const grupo = grupos[0];
    const usuarioEhAdministrador = Number(grupo.administrador) === 1;
    const [outrosMembros] = await conexao.query(
      `SELECT gm.usuario_id, gm.administrador, u.nome_usuario
       FROM grupo_membros gm
       JOIN usuarios u ON u.id = gm.usuario_id
       WHERE gm.grupo_id = ? AND gm.usuario_id <> ?
       ORDER BY gm.ingressou_em, gm.usuario_id
       FOR UPDATE`,
      [grupo.id, req.usuario.id]
    );

    if (!outrosMembros.length) {
      await conexao.query('DELETE FROM grupos WHERE id = ?', [grupo.id]);
      await conexao.commit();
      return res.json({ mensagem: 'Você era o último participante; o grupo foi excluído.', grupoExcluido: true });
    }

    let sucessor = null;
    if (usuarioEhAdministrador) {
      const administradores = outrosMembros.filter((membro) => Number(membro.administrador) === 1);
      if (!administradores.length) {
        // Sem outros administradores, escolhe aleatoriamente um membro restante.
        sucessor = outrosMembros[crypto.randomInt(outrosMembros.length)];
        await conexao.query(
          'UPDATE grupo_membros SET administrador = 1 WHERE grupo_id = ? AND usuario_id = ?',
          [grupo.id, sucessor.usuario_id]
        );
      }
    }

    await conexao.query(
      'DELETE FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?',
      [grupo.id, req.usuario.id]
    );
    await conexao.commit();
    return res.json({
      mensagem: sucessor && !Number(sucessor.administrador)
        ? `Você saiu do grupo. ${sucessor.nome_usuario} foi escolhido como novo administrador.`
        : 'Você saiu do grupo.',
      grupoExcluido: false,
    });
  } catch (erro) {
    await conexao.rollback();
    console.error('Erro ao sair do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível sair do grupo.' });
  } finally {
    conexao.release();
  }
});
};
