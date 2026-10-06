const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
require('dotenv').config();

const db = require('./src/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sessões assinadas: o ID do usuário vem do token validado, nunca do corpo enviado pelo navegador.
const segredoSessao = process.env.SESSION_SECRET;
function criarToken(usuario) {
    const payload = Buffer.from(JSON.stringify({ id: usuario.id, nome: usuario.nome_usuario, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
    const assinatura = crypto.createHmac('sha256', segredoSessao).update(payload).digest('base64url');
    return `${payload}.${assinatura}`;
}
function gerarIdPublico() {
    return crypto.randomInt(100000, 1000000).toString();
}
async function garantirIdPublico(usuarioId, idExistente) {
    if (idExistente) return idExistente;

    for (let tentativa = 0; tentativa < 10; tentativa++) {
        const novoId = gerarIdPublico();
        try {
            const [resultado] = await db.promise().query(
                'UPDATE usuarios SET id_publico = ? WHERE id = ? AND id_publico IS NULL',
                [novoId, usuarioId]
            );
            if (resultado.affectedRows > 0) return novoId;

            const [linhas] = await db.promise().query('SELECT id_publico FROM usuarios WHERE id = ?', [usuarioId]);
            if (linhas[0]?.id_publico) return linhas[0].id_publico;
        } catch (erro) {
            if (erro.code === 'ER_DUP_ENTRY') continue;
            throw erro;
        }
    }

    throw new Error('Não foi possível gerar um ID público único.');
}
function autenticar(req, res, next) {
    if (!segredoSessao) return res.status(500).json({ erro: 'SESSION_SECRET não foi configurado no servidor.' });
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const [payload, assinatura] = token.split('.');
    if (!payload || !assinatura) return res.status(401).json({ erro: 'Faça login para continuar.' });
    const esperada = crypto.createHmac('sha256', segredoSessao).update(payload).digest();
    let recebida;
    try { recebida = Buffer.from(assinatura, 'base64url'); } catch { return res.status(401).json({ erro: 'Sessão inválida.' }); }
    if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) return res.status(401).json({ erro: 'Sessão inválida.' });
    try {
        const dados = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (!dados.id || dados.exp < Date.now()) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
        req.usuario = dados;
        next();
    } catch { return res.status(401).json({ erro: 'Sessão inválida.' }); }
}

// Rota de Teste Inicial
app.get('/', (req, res) => {
    res.json({ mensagem: 'API rodando com sucesso!' });
});

// Rota de Cadastro de Utilizadores
app.post('/api/registro', async (req, res) => {
    const { nome_usuario, email, senha } = req.body;

    // 1. Validação de campos obrigatórios
    if (!nome_usuario || !email || !senha) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }

    // 2. Validação de formato de e-mail real usando Regex
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        return res.status(400).json({ erro: 'Formato de e-mail inválido.' });
    }

    // 3. Validação de restrições do Nome de Usuário (Apenas letras com acentos e espaços)
    const regexUsuario = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!regexUsuario.test(nome_usuario)) {
        return res.status(400).json({ 
            erro: 'O nome de usuário deve conter apenas letras e espaços (sem números, símbolos ou sublinhados).' 
        });
    }

    // 4. Validação de restrições da Senha (mínimo de 6 caracteres)
    if (senha.length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        // 5. Criptografia segura da senha com bcrypt
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(senha, saltRounds);
        // O identificador é criado no servidor e protegido por uma chave única no banco.
        for (let tentativa = 0; tentativa < 10; tentativa++) {
            const idPublico = gerarIdPublico();
            try {
                await db.promise().query(
                    'INSERT INTO usuarios (id_publico, nome_usuario, email, senha) VALUES (?, ?, ?, ?)',
                    [idPublico, nome_usuario, email, senhaCriptografada]
                );
                return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
            } catch (erro) {
                if (erro.code === 'ER_DUP_ENTRY' && erro.message.includes('uq_usuarios_id_publico')) continue;
                if (erro.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ erro: 'E-mail ou nome de usuário já estão em uso.' });
                }
                console.error('Erro ao cadastrar usuário:', erro);
                return res.status(500).json({ erro: 'Erro interno no servidor ao cadastrar usuário.' });
            }
        }
        return res.status(500).json({ erro: 'Não foi possível gerar um ID público. Tente novamente.' });

    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao processar os dados de segurança.' });
    }
});

// Rota de Login de Utilizadores (Aceita E-mail ou Nome de Usuário)
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body; // 'email' aqui recebe o valor digitado no campo de identificação

    if (!segredoSessao) return res.status(500).json({ erro: 'Configure SESSION_SECRET no arquivo .env do servidor.' });

    // 1. Validação de campos obrigatórios
    if (!email || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos para entrar.' });
    }

    // 2. Procurar o utilizador pelo e-mail OU pelo nome de usuário na base de dados
    const query = 'SELECT * FROM usuarios WHERE email = ? OR nome_usuario = ?';

    db.query(query, [email, email], async (err, resultados) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro interno no servidor ao tentar fazer login.' });
        }

        // Se não encontrar nenhum utilizador correspondente
        if (resultados.length === 0) {
            return res.status(401).json({ erro: 'Usuário/E-mail ou senha incorretos.' });
        }

        const usuario = resultados[0];

        // 3. Comparar a senha digitada com o hash guardado na base de dados
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Usuário/E-mail ou senha incorretos.' });
        }

        let idPublico;
        try {
            idPublico = await garantirIdPublico(usuario.id, usuario.id_publico);
        } catch (erroId) {
            console.error('Erro ao garantir ID público do usuário:', erroId);
            return res.status(500).json({ erro: 'Não foi possível carregar o identificador do usuário.' });
        }

        // 4. Login bem-sucedido
        return res.status(200).json({
            mensagem: 'Login efetuado com sucesso!',
            token: criarToken(usuario),
            usuario: {
                id: usuario.id,
                id_publico: idPublico,
                nome_usuario: usuario.nome_usuario,
                email: usuario.email
            }
        });
    });
});

// Rota para Excluir Conta de Utilizador
app.delete('/api/usuarios/:identificador', (req, res) => {
    const { identificador } = req.params;

    if (!identificador) {
        return res.status(400).json({ erro: 'Identificador inválido.' });
    }

    const query = 'DELETE FROM usuarios WHERE nome_usuario = ? OR email = ?';

    db.query(query, [identificador, identificador], (err, resultado) => {
        if (err) {
            console.error("Erro ao excluir utilizador:", err);
            return res.status(500).json({ erro: 'Erro interno no servidor ao excluir a conta.' });
        }

        if (resultado.affectedRows > 0) {
            return res.status(200).json({ mensagem: 'Conta excluída com sucesso!' });
        } else {
            return res.status(404).json({ erro: 'Utilizador não encontrado na base de dados.' });
        }
    });
});

// Rota de Recuperação / Redefinição de Senha
app.post('/api/recuperar-senha', async (req, res) => {
    const { email, novaSenha } = req.body;

    if (!email || !novaSenha) {
        return res.status(400).json({ erro: 'O e-mail e a nova senha são obrigatórios.' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    try {
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(novaSenha, saltRounds);

        const query = 'UPDATE usuarios SET senha = ? WHERE email = ?';

        db.query(query, [senhaCriptografada, email], (err, resultado) => {
            if (err) {
                console.error("Erro ao atualizar senha:", err);
                return res.status(500).json({ erro: 'Erro interno no servidor ao atualizar a senha.' });
            }

            if (resultado.affectedRows > 0) {
                return res.status(200).json({ mensagem: 'Senha redefinida com sucesso!' });
            } else {
                return res.status(404).json({ erro: 'E-mail não encontrado na base de dados.' });
            }
        });
    } catch (error) {
        return res.status(500).json({ erro: 'Erro ao processar os dados de segurança.' });
    }
});

// Rota para Atualizar Perfil (Nome de Usuário e/ou E-mail)
app.put('/api/usuarios/:identificador', async (req, res) => {
    const { identificador } = req.params;
    const { novoNome, novoEmail } = req.body;

    if (!novoNome && !novoEmail) {
        return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar.' });
    }

    if (novoNome) {
        const regexUsuario = /^[a-zA-ZÀ-ÿ\s]+$/;
        if (!regexUsuario.test(novoNome)) {
            return res.status(400).json({ 
                erro: 'O nome de usuário deve conter apenas letras e espaços (sem números, símbolos ou sublinhados).' 
            });
        }
    }

    if (novoEmail) {
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(novoEmail)) {
            return res.status(400).json({ erro: 'Formato de e-mail inválido.' });
        }
    }

    const query = 'UPDATE usuarios SET nome_usuario = COALESCE(?, nome_usuario), email = COALESCE(?, email) WHERE nome_usuario = ? OR email = ?';

    db.query(query, [novoNome, novoEmail, identificador, identificador], (err, resultado) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ erro: 'Este nome de usuário ou e-mail já está em uso.' });
            }
            return res.status(500).json({ erro: 'Erro interno ao atualizar perfil.' });
        }

        if (resultado.affectedRows > 0) {
            return res.status(200).json({ 
                mensagem: 'Perfil atualizado com sucesso!',
                novoUsuario: novoNome || identificador
            });
        } else {
            return res.status(404).json({ erro: 'Utilizador não encontrado.' });
        }
    });
});

// Rota para Alterar Senha (Estando Logado)
app.put('/api/usuarios/senha/:identificador', async (req, res) => {
    const { identificador } = req.params;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ erro: 'Preencha a senha atual e a nova senha.' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const buscaQuery = 'SELECT * FROM usuarios WHERE nome_usuario = ? OR email = ?';
    db.query(buscaQuery, [identificador, identificador], async (err, resultados) => {
        if (err || resultados.length === 0) {
            return res.status(404).json({ erro: 'Utilizador não encontrado.' });
        }

        const usuario = resultados[0];
        const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ erro: 'Senha atual incorreta.' });
        }

        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(novaSenha, saltRounds);

        const updateQuery = 'UPDATE usuarios SET senha = ? WHERE id = ?';
        db.query(updateQuery, [senhaCriptografada, usuario.id], (errUpdate) => {
            if (errUpdate) {
                return res.status(500).json({ erro: 'Erro ao atualizar a senha.' });
            }
            return res.status(200).json({ mensagem: 'Senha alterada com sucesso!' });
        });
    });
});

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

function grupoEhPrivado(privacidade) {
  const valor = String(privacidade || '').toLowerCase();
  return valor.includes('privad') || valor.includes('convidad');
}

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

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
