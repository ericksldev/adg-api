import { Transaction } from 'sequelize';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import AnimalMovementRepository, {
    CurrentPaddockLabel,
    SessionPaddockMoveLabel,
} from '../repositories/animal-movement.repository';

export const PADDOCK_DISTRIBUTION_REASON = 'paddock_distribution';

export interface PaddockDistributionMoveInput {
    animal_uuid: string;
    destination_paddock_uuid: string;
}

export interface AppliedPaddockMove {
    animal_uuid: string;
    registration_number: string;
    origin_paddock_uuid: string | null;
    destination_paddock_uuid: string;
    destination_paddock_name: string;
}

export interface PaddockCapacityWarning {
    paddock_uuid: string;
    paddock_name: string;
    maximum_capacity: number;
    projected_count: number;
}

export interface ApplyPaddockDistributionInput {
    ranchUuid: string;
    sessionUuid: string;
    movementDate: Date;
    moves: PaddockDistributionMoveInput[];
}

export interface ApplyPaddockDistributionOutput {
    moved: AppliedPaddockMove[];
    capacity_warnings: PaddockCapacityWarning[];
}

class AnimalMovementService {
    private readonly repository: AnimalMovementRepository;

    constructor(repository: AnimalMovementRepository) {
        this.repository = repository;
    }

    findCurrentPaddockLabels(animalUuids: string[]): Promise<Map<string, CurrentPaddockLabel>> {
        return this.repository.findCurrentPaddockLabels(animalUuids);
    }

    findSessionMoves(sessionUuid: string): Promise<Map<string, SessionPaddockMoveLabel>> {
        return this.repository.findSessionMoves(sessionUuid);
    }

    async applyDistribution(
        input: ApplyPaddockDistributionInput,
        transaction?: Transaction
    ): Promise<ApplyPaddockDistributionOutput> {
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
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found for this ranch',
            });
        }

        const missingPaddock = destinationUuids.find((uuid) => !paddockByUuid.has(uuid));
        if (missingPaddock) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Destination paddock is not active in this ranch',
            });
        }

        const moved: AppliedPaddockMove[] = [];
        for (const move of requested) {
            const animal = animalByUuid.get(move.animal_uuid)!;
            const destination = paddockByUuid.get(move.destination_paddock_uuid)!;
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

        await this.repository.createMovements(
            moved.map((move) => ({
                animal_uuid: move.animal_uuid,
                origin_paddock_uuid: move.origin_paddock_uuid,
                destination_paddock_uuid: move.destination_paddock_uuid,
                movement_date: input.movementDate,
                movement_reason: PADDOCK_DISTRIBUTION_REASON,
                uuid_corral_work_session: input.sessionUuid,
                is_active: true,
            })),
            transaction
        );
        await this.repository.updateCurrentPaddocks(
            moved.map((move) => ({
                animal_uuid: move.animal_uuid,
                destination_paddock_uuid: move.destination_paddock_uuid,
            })),
            transaction
        );

        const destinationIds = [...new Set(moved.map((move) => move.destination_paddock_uuid))];
        const counts = await this.repository.countActiveAnimalsByPaddock(destinationIds, transaction);
        const capacity_warnings: PaddockCapacityWarning[] = [];
        for (const paddockUuid of destinationIds) {
            const paddock = paddockByUuid.get(paddockUuid);
            if (!paddock || paddock.maximum_capacity == null) continue;
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

    private collapseMoves(moves: PaddockDistributionMoveInput[]): PaddockDistributionMoveInput[] {
        const byAnimal = new Map<string, string>();
        for (const move of moves) {
            const animalUuid = move.animal_uuid?.trim();
            const destinationUuid = move.destination_paddock_uuid?.trim();
            if (!animalUuid || !destinationUuid) continue;
            byAnimal.set(animalUuid, destinationUuid);
        }
        return [...byAnimal.entries()].map(([animal_uuid, destination_paddock_uuid]) => ({
            animal_uuid,
            destination_paddock_uuid,
        }));
    }
}

export default AnimalMovementService;
