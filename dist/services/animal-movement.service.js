"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PADDOCK_DISTRIBUTION_REASON = void 0;
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
exports.PADDOCK_DISTRIBUTION_REASON = 'paddock_distribution';
class AnimalMovementService {
    constructor(repository) {
        this.repository = repository;
    }
    findCurrentPaddockLabels(animalUuids) {
        return this.repository.findCurrentPaddockLabels(animalUuids);
    }
    findSessionMoves(sessionUuid) {
        return this.repository.findSessionMoves(sessionUuid);
    }
    async applyDistribution(input, transaction) {
        const requested = this.collapseMoves(input.moves);
        if (requested.length === 0) {
            return { moved: [], capacity_warnings: [] };
        }
        const animalUuids = requested.map((move) => move.animal_uuid);
        const destinationUuids = [...new Set(requested.map((move) => move.destination_paddock_uuid))];
        const [animals, paddocks] = await Promise.all([
            this.repository.findActiveAnimalsInRanch(input.ranchUuid, animalUuids, transaction),
            this.repository.findActivePaddocksInRanch(input.ranchUuid, destinationUuids, transaction),
        ]);
        const animalByUuid = new Map(animals.map((animal) => [animal.animal_uuid, animal]));
        const paddockByUuid = new Map(paddocks.map((paddock) => [paddock.paddock_uuid, paddock]));
        const missingAnimal = animalUuids.find((uuid) => !animalByUuid.has(uuid));
        if (missingAnimal) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Animal not found for this ranch',
            });
        }
        const missingPaddock = destinationUuids.find((uuid) => !paddockByUuid.has(uuid));
        if (missingPaddock) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Destination paddock is not active in this ranch',
            });
        }
        const moved = [];
        for (const move of requested) {
            const animal = animalByUuid.get(move.animal_uuid);
            const destination = paddockByUuid.get(move.destination_paddock_uuid);
            if (animal.current_paddock_uuid === move.destination_paddock_uuid) {
                continue;
            }
            moved.push({
                animal_uuid: animal.animal_uuid,
                registration_number: animal.registration_number,
                origin_paddock_uuid: animal.current_paddock_uuid,
                destination_paddock_uuid: destination.paddock_uuid,
                destination_paddock_name: destination.name,
            });
        }
        if (moved.length === 0) {
            return { moved: [], capacity_warnings: [] };
        }
        await this.repository.createMovements(moved.map((move) => ({
            animal_uuid: move.animal_uuid,
            origin_paddock_uuid: move.origin_paddock_uuid,
            destination_paddock_uuid: move.destination_paddock_uuid,
            movement_date: input.movementDate,
            movement_reason: exports.PADDOCK_DISTRIBUTION_REASON,
            uuid_corral_work_session: input.sessionUuid,
            is_active: true,
        })), transaction);
        await this.repository.updateCurrentPaddocks(moved.map((move) => ({
            animal_uuid: move.animal_uuid,
            destination_paddock_uuid: move.destination_paddock_uuid,
        })), transaction);
        const destinationIds = [...new Set(moved.map((move) => move.destination_paddock_uuid))];
        const counts = await this.repository.countActiveAnimalsByPaddock(destinationIds, transaction);
        const capacity_warnings = [];
        for (const paddockUuid of destinationIds) {
            const paddock = paddockByUuid.get(paddockUuid);
            if (!paddock || paddock.maximum_capacity == null)
                continue;
            const projected = counts.get(paddockUuid) ?? 0;
            if (projected > paddock.maximum_capacity) {
                capacity_warnings.push({
                    paddock_uuid: paddock.paddock_uuid,
                    paddock_name: paddock.name,
                    maximum_capacity: paddock.maximum_capacity,
                    projected_count: projected,
                });
            }
        }
        return { moved, capacity_warnings };
    }
    collapseMoves(moves) {
        const byAnimal = new Map();
        for (const move of moves) {
            const animalUuid = move.animal_uuid?.trim();
            const destinationUuid = move.destination_paddock_uuid?.trim();
            if (!animalUuid || !destinationUuid)
                continue;
            byAnimal.set(animalUuid, destinationUuid);
        }
        return [...byAnimal.entries()].map(([animal_uuid, destination_paddock_uuid]) => ({
            animal_uuid,
            destination_paddock_uuid,
        }));
    }
}
exports.default = AnimalMovementService;
