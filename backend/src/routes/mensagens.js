module.exports = function registrarRotasMensagens(app, contexto) {
  const { db, autenticar, express, fs, crypto, path, pastaUploads, localizarArquivoUpload, usuarioTemContato, sanitizarNomeArquivo, lerFormularioAtividade, notificarUsuarioMensagens } = contexto;

app.get('/api/mensagens/tempo-real', autenticar, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  const usuarioId = Number(req.usuario.id);
  if (!conexoesMensagens.has(usuarioId)) conexoesMensagens.set(usuarioId, new Set());
  const conexoes = conexoesMensagens.get(usuarioId);
  conexoes.add(res);
  res.write('event: conectado\ndata: {}\n\n');
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': keep-alive\n\n');
  }, 25000);
  res.on('close', () => {
    clearInterval(heartbeat);
    conexoes.delete(res);
    if (!conexoes.size) conexoesMensagens.delete(usuarioId);
  });
});

// Contatos são adicionados pelo ID público e ficam disponíveis para mensagens privadas.
app.get('/api/mensagens/contatos', autenticar, async (req, res) => {
  try {
    const [contatos] = await db.promise().query(
      `SELECT u.id, u.id_publico, u.nome_usuario,
              ultima.texto AS ultima_mensagem, ultima.nome_arquivo AS ultimo_arquivo,
              ultima.criado_em AS ultima_mensagem_em,
              (SELECT COUNT(*) FROM mensagens m_nao_lidas
               WHERE m_nao_lidas.remetente_id = u.id
                 AND m_nao_lidas.destinatario_id = ? AND m_nao_lidas.lida_em IS NULL) AS nao_lidas
       FROM contatos_usuarios c
       JOIN usuarios u ON u.id = c.contato_id
       LEFT JOIN mensagens ultima ON ultima.id = (
         SELECT m.id FROM mensagens m
         WHERE (m.remetente_id = ? AND m.destinatario_id = u.id)
            OR (m.remetente_id = u.id AND m.destinatario_id = ?)
         ORDER BY m.criado_em DESC, m.id DESC LIMIT 1
       )
       WHERE c.usuario_id = ?
       ORDER BY COALESCE(ultima.criado_em, c.criado_em) DESC, u.nome_usuario ASC`,
      [req.usuario.id, req.usuario.id, req.usuario.id, req.usuario.id]
    );
    return res.json(contatos);
  } catch (erro) {
    console.error('Erro ao carregar contatos de mensagens:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar seus contatos.' });
  }
});

app.post('/api/mensagens/contatos', autenticar, async (req, res) => {
  const idPublico = String(req.body.idPublico || '').trim();
  if (!/^\d{6}$/.test(idPublico)) return res.status(400).json({ erro: 'Informe um ID de usuário com seis dígitos.' });
  let conexao;
  try {
    const [usuarios] = await db.promise().query(
      'SELECT id, id_publico, nome_usuario FROM usuarios WHERE id_publico = ? LIMIT 1', [idPublico]
    );
    if (!usuarios.length) return res.status(404).json({ erro: 'Não encontramos um usuário com esse ID.' });
    const contato = usuarios[0];
    if (Number(contato.id) === Number(req.usuario.id)) return res.status(400).json({ erro: 'Você não pode adicionar seu próprio ID.' });

    const [jaContato] = await db.promise().query(
      'SELECT 1 FROM contatos_usuarios WHERE usuario_id = ? AND contato_id = ? LIMIT 1',
      [req.usuario.id, contato.id]
    );
    if (jaContato.length) return res.status(409).json({ erro: 'Esse usuário já está nos seus contatos.' });
    const [pendentes] = await db.promise().query(
      `SELECT id, remetente_id, destinatario_id FROM solicitacoes_contato
       WHERE status = 'pendente'
         AND ((remetente_id = ? AND destinatario_id = ?) OR (remetente_id = ? AND destinatario_id = ?))
       ORDER BY id DESC LIMIT 1`,
      [req.usuario.id, contato.id, contato.id, req.usuario.id]
    );
    if (pendentes.length) {
      if (Number(pendentes[0].remetente_id) === Number(req.usuario.id)) {
        return res.status(409).json({ erro: 'Você já enviou uma solicitação para esse usuário.' });
      }
      return res.status(409).json({ erro: 'Esse usuário já enviou uma solicitação. Confira a seção de solicitações recebidas.' });
    }
    conexao = await db.promise().getConnection();
    const [resultado] = await conexao.query(
      `INSERT INTO solicitacoes_contato (remetente_id, destinatario_id, status)
       VALUES (?, ?, 'pendente')`,
      [req.usuario.id, contato.id]
    );
    return res.status(201).json({ id: resultado.insertId, mensagem: `Solicitação enviada para ${contato.nome_usuario}.` });
  } catch (erro) {
    console.error('Erro ao adicionar contato de mensagens:', erro);
    return res.status(500).json({ erro: 'Não foi possível adicionar este contato.' });
  } finally {
    conexao?.release();
  }
});

app.get('/api/mensagens/solicitacoes', autenticar, async (req, res) => {
  try {
    const [solicitacoes] = await db.promise().query(
      `SELECT s.id, s.criado_em, u.id AS usuario_id, u.id_publico, u.nome_usuario
       FROM solicitacoes_contato s
       JOIN usuarios u ON u.id = s.remetente_id
       WHERE s.destinatario_id = ? AND s.status = 'pendente'
       ORDER BY s.criado_em DESC, s.id DESC`,
      [req.usuario.id]
    );
    return res.json(solicitacoes);
  } catch (erro) {
    console.error('Erro ao carregar solicitações de contato:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar as solicitações de contato.' });
  }
});

app.post('/api/mensagens/solicitacoes/:solicitacaoId/responder', autenticar, async (req, res) => {
  const acao = String(req.body.acao || '');
  if (!['aceitar', 'recusar'].includes(acao)) return res.status(400).json({ erro: 'Escolha aceitar ou recusar a solicitação.' });
  let conexao;
  try {
    conexao = await db.promise().getConnection();
    await conexao.beginTransaction();
    const [solicitacoes] = await conexao.query(
      `SELECT id, remetente_id, destinatario_id FROM solicitacoes_contato
       WHERE id = ? AND destinatario_id = ? AND status = 'pendente' LIMIT 1 FOR UPDATE`,
      [req.params.solicitacaoId, req.usuario.id]
    );
    if (!solicitacoes.length) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Esta solicitação não está mais pendente.' });
    }
    const solicitacao = solicitacoes[0];
    if (acao === 'aceitar') {
      await conexao.query(
        'INSERT IGNORE INTO contatos_usuarios (usuario_id, contato_id) VALUES (?, ?), (?, ?)',
        [solicitacao.remetente_id, solicitacao.destinatario_id, solicitacao.destinatario_id, solicitacao.remetente_id]
      );
    }
    await conexao.query(
      `UPDATE solicitacoes_contato SET status = ?, resolvida_em = CURRENT_TIMESTAMP WHERE id = ?`,
      [acao === 'aceitar' ? 'aceita' : 'recusada', solicitacao.id]
    );
    await conexao.commit();
    return res.json({ mensagem: acao === 'aceitar' ? 'Solicitação aceita. O contato já pode conversar com você.' : 'Solicitação recusada.' });
  } catch (erro) {
    if (conexao) await conexao.rollback();
    console.error('Erro ao responder solicitação de contato:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder à solicitação.' });
  } finally {
    conexao?.release();
  }
});

app.delete('/api/mensagens/contatos/:contatoId', autenticar, async (req, res) => {
  const contatoId = Number(req.params.contatoId);
  if (!Number.isInteger(contatoId) || contatoId < 1 || contatoId === Number(req.usuario.id)) {
    return res.status(400).json({ erro: 'Contato inválido.' });
  }
  let conexao;
  try {
    conexao = await db.promise().getConnection();
    await conexao.beginTransaction();
    const [resultado] = await conexao.query(
      'DELETE FROM contatos_usuarios WHERE (usuario_id = ? AND contato_id = ?) OR (usuario_id = ? AND contato_id = ?)',
      [req.usuario.id, contatoId, contatoId, req.usuario.id]
    );
    await conexao.query(
      `DELETE FROM solicitacoes_contato
       WHERE status = 'pendente'
         AND ((remetente_id = ? AND destinatario_id = ?) OR (remetente_id = ? AND destinatario_id = ?))`,
      [req.usuario.id, contatoId, contatoId, req.usuario.id]
    );
    await conexao.commit();
    if (!resultado.affectedRows) return res.status(404).json({ erro: 'Este usuário não está nos seus contatos.' });
    return res.json({ mensagem: 'Contato removido. O histórico ficará guardado, mas a conversa ficará indisponível até uma nova solicitação ser aceita.' });
  } catch (erro) {
    if (conexao) await conexao.rollback();
    console.error('Erro ao remover contato de mensagens:', erro);
    return res.status(500).json({ erro: 'Não foi possível remover este contato.' });
  } finally {
    conexao?.release();
  }
});

app.get('/api/mensagens/contatos/:contatoId/mensagens', autenticar, async (req, res) => {
  const contatoId = Number(req.params.contatoId);
  if (!Number.isInteger(contatoId) || contatoId < 1) return res.status(400).json({ erro: 'Contato inválido.' });
  try {
    if (!(await usuarioTemContato(req.usuario.id, contatoId))) return res.status(403).json({ erro: 'Adicione este usuário como contato antes de conversar.' });
    await db.promise().query(
      'UPDATE mensagens SET lida_em = CURRENT_TIMESTAMP WHERE remetente_id = ? AND destinatario_id = ? AND lida_em IS NULL',
      [contatoId, req.usuario.id]
    );
    const [mensagens] = await db.promise().query(
      `SELECT * FROM (
         SELECT id, remetente_id, destinatario_id, texto, nome_arquivo, tamanho_arquivo, criado_em
         FROM mensagens
         WHERE (remetente_id = ? AND destinatario_id = ?)
            OR (remetente_id = ? AND destinatario_id = ?)
         ORDER BY criado_em DESC, id DESC LIMIT 300
       ) conversa ORDER BY criado_em ASC, id ASC`,
      [req.usuario.id, contatoId, contatoId, req.usuario.id]
    );
    return res.json(mensagens);
  } catch (erro) {
    console.error('Erro ao carregar conversa:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar esta conversa.' });
  }
});

app.post('/api/mensagens/contatos/:contatoId/mensagens', autenticar,
  (req, res, next) => req.is('multipart/form-data')
    ? express.raw({ type: 'multipart/form-data', limit: '21mb' })(req, res, next)
    : next(),
  async (req, res) => {
    const contatoId = Number(req.params.contatoId);
    if (!Number.isInteger(contatoId) || contatoId < 1) return res.status(400).json({ erro: 'Contato inválido.' });
    let texto = '';
    let arquivo = null;
    if (Buffer.isBuffer(req.body)) {
      try {
        const formulario = lerFormularioAtividade(req.body, req.headers['content-type']);
        texto = String(formulario.texto || '').trim();
        arquivo = formulario.arquivo;
      } catch (erro) {
        return res.status(400).json({ erro: erro.message });
      }
    } else {
      texto = String(req.body?.texto || '').trim();
    }
    if (!texto && !arquivo?.conteudo?.length) return res.status(400).json({ erro: 'Escreva uma mensagem ou anexe um arquivo.' });
    if (texto.length > 5000) return res.status(400).json({ erro: 'A mensagem pode ter até 5.000 caracteres.' });
    if (arquivo && arquivo.conteudo.length > 20_000_000) return res.status(413).json({ erro: 'O arquivo deve ter no máximo 20 MB.' });

    let caminhoArquivo;
    try {
      if (!(await usuarioTemContato(req.usuario.id, contatoId))) return res.status(403).json({ erro: 'Adicione este usuário como contato antes de conversar.' });
      if (arquivo) {
        await fs.mkdir(pastaUploads, { recursive: true });
        caminhoArquivo = path.join(pastaUploads, `${crypto.randomUUID()}.bin`);
        await fs.writeFile(caminhoArquivo, arquivo.conteudo, { flag: 'wx' });
      }
      const [resultado] = await db.promise().query(
        `INSERT INTO mensagens
           (remetente_id, destinatario_id, texto, nome_arquivo, caminho_arquivo, tipo_arquivo, tamanho_arquivo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.usuario.id, contatoId, texto || null, arquivo ? sanitizarNomeArquivo(arquivo.nome) : null,
          caminhoArquivo ? path.basename(caminhoArquivo) : null,
          arquivo ? String(arquivo.tipo || 'application/octet-stream').slice(0, 150) : null,
          arquivo?.conteudo.length || null]
      );
      notificarUsuarioMensagens(contatoId, 'mensagem', { remetenteId: req.usuario.id, mensagemId: resultado.insertId });
      return res.status(201).json({ id: resultado.insertId, mensagem: 'Mensagem enviada.' });
    } catch (erro) {
      if (caminhoArquivo) await fs.unlink(caminhoArquivo).catch(() => {});
      console.error('Erro ao enviar mensagem:', erro);
      return res.status(500).json({ erro: 'Não foi possível enviar a mensagem.' });
    }
  }
);

app.get('/api/mensagens/arquivos/:mensagemId', autenticar, async (req, res) => {
  try {
    const [arquivos] = await db.promise().query(
      `SELECT remetente_id, destinatario_id, nome_arquivo, caminho_arquivo FROM mensagens
       WHERE id = ? AND caminho_arquivo IS NOT NULL
         AND (remetente_id = ? OR destinatario_id = ?) LIMIT 1`,
      [req.params.mensagemId, req.usuario.id, req.usuario.id]
    );
    if (!arquivos.length) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
    const arquivo = arquivos[0];
    const outroUsuarioId = Number(arquivo.remetente_id) === Number(req.usuario.id)
      ? arquivo.destinatario_id
      : arquivo.remetente_id;
    if (!(await usuarioTemContato(req.usuario.id, outroUsuarioId))) {
      return res.status(403).json({ erro: 'Você não tem mais acesso a esta conversa.' });
    }
    const caminho = await localizarArquivoUpload(arquivo.caminho_arquivo);
    await fs.access(caminho);
    return res.download(caminho, arquivo.nome_arquivo, (erro) => {
      if (!erro || res.headersSent) return;
      if (erro.code === 'ENOENT' || erro.status === 404) return res.status(404).json({ erro: 'Este arquivo não está mais disponível no servidor.' });
      console.error('Erro ao baixar anexo de mensagem:', erro);
      return res.status(500).json({ erro: 'Não foi possível baixar o arquivo.' });
    });
  } catch (erro) {
    if (erro.code === 'ENOENT') return res.status(404).json({ erro: 'Este arquivo não está mais disponível no servidor.' });
    console.error('Erro ao localizar anexo de mensagem:', erro);
    if (!res.headersSent) return res.status(500).json({ erro: 'Não foi possível baixar o arquivo.' });
  }
});

};
