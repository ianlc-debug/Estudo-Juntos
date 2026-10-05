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

        // 6. Inserção na Base de Dados MySQL
        const query = 'INSERT INTO usuarios (nome_usuario, email, senha) VALUES (?, ?, ?)';
        
        db.query(query, [nome_usuario, email, senhaCriptografada], (err, resultado) => {
            if (err) {
                // Tratamento caso o e-mail ou nome de usuário já existam
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ erro: 'E-mail ou nome de usuário já estão em uso.' });
                }
                return res.status(500).json({ erro: 'Erro interno no servidor ao cadastrar usuário.' });
            }

            return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
        });

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

        // 4. Login bem-sucedido
        return res.status(200).json({
            mensagem: 'Login efetuado com sucesso!',
            token: criarToken(usuario),
            usuario: {
                id: usuario.id,
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

// Rota para Criar um Novo Grupo de Estudo
app.post('/api/grupos', autenticar, async (req, res) => {
  const { id_unico, nome, materia, privacidade, codigo } = req.body;
  if (!nome?.trim() || !materia?.trim()) return res.status(400).json({ erro: 'Informe o nome e a matéria do grupo.' });

  try {
    // Garante que o código de 6 dígitos e o criador são gravados na tabela
    const sql = `
      INSERT INTO grupos (id_unico, nome, materia, privacidade, codigo, criador, criador_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.promise().query(sql, [
      id_unico, 
      nome, 
      materia, 
      privacidade, 
      codigo || Math.floor(100000 + Math.random() * 900000).toString(), 
      req.usuario.nome,
      req.usuario.id
    ]);

    return res.status(201).json({ mensagem: "Grupo criado com sucesso!" });
  } catch (erro) {
    console.error("Erro ao criar grupo:", erro);
    return res.status(500).json({ erro: "Erro ao salvar grupo no banco de dados." });
  }
});

// --- ROTA DE LISTAR GRUPOS ---
app.get('/api/grupos', autenticar, async (req, res) => {
  try {
    // Todos os grupos são visíveis apenas para o usuário que os criou.
    const [linhas] = await db.promise().query(
      "SELECT * FROM grupos WHERE criador_id = ? ORDER BY id DESC",
      [req.usuario.id]
    );
    return res.json(linhas);
  } catch (erro) {
    console.error("Erro ao buscar grupos:", erro);
    return res.status(500).json({ erro: "Erro ao carregar grupos." });
  }
});

// Rota para Excluir um Grupo de Estudo (Baseada no id_unico)
app.delete('/api/grupos/:id', autenticar, async (req, res) => {
  const { id } = req.params;

  try {
    const eNumero = !isNaN(id);

    const sql = eNumero
      ? "DELETE FROM grupos WHERE (id = ? OR id_unico = ?) AND criador_id = ?"
      : "DELETE FROM grupos WHERE id_unico = ? AND criador_id = ?";

    const params = eNumero ? [id, id, req.usuario.id] : [id, req.usuario.id];

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

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
