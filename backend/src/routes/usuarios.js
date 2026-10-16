module.exports = function registrarRotasUsuarios(app, contexto) {
  const { db, bcrypt, segredoSessao, gerarIdPublico, garantirIdPublico, criarToken } = contexto;
  const normalizarNomeUsuario = (valor) => String(valor || '').normalize('NFC').toLocaleUpperCase('pt-BR').normalize('NFC').trim();
  const nomeUsuarioValido = (valor) => /^[\p{Lu} ]+$/u.test(valor);

// Rota de Teste Inicial
app.get('/', (req, res) => {
    res.redirect('/app/');
});

// Rota de Cadastro de Utilizadores
app.post('/api/registro', async (req, res) => {
    const nome_usuario = normalizarNomeUsuario(req.body.nome_usuario);
    const { email, senha } = req.body;

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
    if (!nomeUsuarioValido(nome_usuario)) {
        return res.status(400).json({ 
            erro: 'O nome de usuário deve conter apenas letras maiúsculas e espaços.'
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
    const { email, senha } = req.body; // O campo aceita e-mail ou nome de usuário.
    const identificador = String(email || '').trim();
    const nomeUsuario = normalizarNomeUsuario(identificador);

    if (!segredoSessao) return res.status(500).json({ erro: 'Configure SESSION_SECRET no arquivo .env do servidor.' });

    // 1. Validação de campos obrigatórios
    if (!email || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos para entrar.' });
    }

    // 2. Procurar o utilizador pelo e-mail OU pelo nome de usuário na base de dados
    const query = 'SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) OR nome_usuario = ?';

    db.query(query, [identificador, nomeUsuario], async (err, resultados) => {
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
    const novoNomeRecebido = req.body.novoNome;
    const novoNome = novoNomeRecebido === undefined || novoNomeRecebido === null
        ? null
        : normalizarNomeUsuario(novoNomeRecebido);
    const { novoEmail } = req.body;

    if (novoNomeRecebido === undefined && !novoEmail) {
        return res.status(400).json({ erro: 'Forneça ao menos um campo para atualizar.' });
    }

    if (novoNomeRecebido !== undefined && !nomeUsuarioValido(novoNome || '')) {
        return res.status(400).json({
            erro: 'O nome de usuário deve conter apenas letras maiúsculas e espaços.'
        });
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

};
