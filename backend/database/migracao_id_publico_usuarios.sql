-- Execute uma única vez no banco estudo_juntos para atualizar a tabela usuarios existente.
-- A coluna começa aceitando NULL para que os identificadores dos usuários antigos
-- possam ser preenchidos antes de se tornar obrigatória.
ALTER TABLE usuarios
    ADD COLUMN id_publico CHAR(6) NULL,
    ADD UNIQUE INDEX uq_usuarios_id_publico (id_publico);

DELIMITER $$
CREATE PROCEDURE preencher_ids_publicos_estudo_juntos()
BEGIN
    DECLARE terminou BOOLEAN DEFAULT FALSE;
    DECLARE usuario_id INT;
    DECLARE novo_id CHAR(6);
    DECLARE existe_id INT DEFAULT 1;
    DECLARE usuarios_pendentes CURSOR FOR
        SELECT id FROM usuarios WHERE id_publico IS NULL;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET terminou = TRUE;

    OPEN usuarios_pendentes;

    loop_usuarios: LOOP
        FETCH usuarios_pendentes INTO usuario_id;
        IF terminou THEN
            LEAVE loop_usuarios;
        END IF;

        SET existe_id = 1;
        WHILE existe_id > 0 DO
            SET novo_id = LPAD(FLOOR(100000 + RAND() * 900000), 6, '0');
            SELECT COUNT(*) INTO existe_id
            FROM usuarios
            WHERE id_publico = novo_id;
        END WHILE;

        UPDATE usuarios
        SET id_publico = novo_id
        WHERE id = usuario_id;
    END LOOP;

    CLOSE usuarios_pendentes;
END$$
DELIMITER ;

CALL preencher_ids_publicos_estudo_juntos();
DROP PROCEDURE preencher_ids_publicos_estudo_juntos;

ALTER TABLE usuarios
    MODIFY COLUMN id_publico CHAR(6) NOT NULL;
