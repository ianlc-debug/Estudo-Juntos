-- Execute uma vez em bancos existentes para habilitar contatos e mensagens privadas.
CREATE TABLE contatos_usuarios (
    usuario_id INT NOT NULL,
    contato_id INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, contato_id),
    CONSTRAINT fk_contatos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_contatos_contato FOREIGN KEY (contato_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_contatos_destinatario (contato_id)
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
