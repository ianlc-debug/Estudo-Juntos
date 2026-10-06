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
