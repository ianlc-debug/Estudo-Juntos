module.exports = function registrarRotasAgendaComunidade(app, contexto) {
  const { db, autenticar, express, crypto, pastaUploads, buscarGrupoDoParticipante, sanitizarNomeArquivo, lerFormularioAtividade, fs, path, localizarArquivoUpload } = contexto;

function dataCalendarioValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

app.get('/api/eventos-particulares', autenticar, async (req, res) => {
  try {
    const [eventos] = await db.promise().query(
      `SELECT id, titulo, DATE_FORMAT(data_evento, '%Y-%m-%d') AS data_evento, concluida
       FROM eventos_particulares WHERE usuario_id = ? ORDER BY data_evento, id`,
      [req.usuario.id]
    );
    return res.json(eventos);
  } catch (erro) {
    console.error('Erro ao carregar eventos particulares:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar seus eventos.' });
  }
});

app.post('/api/eventos-particulares', autenticar, async (req, res) => {
  const titulo = String(req.body.titulo || '').trim();
  const dataEvento = req.body.data;
  if (!titulo) return res.status(400).json({ erro: 'Informe um título para o evento.' });
  if (titulo.length > 255) return res.status(400).json({ erro: 'O título pode ter até 255 caracteres.' });
  if (!dataCalendarioValida(dataEvento)) return res.status(400).json({ erro: 'Informe uma data válida.' });
  try {
    const [resultado] = await db.promise().query(
      'INSERT INTO eventos_particulares (usuario_id, titulo, data_evento) VALUES (?, ?, ?)',
      [req.usuario.id, titulo, dataEvento]
    );
    return res.status(201).json({ id: resultado.insertId, titulo, data_evento: dataEvento });
  } catch (erro) {
    console.error('Erro ao criar evento particular:', erro);
    return res.status(500).json({ erro: 'Não foi possível salvar o evento.' });
  }
});

app.delete('/api/eventos-particulares/:id', autenticar, async (req, res) => {
  try {
    const [resultado] = await db.promise().query(
      'DELETE FROM eventos_particulares WHERE id = ? AND usuario_id = ?',
      [req.params.id, req.usuario.id]
    );
    if (!resultado.affectedRows) return res.status(404).json({ erro: 'Evento não encontrado.' });
    return res.json({ mensagem: 'Evento removido.' });
  } catch (erro) {
    console.error('Erro ao remover evento particular:', erro);
    return res.status(500).json({ erro: 'Não foi possível remover o evento.' });
  }
});

app.patch('/api/eventos-particulares/:id/concluida', autenticar, async (req, res) => {
  if (typeof req.body.concluida !== 'boolean') return res.status(400).json({ erro: 'Informe se o evento foi concluído.' });
  try {
    const [eventos] = await db.promise().query(
      'SELECT id FROM eventos_particulares WHERE id = ? AND usuario_id = ? LIMIT 1',
      [req.params.id, req.usuario.id]
    );
    if (!eventos.length) return res.status(404).json({ erro: 'Evento não encontrado.' });
    const [resultado] = await db.promise().query(
      'UPDATE eventos_particulares SET concluida = ? WHERE id = ? AND usuario_id = ?',
      [req.body.concluida ? 1 : 0, req.params.id, req.usuario.id]
    );
    return res.json({ mensagem: 'Evento atualizado.' });
  } catch (erro) {
    console.error('Erro ao concluir evento particular:', erro);
    return res.status(500).json({ erro: 'Não foi possível atualizar o evento.' });
  }
});

// Tarefas globais: tarefas ativas dos grupos do usuário e seus eventos pessoais.
app.get('/api/tarefas-globais', autenticar, async (req, res) => {
  try {
    const [atividades] = await db.promise().query(
      `SELECT a.id, a.texto, a.nome_arquivo, DATE_FORMAT(a.prazo, '%Y-%m-%d') AS prazo,
              g.id_unico AS grupo_id, g.nome AS grupo_nome, 'grupo' AS tipo
       FROM grupo_atividades a
       JOIN grupos g ON g.id = a.grupo_id
       JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       LEFT JOIN grupo_atividade_estado e ON e.atividade_id = a.id AND e.usuario_id = ?
       WHERE COALESCE(e.concluida, 0) = 0 AND (a.prazo IS NULL OR a.prazo >= CURRENT_DATE())
       ORDER BY a.prazo IS NULL, a.prazo, a.criado_em DESC`,
      [req.usuario.id, req.usuario.id]
    );
    const [eventos] = await db.promise().query(
      `SELECT id, titulo AS texto, DATE_FORMAT(data_evento, '%Y-%m-%d') AS prazo, 'Evento pessoal' AS grupo_nome,
              NULL AS grupo_id, 'evento' AS tipo
       FROM eventos_particulares
       WHERE usuario_id = ? AND concluida = 0 AND data_evento >= CURRENT_DATE()
       ORDER BY data_evento, id`,
      [req.usuario.id]
    );
    return res.json([...atividades, ...eventos].sort((a, b) => String(a.prazo || '9999').localeCompare(String(b.prazo || '9999'))));
  } catch (erro) {
    console.error('Erro ao carregar tarefas globais:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar suas tarefas.' });
  }
});

// Prazos de atividades visíveis no calendário; vencidas continuam lá até o usuário ocultar.
app.get('/api/agenda-atividades', autenticar, async (req, res) => {
  try {
    const [atividades] = await db.promise().query(
      `SELECT a.id, a.texto, DATE_FORMAT(a.prazo, '%Y-%m-%d') AS prazo, g.id_unico AS grupo_id, g.nome AS grupo_nome,
              COALESCE(e.concluida, 0) AS concluida
       FROM grupo_atividades a
       JOIN grupos g ON g.id = a.grupo_id
       JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       LEFT JOIN grupo_atividade_estado e ON e.atividade_id = a.id AND e.usuario_id = ?
       WHERE a.prazo IS NOT NULL AND COALESCE(e.ocultar_calendario, 0) = 0
       ORDER BY a.prazo, g.nome, a.id`,
      [req.usuario.id, req.usuario.id]
    );
    return res.json(atividades);
  } catch (erro) {
    console.error('Erro ao carregar prazos no calendário:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar os prazos das atividades.' });
  }
});

app.get('/api/grupos/:grupoId/mural', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [recados] = await db.promise().query(
      `SELECT r.id, r.texto, r.autor_id, r.criado_em, r.nome_arquivo, r.tipo_arquivo, r.tamanho_arquivo, u.nome_usuario AS autor
       FROM grupo_recados r
       JOIN usuarios u ON u.id = r.autor_id
       WHERE r.grupo_id = ?
       ORDER BY r.criado_em DESC, r.id DESC`,
      [grupo.id]
    );
    return res.json(recados);
  } catch (erro) {
    console.error('Erro ao carregar o mural do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar o mural.' });
  }
});

const receberArquivoMural = (req, res, next) => {
  if (/^multipart\/form-data/i.test(req.headers['content-type'] || '')) {
    return express.raw({ type: 'multipart/form-data', limit: '21mb' })(req, res, next);
  }
  return next();
};

app.post('/api/grupos/:grupoId/mural', autenticar, receberArquivoMural, async (req, res) => {
  const multipart = /^multipart\/form-data/i.test(req.headers['content-type'] || '');
  let formulario = req.body || {};
  if (multipart) {
    try { formulario = lerFormularioAtividade(req.body, req.headers['content-type']); }
    catch (erro) { return res.status(400).json({ erro: erro.message }); }
  }
  const texto = String(formulario.texto || '').trim();
  const arquivo = formulario.arquivo;
  if (!texto && !arquivo) return res.status(400).json({ erro: 'Escreva um recado ou anexe um arquivo.' });
  if (texto.length > 5000) return res.status(400).json({ erro: 'O recado pode ter até 5.000 caracteres.' });
  if (arquivo && arquivo.conteudo.length > 20_000_000) return res.status(413).json({ erro: 'O arquivo deve ter no máximo 20 MB.' });
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Somente participantes podem publicar no mural.' });
    let nomeArmazenado = null;
    if (arquivo) {
      await fs.mkdir(pastaUploads, { recursive: true });
      nomeArmazenado = `${crypto.randomUUID()}.bin`;
      await fs.writeFile(path.join(pastaUploads, nomeArmazenado), arquivo.conteudo, { flag: 'wx' });
    }
    let resultado;
    try {
      [resultado] = await db.promise().query(
        `INSERT INTO grupo_recados (grupo_id, autor_id, texto, nome_arquivo, caminho_arquivo, tipo_arquivo, tamanho_arquivo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [grupo.id, req.usuario.id, texto, arquivo ? sanitizarNomeArquivo(arquivo.nome) : null, nomeArmazenado,
          arquivo ? String(arquivo.tipo || 'application/octet-stream').slice(0, 150) : null, arquivo?.conteudo.length || null]
      );
    } catch (erroBanco) {
      if (nomeArmazenado) await fs.unlink(path.join(pastaUploads, nomeArmazenado)).catch(() => {});
      throw erroBanco;
    }
    const [recados] = await db.promise().query(
      `SELECT r.id, r.texto, r.autor_id, r.criado_em, r.nome_arquivo, r.tipo_arquivo, r.tamanho_arquivo, u.nome_usuario AS autor
       FROM grupo_recados r JOIN usuarios u ON u.id = r.autor_id WHERE r.id = ? LIMIT 1`,
      [resultado.insertId]
    );
    return res.status(201).json(recados[0]);
  } catch (erro) {
    console.error('Erro ao publicar no mural do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível publicar o recado.' });
  }
});

app.get('/api/grupos/:grupoId/mural/:recadoId/arquivo', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [arquivos] = await db.promise().query(
      `SELECT nome_arquivo, caminho_arquivo FROM grupo_recados
       WHERE id = ? AND grupo_id = ? AND caminho_arquivo IS NOT NULL LIMIT 1`,
      [req.params.recadoId, grupo.id]
    );
    if (!arquivos.length) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
    const arquivo = arquivos[0];
    const caminho = await localizarArquivoUpload(arquivo.caminho_arquivo);
    await fs.access(caminho);
    return res.download(caminho, arquivo.nome_arquivo);
  } catch (erro) {
    console.error('Erro ao baixar anexo do mural:', erro);
    return res.status(404).json({ erro: 'Não foi possível encontrar o arquivo do mural.' });
  }
});

app.delete('/api/grupos/:grupoId/mural/:recadoId', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [recados] = await db.promise().query(
      'SELECT id, autor_id FROM grupo_recados WHERE id = ? AND grupo_id = ? LIMIT 1',
      [req.params.recadoId, grupo.id]
    );
    if (!recados.length) return res.status(404).json({ erro: 'Recado não encontrado.' });
    const eAutor = Number(recados[0].autor_id) === Number(req.usuario.id);
    const eAdministrador = Number(grupo.administrador) === 1;
    if (!eAutor && !eAdministrador) {
      return res.status(403).json({ erro: 'Somente quem publicou ou um administrador pode excluir este recado.' });
    }
    const [anexos] = await db.promise().query('SELECT caminho_arquivo FROM grupo_recados WHERE id = ? AND grupo_id = ?', [recados[0].id, grupo.id]);
    await db.promise().query('DELETE FROM grupo_recados WHERE id = ? AND grupo_id = ?', [recados[0].id, grupo.id]);
    if (anexos[0]?.caminho_arquivo) {
      const caminho = await localizarArquivoUpload(anexos[0].caminho_arquivo);
      await fs.unlink(caminho).catch((erroArquivo) => { if (erroArquivo.code !== 'ENOENT') console.error('Erro ao remover anexo do mural:', erroArquivo); });
    }
    return res.json({ mensagem: 'Recado excluído.' });
  } catch (erro) {
    console.error('Erro ao excluir recado do mural:', erro);
    return res.status(500).json({ erro: 'Não foi possível excluir o recado.' });
  }
});

app.get('/api/grupos/:grupoId/atividades', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [atividades] = await db.promise().query(
      `SELECT a.id, a.texto, a.nome_arquivo, a.tipo_arquivo, a.tamanho_arquivo,
              a.autor_id, a.criado_em, DATE_FORMAT(a.prazo, '%Y-%m-%d') AS prazo,
              COALESCE(e.concluida, 0) AS concluida, u.nome_usuario AS autor
       FROM grupo_atividades a
       JOIN usuarios u ON u.id = a.autor_id
       LEFT JOIN grupo_atividade_estado e ON e.atividade_id = a.id AND e.usuario_id = ?
       WHERE a.grupo_id = ?
       ORDER BY a.criado_em DESC, a.id DESC`,
      [req.usuario.id, grupo.id]
    );
    return res.json(atividades);
  } catch (erro) {
    console.error('Erro ao carregar atividades do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar as atividades.' });
  }
});

// Lista os arquivos das publicações em todos os grupos do usuário autenticado.
app.get('/api/recursos', autenticar, async (req, res) => {
  try {
    const [arquivosAtividades] = await db.promise().query(
      `SELECT a.id AS arquivo_id, a.id AS atividade_id, NULL AS recado_id, 'atividade' AS origem,
              a.nome_arquivo, a.tipo_arquivo, a.tamanho_arquivo,
              a.criado_em, a.texto, a.autor_id, u.nome_usuario AS autor,
              g.id_unico AS grupo_id, g.nome AS grupo_nome
       FROM grupo_atividades a
       JOIN grupos g ON g.id = a.grupo_id
       JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       JOIN usuarios u ON u.id = a.autor_id
       WHERE a.caminho_arquivo IS NOT NULL AND a.nome_arquivo IS NOT NULL
       ORDER BY g.nome, a.criado_em DESC, a.id DESC`,
      [req.usuario.id]
    );
    const [arquivosMural] = await db.promise().query(
      `SELECT r.id AS arquivo_id, NULL AS atividade_id, r.id AS recado_id, 'mural' AS origem,
              r.nome_arquivo, r.tipo_arquivo, r.tamanho_arquivo,
              r.criado_em, r.texto, r.autor_id, u.nome_usuario AS autor,
              g.id_unico AS grupo_id, g.nome AS grupo_nome
       FROM grupo_recados r
       JOIN grupos g ON g.id = r.grupo_id
       JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
       JOIN usuarios u ON u.id = r.autor_id
       WHERE r.caminho_arquivo IS NOT NULL AND r.nome_arquivo IS NOT NULL`,
      [req.usuario.id]
    );
    const arquivos = [...arquivosAtividades, ...arquivosMural].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    return res.json(arquivos);
  } catch (erro) {
    console.error('Erro ao carregar recursos dos grupos:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar os recursos dos grupos.' });
  }
});

};
