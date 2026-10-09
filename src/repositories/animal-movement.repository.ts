import { Op, Transaction } from 'sequelize';
import { requireTenantModels } from '../database/tenant/tenant-request-context';
import { AnimalMovementCreationAttributes } from '../interfaces/animal/animal-operations.interface';

export interface AnimalPaddockLocation {
    animal_uuid: string;
    registration_number: string;
    current_paddock_uuid: string | null;
}

export interface PaddockDestinationRow {
    paddock_uuid: string;
    name: string;
    maximum_capacity: number | null;
}

export interface CurrentPaddockLabel {
    current_paddock_uuid: string | null;
    current_paddock_name: string | null;
}

export interface SessionPaddockMoveLabel {
    animal_uuid: string;
    origin_paddock_name: string | null;
    destination_paddock_uuid: string | null;
    destination_paddock_name: string | null;
}

class AnimalMovementRepository {
    async findCurrentPaddockLabels(animalUuids: string[]): Promise<Map<string, CurrentPaddockLabel>> {
        const labels = new Map<string, CurrentPaddockLabel>();
        if (animalUuids.length === 0) return labels;
        const { AnimalModel, PaddockModel } = requireTenantModels();
        const rows = await AnimalModel.findAll({
            where: {
                is_active: true,
                animal_uuid: { [Op.in]: animalUuids },
            },
            attributes: ['animal_uuid', 'current_paddock_uuid'],
            include: [
                {
                    model: PaddockModel,
                    as: 'current_paddock',
                    attributes: ['name'],
                    required: false,
                },
            ],
        });
        for (const row of rows) {
            const plain = row.get({ plain: true }) as {
                animal_uuid: string;
                current_paddock_uuid?: string | null;
                current_paddock?: { name?: string | null } | null;
            };
            labels.set(plain.animal_uuid, {
                current_paddock_uuid: plain.current_paddock_uuid ?? null,
                current_paddock_name: plain.current_paddock?.name ?? null,
            });
        }
        return labels;
    }

    async findActiveAnimalsInRanch(
        ranchUuid: string,
        animalUuids: string[],
        transaction?: Transaction
    ): Promise<AnimalPaddockLocation[]> {
        if (animalUuids.length === 0) return [];
        const { AnimalModel } = requireTenantModels();
        const rows = await AnimalModel.findAll({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                animal_uuid: { [Op.in]: animalUuids },
            },
            attributes: ['animal_uuid', 'registration_number', 'current_paddock_uuid'],
            transaction,
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true }) as AnimalPaddockLocation;
            return {
                animal_uuid: plain.animal_uuid,
                registration_number: plain.registration_number,
                current_paddock_uuid: plain.current_paddock_uuid ?? null,
            };
        });
    }

    async findActivePaddocksInRanch(
        ranchUuid: string,
        paddockUuids: string[],
        transaction?: Transaction
    ): Promise<PaddockDestinationRow[]> {
        if (paddockUuids.length === 0) return [];
        const { PaddockModel } = requireTenantModels();
        const rows = await PaddockModel.findAll({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                paddock_uuid: { [Op.in]: paddockUuids },
            },
            attributes: ['paddock_uuid', 'name', 'maximum_capacity'],
            transaction,
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true }) as PaddockDestinationRow;
            const capacity = plain.maximum_capacity == null ? null : Number(plain.maximum_capacity);
            return {
                paddock_uuid: plain.paddock_uuid,
                name: plain.name,
                maximum_capacity: capacity != null && Number.isFinite(capacity) ? capacity : null,
            };
        });
    }

    async findSessionMoves(sessionUuid: string): Promise<Map<string, SessionPaddockMoveLabel>> {
        const moves = new Map<string, SessionPaddockMoveLabel>();
        if (!sessionUuid) return moves;
        const { AnimalMovementModel, PaddockModel } = requireTenantModels();
        const rows = await AnimalMovementModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                is_active: true,
            },
            attributes: ['animal_uuid', 'destination_paddock_uuid', 'created_at'],
            include: [
                {
                    model: PaddockModel,
                    as: 'origin_paddock',
                    attributes: ['name'],
                    required: false,
                },
                {
                    model: PaddockModel,
                    as: 'destination_paddock',
                    attributes: ['name'],
                    required: false,
                },
            ],
            order: [['created_at', 'DESC']],
        });
        for (const row of rows) {
            const plain = row.get({ plain: true }) as {
                animal_uuid: string;
                destination_paddock_uuid?: string | null;
                origin_paddock?: { name?: string | null } | null;
                destination_paddock?: { name?: string | null } | null;
            };
            if (moves.has(plain.animal_uuid)) continue;
            moves.set(plain.animal_uuid, {
                animal_uuid: plain.animal_uuid,
                origin_paddock_name: plain.origin_paddock?.name ?? null,
                destination_paddock_uuid: plain.destination_paddock_uuid ?? null,
                destination_paddock_name: plain.destination_paddock?.name ?? null,
            });
        }
        return moves;
    }

    async createMovements(
        rows: AnimalMovementCreationAttributes[],
        transaction?: Transaction
    ): Promise<void> {
        if (rows.length === 0) return;
        const { AnimalMovementModel } = requireTenantModels();
        await AnimalMovementModel.bulkCreate(rows, { transaction });
    }

    async updateCurrentPaddocks(
        updates: Array<{ animal_uuid: string; destination_paddock_uuid: string }>,
        transaction?: Transaction
    ): Promise<void> {
        const { AnimalModel } = requireTenantModels();
        for (const update of updates) {
            await AnimalModel.update(
                { current_paddock_uuid: update.destination_paddock_uuid },
                {
                    where: { animal_uuid: update.animal_uuid, is_active: true },
                    transaction,
                }
            );
        }
    }

    async countActiveAnimalsByPaddock(
        paddockUuids: string[],
        transaction?: Transaction
    ): Promise<Map<string, number>> {
        const counts = new Map<string, number>();
        if (paddockUuids.length === 0) return counts;
        const { AnimalModel } = requireTenantModels();
        const rows = await AnimalModel.findAll({
            attributes: ['current_paddock_uuid'],
            where: {
                is_active: true,
                current_paddock_uuid: { [Op.in]: paddockUuids },
            },
            transaction,
        });
        for (const row of rows) {
            const paddockUuid = row.get('current_paddock_uuid') as string | null;
            if (!paddockUuid) continue;
            counts.set(paddockUuid, (counts.get(paddockUuid) ?? 0) + 1);
        }
        return counts;
    }
}

export default AnimalMovementRepository;
