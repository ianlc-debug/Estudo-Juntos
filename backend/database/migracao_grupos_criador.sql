-- Execute uma vez em bancos já existentes antes de iniciar a versão atualizada.
-- Associa grupos antigos ao usuário pelo nome guardado no campo criador.
ALTER TABLE grupos ADD COLUMN criador_id INT NULL;

UPDATE grupos g
JOIN usuarios u ON LOWER(TRIM(u.nome_usuario)) = LOWER(TRIM(g.criador))
SET g.criador_id = u.id
WHERE g.criador_id IS NULL;

ALTER TABLE grupos
    ADD INDEX idx_grupos_privacidade_criador (privacidade, criador_id),
    ADD CONSTRAINT fk_grupos_criador
        FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE;
