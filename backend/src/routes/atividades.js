module.exports = function registrarRotasAtividades(app, contexto) {
  const { db, autenticar, express, fs, crypto, path, pastaUploads, localizarArquivoUpload, buscarGrupoDoParticipante, sanitizarNomeArquivo, lerFormularioAtividade } = contexto;

// Qualquer participante pode publicar texto. Neste caminho não há anexo.
app.post('/api/grupos/:grupoId/atividades', autenticar, async (req, res) => {
  const texto = String(req.body.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Escreva um texto ou anexe um arquivo.' });
  if (texto.length > 5000) return res.status(400).json({ erro: 'O texto pode ter até 5.000 caracteres.' });
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Somente participantes podem publicar neste grupo.' });
    const [resultado] = await db.promise().query(
      'INSERT INTO grupo_atividades (grupo_id, autor_id, texto) VALUES (?, ?, ?)',
      [grupo.id, req.usuario.id, texto]
    );
    return res.status(201).json({ id: resultado.insertId, mensagem: 'Atividade publicada.' });
  } catch (erro) {
    console.error('Erro ao publicar atividade:', erro);
    return res.status(500).json({ erro: 'Não foi possível publicar a atividade.' });
  }
});

// O corpo binário permite anexos de qualquer extensão sem interpretá-los no servidor.
app.post('/api/grupos/:grupoId/atividades/arquivo', autenticar, express.raw({ type: 'multipart/form-data', limit: '21mb' }), async (req, res) => {
  let formulario;
  try {
    formulario = lerFormularioAtividade(req.body, req.headers['content-type']);
  } catch (erro) {
    return res.status(400).json({ erro: erro.message });
  }
  const texto = String(formulario.texto || '').trim();
  const arquivo = formulario.arquivo;
  if (!arquivo?.conteudo?.length) return res.status(400).json({ erro: 'Selecione um arquivo válido.' });
  if (arquivo.conteudo.length > 20_000_000) return res.status(413).json({ erro: 'O arquivo deve ter no máximo 20 MB.' });
  if (texto.length > 5000) return res.status(400).json({ erro: 'O texto pode ter até 5.000 caracteres.' });
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Somente participantes podem publicar neste grupo.' });
    await fs.mkdir(pastaUploads, { recursive: true });
    const nomeArmazenado = `${crypto.randomUUID()}.bin`;
    const caminhoArquivo = path.join(pastaUploads, nomeArmazenado);
    await fs.writeFile(caminhoArquivo, arquivo.conteudo, { flag: 'wx' });
    try {
      const [resultado] = await db.promise().query(
        `INSERT INTO grupo_atividades
           (grupo_id, autor_id, texto, nome_arquivo, caminho_arquivo, tipo_arquivo, tamanho_arquivo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [grupo.id, req.usuario.id, texto || null, sanitizarNomeArquivo(arquivo.nome), nomeArmazenado, String(arquivo.tipo || 'application/octet-stream').slice(0, 150), arquivo.conteudo.length]
      );
      return res.status(201).json({ id: resultado.insertId, mensagem: 'Atividade publicada com arquivo.' });
    } catch (erroBanco) {
      await fs.unlink(caminhoArquivo).catch(() => {});
      throw erroBanco;
    }
  } catch (erro) {
    console.error('Erro ao publicar atividade com arquivo:', erro);
    return res.status(500).json({ erro: 'Não foi possível salvar o arquivo. Verifique a configuração do banco e tente novamente.' });
  }
});

app.delete('/api/grupos/:grupoId/atividades/:atividadeId', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [atividades] = await db.promise().query(
      `SELECT id, autor_id, caminho_arquivo FROM grupo_atividades
       WHERE id = ? AND grupo_id = ? LIMIT 1`,
      [req.params.atividadeId, grupo.id]
    );
    if (!atividades.length) return res.status(404).json({ erro: 'Publicação não encontrada.' });
    const atividade = atividades[0];
    const eAutor = Number(atividade.autor_id) === Number(req.usuario.id);
    const eAdministrador = Number(grupo.administrador) === 1;
    if (!eAutor && !eAdministrador) {
      return res.status(403).json({ erro: 'Somente quem publicou ou um administrador pode remover esta publicação.' });
    }
    await db.promise().query('DELETE FROM grupo_atividades WHERE id = ? AND grupo_id = ?', [atividade.id, grupo.id]);
    if (atividade.caminho_arquivo) {
      const caminhoArquivo = await localizarArquivoUpload(atividade.caminho_arquivo);
      await fs.unlink(caminhoArquivo).catch((erroArquivo) => {
        if (erroArquivo.code !== 'ENOENT') console.error('Não foi possível remover o arquivo da publicação:', erroArquivo);
      });
    }
    return res.json({ mensagem: 'Publicação removida.' });
  } catch (erro) {
    console.error('Erro ao remover atividade do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível remover a publicação.' });
  }
});

app.get('/api/grupos/:grupoId/atividades/:atividadeId/arquivo', autenticar, async (req, res) => {
  try {
    const grupo = await buscarGrupoDoParticipante(req.params.grupoId, req.usuario.id);
    if (!grupo) return res.status(403).json({ erro: 'Você não participa deste grupo.' });
    const [arquivos] = await db.promise().query(
      `SELECT nome_arquivo, caminho_arquivo FROM grupo_atividades
       WHERE id = ? AND grupo_id = ? AND caminho_arquivo IS NOT NULL LIMIT 1`,
      [req.params.atividadeId, grupo.id]
    );
    if (!arquivos.length) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
    const arquivo = arquivos[0];
    const caminhoArquivo = await localizarArquivoUpload(arquivo.caminho_arquivo);
    try {
      await fs.access(caminhoArquivo);
    } catch (erroArquivo) {
      if (erroArquivo.code === 'ENOENT') {
        return res.status(404).json({ erro: 'Este arquivo não está mais disponível no servidor. Peça para o responsável anexá-lo novamente.' });
      }
      throw erroArquivo;
    }

    // O envio do arquivo ocorre de forma assíncrona; o callback impede que
    // erros do Express (por exemplo, arquivo removido durante o download)
    // sejam tratados pelo middleware global como erro inesperado.
    return res.download(caminhoArquivo, arquivo.nome_arquivo, (erroEnvio) => {
      if (!erroEnvio || res.headersSent) return;
      if (erroEnvio.code === 'ENOENT' || erroEnvio.status === 404) {
        return res.status(404).json({ erro: 'Este arquivo não está mais disponível no servidor. Peça para o responsável anexá-lo novamente.' });
      }
      console.error('Falha ao enviar arquivo da atividade:', erroEnvio);
      return res.status(500).json({ erro: 'Não foi possível baixar o arquivo.' });
    });
  } catch (erro) {
    console.error('Erro ao baixar arquivo da atividade:', erro);
    if (!res.headersSent) return res.status(500).json({ erro: 'Não foi possível baixar o arquivo.' });
  }
});

};
