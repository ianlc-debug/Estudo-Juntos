-- Execute uma vez em bancos existentes para habilitar o mural persistente dos grupos.
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
