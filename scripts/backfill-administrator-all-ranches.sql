-- Ejecutar una vez contra PostgreSQL (Vrete API).
-- Para cada usuario que ya es administrador en al menos un rancho activo de una empresa,
-- inserta membresía de administrador en el resto de ranchos activos de esa misma empresa
-- donde no exista ya una fila activa en user_ranches.
--
-- No sobrescribe filas activas con otro rol (p. ej. ranch_staff en otro rancho).

INSERT INTO user_ranches (uuid_user, uuid_ranch, role, is_active, created_at, updated_at)
SELECT DISTINCT ur_src.uuid_user, r_tgt.uuid_ranch, 'administrator', true, NOW(), NOW()
FROM user_ranches ur_src
INNER JOIN ranches r_src ON r_src.uuid_ranch = ur_src.uuid_ranch AND r_src.is_active = true
INNER JOIN ranches r_tgt ON r_tgt.uuid_company = r_src.uuid_company AND r_tgt.is_active = true
WHERE ur_src.is_active = true
  AND ur_src.role = 'administrator'
  AND NOT EXISTS (
    SELECT 1
    FROM user_ranches ur2
    WHERE ur2.uuid_user = ur_src.uuid_user
      AND ur2.uuid_ranch = r_tgt.uuid_ranch
      AND ur2.is_active = true
  );
