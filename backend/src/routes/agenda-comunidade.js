module.exports = function registrarRotasAgendaComunidade(app, contexto) {
  const { db, autenticar, buscarGrupoDoParticipante, sanitizarNomeArquivo, grupoEhPrivado, fs, path, localizarArquivoUpload } = contexto;

function dataCalendarioValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

app.get('/api/eventos-particulares', autenticar, async (req, res) => {
  try {
    const [eventos] = await db.promise().query(
      `SELECT id, titulo, DATE_FORMAT(data_evento, '%Y-%m-%d') AS data_evento
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

app.get('/api/grupos/:grupoId/mural', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [recados] = await db.promise().query(
      `SELECT r.id, r.texto, r.autor_id, r.criado_em, u.nome_usuario AS autor
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

app.post('/api/grupos/:grupoId/mural', autenticar, async (req, res) => {
  const texto = String(req.body.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Escreva um recado para publicar.' });
  if (texto.length > 5000) return res.status(400).json({ erro: 'O recado pode ter até 5.000 caracteres.' });
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Somente participantes podem publicar no mural.' });
    const [resultado] = await db.promise().query(
      'INSERT INTO grupo_recados (grupo_id, autor_id, texto) VALUES (?, ?, ?)',
      [grupo.id, req.usuario.id, texto]
    );
    const [recados] = await db.promise().query(
      `SELECT r.id, r.texto, r.autor_id, r.criado_em, u.nome_usuario AS autor
       FROM grupo_recados r JOIN usuarios u ON u.id = r.autor_id WHERE r.id = ? LIMIT 1`,
      [resultado.insertId]
    );
    return res.status(201).json(recados[0]);
  } catch (erro) {
    console.error('Erro ao publicar no mural do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível publicar o recado.' });
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
    await db.promise().query('DELETE FROM grupo_recados WHERE id = ? AND grupo_id = ?', [recados[0].id, grupo.id]);
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
              a.autor_id, a.criado_em, u.nome_usuario AS autor
       FROM grupo_atividades a
       JOIN usuarios u ON u.id = a.autor_id
       WHERE a.grupo_id = ?
       ORDER BY a.criado_em DESC, a.id DESC`,
      [grupo.id]
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
    const [arquivos] = await db.promise().query(
      `SELECT a.id AS atividade_id, a.nome_arquivo, a.tipo_arquivo, a.tamanho_arquivo,
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
    return res.json(arquivos);
  } catch (erro) {
    console.error('Erro ao carregar recursos dos grupos:', erro);
    return res.status(500).json({ erro: 'Não foi possível carregar os recursos dos grupos.' });
  }
});

};
