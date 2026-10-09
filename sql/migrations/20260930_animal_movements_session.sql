-- Links a paddock movement to the corral work session that recorded it (tenant DB).

ALTER TABLE IF EXISTS animal_movements
    ADD COLUMN IF NOT EXISTS uuid_corral_work_session UUID;
