USE estudo_juntos;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_publico CHAR(6) NOT NULL,
    nome_usuario VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_id_publico UNIQUE (id_publico)
);

CREATE TABLE contatos_usuarios (
    usuario_id INT NOT NULL,
    contato_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, contato_id),
    CONSTRAINT fk_contatos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_contatos_contato FOREIGN KEY (contato_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_contatos_destinatario (contato_id)
);

CREATE TABLE solicitacoes_contato (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    status ENUM('pendente', 'aceita', 'recusada') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolvida_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_solicitacoes_contato_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_contato_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_solicitacoes_contato_destinatario (destinatario_id, status, criado_em),
    INDEX idx_solicitacoes_contato_par (remetente_id, destinatario_id, status)
);

CREATE TABLE mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    texto TEXT NULL,
    nome_arquivo VARCHAR(255) NULL,
    caminho_arquivo VARCHAR(100) NULL,
    tipo_arquivo VARCHAR(150) NULL,
    tamanho_arquivo BIGINT UNSIGNED NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lida_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_mensagens_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagens_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_mensagens_conversa (remetente_id, destinatario_id, criado_em, id),
    INDEX idx_mensagens_nao_lidas (destinatario_id, remetente_id, lida_em)
);

CREATE TABLE grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_unico VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    materia VARCHAR(150) NOT NULL,
    privacidade VARCHAR(50) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    criador VARCHAR(50) NOT NULL,
    criador_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupos_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_grupos_privacidade_criador (privacidade, criador_id)
);

CREATE TABLE grupo_membros (
    grupo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    administrador TINYINT(1) NOT NULL DEFAULT 0,
    ingressou_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (grupo_id, usuario_id),
    CONSTRAINT fk_grupo_membros_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_grupo_membros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE grupo_horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    dia VARCHAR(20) NOT NULL,
    inicio TIME NOT NULL,
    fim TIME NOT NULL,
    descricao VARCHAR(200) NOT NULL DEFAULT '',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupo_horarios_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT uq_grupo_horarios UNIQUE (grupo_id, dia, inicio, fim),
    INDEX idx_grupo_horarios_grupo_dia (grupo_id, dia)
);

CREATE TABLE grupo_atividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    autor_id INT NOT NULL,
    texto TEXT NULL,
    nome_arquivo VARCHAR(255) NULL,
    caminho_arquivo VARCHAR(100) NULL,
    tipo_arquivo VARCHAR(150) NULL,
    tamanho_arquivo BIGINT UNSIGNED NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupo_atividades_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_grupo_atividades_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_grupo_atividades_grupo_data (grupo_id, criado_em)
);

CREATE TABLE grupo_recados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    autor_id INT NOT NULL,
    texto TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grupo_recados_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_grupo_recados_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_grupo_recados_grupo_data (grupo_id, criado_em)
);

CREATE TABLE eventos_particulares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    data_evento DATE NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eventos_particulares_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_eventos_particulares_usuario_data (usuario_id, data_evento)
);

CREATE TABLE convites_grupo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    convidante_id INT NOT NULL,
    convidado_id INT NOT NULL,
    status ENUM('pendente', 'aceito', 'rejeitado') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respondido_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_convites_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_convites_convidante FOREIGN KEY (convidante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_convites_convidado FOREIGN KEY (convidado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_convites_destinatario_status (convidado_id, status)
);

CREATE TABLE solicitacoes_grupo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    status ENUM('pendente', 'aceito', 'rejeitado') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respondido_em TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_solicitacoes_grupo FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_usuario FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_solicitacoes_status_grupo (status, grupo_id),
    INDEX idx_solicitacoes_usuario (solicitante_id, grupo_id, status)
);
