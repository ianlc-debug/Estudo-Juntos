-- Execute uma vez em bancos existentes para persistir eventos pessoais da agenda.
CREATE TABLE eventos_particulares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    data_evento DATE NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eventos_particulares_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_eventos_particulares_usuario_data (usuario_id, data_evento)
);
