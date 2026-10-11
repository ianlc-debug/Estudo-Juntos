-- Execute uma vez em bancos existentes para habilitar publicações e anexos do quadro.
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
