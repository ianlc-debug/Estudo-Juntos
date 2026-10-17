module.exports = function registrarRotasGrupos(app, contexto) {
  const { db, autenticar, express, fs, crypto, path, pastaUploads, localizarArquivoUpload } = contexto;

// Criação do grupo e associação do criador como administrador são uma única operação.
app.post('/api/grupos', autenticar, async (req, res) => {
  const { id_unico, nome, materia, privacidade, codigo } = req.body;
  if (!nome?.trim() || !materia?.trim()) return res.status(400).json({ erro: 'Informe o nome e a matéria do grupo.' });

  try {
    // Garante que o código de 6 dígitos e o criador são gravados na tabela
    const conexao = await db.promise().getConnection();
    try {
      await conexao.beginTransaction();
      const [resultado] = await conexao.query(
        `INSERT INTO grupos (id_unico, nome, materia, privacidade, codigo, criador, criador_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_unico, nome, materia, privacidade, codigo || Math.floor(100000 + Math.random() * 900000).toString(), req.usuario.nome, req.usuario.id]
      );
      await conexao.query(
        'INSERT INTO grupo_membros (grupo_id, usuario_id, administrador) VALUES (?, ?, 1)',
        [resultado.insertId, req.usuario.id]
      );
      await conexao.commit();
    } catch (erroTransacao) {
      await conexao.rollback();
      throw erroTransacao;
    } finally {
      conexao.release();
    }

    return res.status(201).json({ mensagem: "Grupo criado com sucesso!" });
  } catch (erro) {
    console.error("Erro ao criar grupo:", erro);
    return res.status(500).json({ erro: "Erro ao salvar grupo no banco de dados." });
  }
});

// --- ROTA DE LISTAR GRUPOS ---
app.get('/api/grupos', autenticar, async (req, res) => {
  try {
    const [linhas] = await db.promise().query(
      `SELECT g.*, gm.administrador AS eh_administrador
       FROM grupos g
       JOIN grupo_membros gm ON gm.grupo_id = g.id
       WHERE gm.usuario_id = ?
       ORDER BY g.id DESC`,
      [req.usuario.id]
    );
    const [horarios] = await db.promise().query(
      `SELECT h.id, h.grupo_id, h.dia, h.inicio, h.fim, h.descricao
       FROM grupo_horarios h
       JOIN grupo_membros gm ON gm.grupo_id = h.grupo_id AND gm.usuario_id = ?
       ORDER BY h.dia, h.inicio`,
      [req.usuario.id]
    );
    const horariosPorGrupo = new Map();
    horarios.forEach((horario) => {
      const lista = horariosPorGrupo.get(horario.grupo_id) || [];
      lista.push({ ...horario, inicio: String(horario.inicio).slice(0, 5), fim: String(horario.fim).slice(0, 5) });
      horariosPorGrupo.set(horario.grupo_id, lista);
    });
    linhas.forEach((grupo) => { grupo.horarios = horariosPorGrupo.get(grupo.id) || []; });
    return res.json(linhas);
  } catch (erro) {
    console.error("Erro ao buscar grupos:", erro);
    return res.status(500).json({ erro: "Erro ao carregar grupos." });
  }
});

function clausulaGrupoPorId(identificador) {
  return /^\d+$/.test(identificador)
    ? { sql: '(g.id = ? OR g.id_unico = ?)', parametros: [identificador, identificador] }
    : { sql: 'g.id_unico = ?', parametros: [identificador] };
}

const diasDaSemanaGrupo = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Horários semanais são visíveis aos participantes, mas apenas administradores podem alterá-los.
app.post('/api/grupos/:grupoId/horarios', autenticar, async (req, res) => {
  const { dia, inicio, fim } = req.body;
  const descricao = String(req.body.descricao || '').trim();
  if (!diasDaSemanaGrupo.includes(dia) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fim || '') || inicio >= fim) {
    return res.status(400).json({ erro: 'Informe um dia e um intervalo de horário válido.' });
  }
  if (descricao.length > 200) return res.status(400).json({ erro: 'A descrição pode ter até 200 caracteres.' });
  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await db.promise().query(
      `SELECT g.id FROM grupos g JOIN grupo_membros gm ON gm.grupo_id = g.id
       WHERE ${grupoBusca.sql} AND gm.usuario_id = ? AND gm.administrador = 1 LIMIT 1`,
      [...grupoBusca.parametros, req.usuario.id]
    );
    if (!grupos.length) return res.status(403).json({ erro: 'Somente administradores deste grupo podem vincular horários.' });
    const [resultado] = await db.promise().query(
      'INSERT INTO grupo_horarios (grupo_id, dia, inicio, fim, descricao) VALUES (?, ?, ?, ?, ?)',
      [grupos[0].id, dia, inicio, fim, descricao]
    );
    return res.status(201).json({ id: resultado.insertId, dia, inicio, fim, descricao });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Esse horário já está vinculado ao grupo.' });
    console.error('Erro ao vincular horário do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível vincular o horário.' });
  }
});

app.delete('/api/grupos/:grupoId/horarios/:horarioId', autenticar, async (req, res) => {
  if (!/^\d+$/.test(req.params.horarioId)) return res.status(400).json({ erro: 'Horário inválido.' });
  try {
    const grupoBusca = clausulaGrupoPorId(req.params.grupoId);
    const [grupos] = await db.promise().query(
      `SELECT g.id FROM grupos g JOIN grupo_membros gm ON gm.grupo_id = g.id
       WHERE ${grupoBusca.sql} AND gm.usuario_id = ? AND gm.administrador = 1 LIMIT 1`,
      [...grupoBusca.parametros, req.usuario.id]
    );
    if (!grupos.length) return res.status(403).json({ erro: 'Somente administradores deste grupo podem remover horários.' });
    const [resultado] = await db.promise().query(
      'DELETE FROM grupo_horarios WHERE id = ? AND grupo_id = ?', [req.params.horarioId, grupos[0].id]
    );
    if (!resultado.affectedRows) return res.status(404).json({ erro: 'Horário não encontrado neste grupo.' });
    return res.json({ mensagem: 'Horário removido.' });
  } catch (erro) {
    console.error('Erro ao remover horário do grupo:', erro);
    return res.status(500).json({ erro: 'Não foi possível remover o horário.' });
  }
});

function grupoEhPrivado(privacidade) {
  const valor = String(privacidade || '').toLowerCase();
  return valor.includes('privad') || valor.includes('convidad');
}

async function buscarGrupoDoParticipante(identificador, usuarioId) {
  const grupoBusca = clausulaGrupoPorId(identificador);
  const [grupos] = await db.promise().query(
    `SELECT g.id, gm.administrador FROM grupos g
     JOIN grupo_membros gm ON gm.grupo_id = g.id AND gm.usuario_id = ?
     WHERE ${grupoBusca.sql} LIMIT 1`,
    [usuarioId, ...grupoBusca.parametros]
  );
  return grupos[0] || null;
}

function sanitizarNomeArquivo(nome) {
  return String(nome || 'arquivo')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 255) || 'arquivo';
}

function lerFormularioAtividade(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundaryTexto = (match?.[1] || match?.[2] || '').trim();
  if (!boundaryTexto) throw new Error('O formulário do arquivo está inválido.');
  const boundary = Buffer.from(`--${boundaryTexto}`);
  const separadorCabecalho = Buffer.from('\r\n\r\n');
  const formulario = { texto: '', prazo: '', arquivo: null };
  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer.subarray(cursor, cursor + 2).toString() === '--') break;
    if (buffer.subarray(cursor, cursor + 2).toString() === '\r\n') cursor += 2;
    const fimParte = buffer.indexOf(boundary, cursor);
    if (fimParte === -1) break;
    let parte = buffer.subarray(cursor, fimParte);
    if (parte.subarray(-2).toString() === '\r\n') parte = parte.subarray(0, -2);
    const separador = parte.indexOf(separadorCabecalho);
    if (separador !== -1) {
      const cabecalho = parte.subarray(0, separador).toString('utf8');
      const conteudo = parte.subarray(separador + separadorCabecalho.length);
      const nomeCampo = /(?:^|;)\s*name="([^"]+)"/i.exec(cabecalho)?.[1];
      if (nomeCampo === 'texto') formulario.texto = conteudo.toString('utf8');
      if (nomeCampo === 'prazo') formulario.prazo = conteudo.toString('utf8').trim();
      if (nomeCampo === 'arquivo') {
        const nome = /(?:^|;)\s*filename="([^"]*)"/i.exec(cabecalho)?.[1];
        const tipo = /^content-type:\s*([^\r\n]+)/im.exec(cabecalho)?.[1]?.trim();
        if (nome) formulario.arquivo = { nome, tipo, conteudo };
      }
    }
    cursor = fimParte;
  }
  return formulario;
}

  return { clausulaGrupoPorId, grupoEhPrivado, buscarGrupoDoParticipante, sanitizarNomeArquivo, lerFormularioAtividade };
};
