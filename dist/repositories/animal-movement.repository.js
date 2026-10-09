"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const tenant_request_context_1 = require("../database/tenant/tenant-request-context");
class AnimalMovementRepository {
    async findCurrentPaddockLabels(animalUuids) {
        const labels = new Map();
        if (animalUuids.length === 0)
            return labels;
        const { AnimalModel, PaddockModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await AnimalModel.findAll({
            where: {
                is_active: true,
                animal_uuid: { [sequelize_1.Op.in]: animalUuids },
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
            const plain = row.get({ plain: true });
            labels.set(plain.animal_uuid, {
                current_paddock_uuid: plain.current_paddock_uuid ?? null,
                current_paddock_name: plain.current_paddock?.name ?? null,
            });
        }
        return labels;
    }
    async findActiveAnimalsInRanch(ranchUuid, animalUuids, transaction) {
        if (animalUuids.length === 0)
            return [];
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await AnimalModel.findAll({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                animal_uuid: { [sequelize_1.Op.in]: animalUuids },
            },
            attributes: ['animal_uuid', 'registration_number', 'current_paddock_uuid'],
            transaction,
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true });
            return {
                animal_uuid: plain.animal_uuid,
                registration_number: plain.registration_number,
                current_paddock_uuid: plain.current_paddock_uuid ?? null,
            };
        });
    }
    async findActivePaddocksInRanch(ranchUuid, paddockUuids, transaction) {
        if (paddockUuids.length === 0)
            return [];
        const { PaddockModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await PaddockModel.findAll({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                paddock_uuid: { [sequelize_1.Op.in]: paddockUuids },
            },
            attributes: ['paddock_uuid', 'name', 'maximum_capacity'],
            transaction,
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true });
            const capacity = plain.maximum_capacity == null ? null : Number(plain.maximum_capacity);
            return {
                paddock_uuid: plain.paddock_uuid,
                name: plain.name,
                maximum_capacity: capacity != null && Number.isFinite(capacity) ? capacity : null,
            };
        });
    }
    async findSessionMoves(sessionUuid) {
        const moves = new Map();
        if (!sessionUuid)
            return moves;
        const { AnimalMovementModel, PaddockModel } = (0, tenant_request_context_1.requireTenantModels)();
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
            const plain = row.get({ plain: true });
            if (moves.has(plain.animal_uuid))
                continue;
            moves.set(plain.animal_uuid, {
                animal_uuid: plain.animal_uuid,
                origin_paddock_name: plain.origin_paddock?.name ?? null,
                destination_paddock_uuid: plain.destination_paddock_uuid ?? null,
                destination_paddock_name: plain.destination_paddock?.name ?? null,
            });
        }
        return moves;
    }
    async createMovements(rows, transaction) {
        if (rows.length === 0)
            return;
        const { AnimalMovementModel } = (0, tenant_request_context_1.requireTenantModels)();
        await AnimalMovementModel.bulkCreate(rows, { transaction });
    }
    async updateCurrentPaddocks(updates, transaction) {
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        for (const update of updates) {
            await AnimalModel.update({ current_paddock_uuid: update.destination_paddock_uuid }, {
                where: { animal_uuid: update.animal_uuid, is_active: true },
                transaction,
            });
        }
    }
    async countActiveAnimalsByPaddock(paddockUuids, transaction) {
        const counts = new Map();
        if (paddockUuids.length === 0)
            return counts;
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await AnimalModel.findAll({
            attributes: ['current_paddock_uuid'],
            where: {
                is_active: true,
                current_paddock_uuid: { [sequelize_1.Op.in]: paddockUuids },
            },
            transaction,
        });
        for (const row of rows) {
            const paddockUuid = row.get('current_paddock_uuid');
            if (!paddockUuid)
                continue;
            counts.set(paddockUuid, (counts.get(paddockUuid) ?? 0) + 1);
        }
        return counts;
    }
}
exports.default = AnimalMovementRepository;
