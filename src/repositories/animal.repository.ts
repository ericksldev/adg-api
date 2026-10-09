import {
    AnimalCreationAttributes,
    AnimalAttributes,
    AnimalCurrentStatus,
    AnimalOriginType,
    AnimalSex,
} from "../interfaces/animal/animal.interface";
import { isValidCattleBreedCode } from "../constants/cattle-breed.constants";
import { IBaseRepository } from "../interfaces/repositories/base-repository.interface";
import { Status } from "../interfaces/params/query.interface";
import { Op } from "sequelize";
import type { Model } from "sequelize";
import { requireTenantModels } from "../database/tenant/tenant-request-context";
import { buildSearchOrClause } from "../utils/search-where.util";

type AnimalRow = Model<AnimalAttributes, AnimalCreationAttributes>;

const ANIMAL_SORT_COLUMNS: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    registrationNumber: 'registration_number',
    birthDate: 'birth_date',
    breedCode: 'breed_code',
    created_at: 'created_at',
    updated_at: 'updated_at',
    registration_number: 'registration_number',
    birth_date: 'birth_date',
    breed_code: 'breed_code',
    sex: 'sex',
    color: 'color',
};

function resolveAnimalSortColumn(sortBy: string): string {
    return ANIMAL_SORT_COLUMNS[sortBy] ?? 'created_at';
}

const ANIMAL_ORIGIN_TYPES: readonly AnimalOriginType[] = ['BIRTH', 'PURCHASE', 'TRANSFER', 'UNKNOWN'];
const ANIMAL_CURRENT_STATUSES: readonly AnimalCurrentStatus[] = [
    'ACTIVE',
    'SOLD',
    'DISPOSED',
    'DEAD',
    'MISSING',
    'INACTIVE',
];

function parseUtcDay(value: string | undefined): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return null;
    }
    return date;
}

class AnimalRepository implements
    IBaseRepository<AnimalRow, AnimalCreationAttributes> {

    async findAll(
        params: {
            page: number;
            size: number;
            sortBy: string;
            order: 'ASC' | 'DESC';
            status?: Status;
            uuid_company?: string;
            uuid_ranch_in?: string[];
            search?: string;
            sex?: string;
            ranch_uuid?: string;
            breed_code?: string;
            origin_type?: string;
            current_owner_uuid?: string;
            current_paddock_uuid?: string;
            birth_date_from?: string;
            birth_date_to?: string;
            current_status?: string;
        }
    ): Promise<{ rows: AnimalRow[]; count: number }> {
        const { AnimalModel, RanchModel } = requireTenantModels();
        const { page, size, sortBy, order, status } = params;
        const unpaged = size <= 0;

        const where: Record<string, unknown> = {};
        if (params.ranch_uuid) {
            where.ranch_uuid = params.ranch_uuid;
        }
        if (status === 'active') {
            where.is_active = true;
        } else if (status === 'inactive') {
            where.is_active = false;
        }

        const sex = params.sex?.trim().toUpperCase();
        if (sex === "MALE" || sex === "FEMALE") {
            where.sex = sex;
        }

        const breedCode = params.breed_code?.trim().toUpperCase();
        if (breedCode && isValidCattleBreedCode(breedCode)) {
            where.breed_code = breedCode;
        }

        const originType = params.origin_type?.trim().toUpperCase();
        if (originType && ANIMAL_ORIGIN_TYPES.includes(originType as AnimalOriginType)) {
            where.origin_type = originType;
        }

        if (params.current_owner_uuid) {
            where.current_owner_uuid = params.current_owner_uuid;
        }
        if (params.current_paddock_uuid) {
            where.current_paddock_uuid = params.current_paddock_uuid;
        }

        const currentStatus = params.current_status?.trim().toUpperCase();
        if (currentStatus && ANIMAL_CURRENT_STATUSES.includes(currentStatus as AnimalCurrentStatus)) {
            where.current_status = currentStatus;
        }

        const birthFrom = parseUtcDay(params.birth_date_from);
        const birthTo = parseUtcDay(params.birth_date_to);
        if (birthFrom || birthTo) {
            const birthRange: Record<symbol, Date> = {};
            if (birthFrom) {
                birthRange[Op.gte] = birthFrom;
            }
            if (birthTo) {
                const nextDay = new Date(birthTo);
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                birthRange[Op.lt] = nextDay;
            }
            where.birth_date = birthRange;
        }

        const searchClause = buildSearchOrClause(params.search, [
            "registration_number",
            "chip_number",
            "breed_code",
            "color",
            "description",
        ]);
        if (searchClause) {
            Object.assign(where, searchClause);
        }

        const needsRanchJoin = Boolean(params.uuid_company) || Boolean(params.uuid_ranch_in?.length);
        const ranchWhere: Record<string, unknown> = { is_active: true };
        if (params.uuid_company) {
            ranchWhere.uuid_company = params.uuid_company;
        }
        if (params.uuid_ranch_in?.length) {
            ranchWhere.uuid_ranch = { [Op.in]: params.uuid_ranch_in };
        }

        const include = needsRanchJoin ? [{
            model: RanchModel,
            as: 'ranch',
            required: true,
            where: ranchWhere
        }] : [];

        return await AnimalModel.findAndCountAll({
            where,
            include,
            ...(unpaged ? {} : { offset: (page - 1) * size, limit: size }),
            order: [[resolveAnimalSortColumn(sortBy), order]],
            distinct: needsRanchJoin,
        });
    }

    async findById(
        params: { id: string; includeInactive?: boolean; uuid_company?: string; uuid_ranch_in?: string[] }
    ): Promise<AnimalRow | null> {
        const { AnimalModel, RanchModel } = requireTenantModels();
        const { id, includeInactive, uuid_company, uuid_ranch_in } = params;
        const where: Record<string, unknown> = { animal_uuid: id };
        if (!includeInactive) {
            where.is_active = true;
        }

        const needsRanchJoin = Boolean(uuid_company) || Boolean(uuid_ranch_in?.length);
        const ranchWhere: Record<string, unknown> = { is_active: true };
        if (uuid_company) {
            ranchWhere.uuid_company = uuid_company;
        }
        if (uuid_ranch_in?.length) {
            ranchWhere.uuid_ranch = { [Op.in]: uuid_ranch_in };
        }

        const include = needsRanchJoin ? [{
            model: RanchModel,
            as: 'ranch',
            required: true,
            where: ranchWhere
        }] : [];

        return await AnimalModel.findOne({ where, include });
    }

    async create(data: AnimalCreationAttributes): Promise<AnimalRow> {
        const { AnimalModel } = requireTenantModels();
        return await AnimalModel.create(data);
    }

    async update(
        animal_uuid: string,
        data: AnimalCreationAttributes
    ): Promise<AnimalRow | null> {
        const { AnimalModel } = requireTenantModels();
        const [count, updated] = await AnimalModel.update(data, {
            where: { animal_uuid, is_active: true },
            returning: true,
        });

        if (count === 0) return null;
        return updated[0];
    }

    async delete(animal_uuid: string, options?: { uuid_company?: string; uuid_ranch_in?: string[] }): Promise<boolean> {
        const { AnimalModel, RanchModel } = requireTenantModels();
        let canDelete = true;
        if (options?.uuid_company || options?.uuid_ranch_in?.length) {
            const current = await AnimalModel.findOne({ where: { animal_uuid, is_active: true } });
            if (current) {
                const plain = current.get({ plain: true }) as AnimalAttributes;
                if (options.uuid_ranch_in?.length && !options.uuid_ranch_in.includes(plain.ranch_uuid)) {
                    canDelete = false;
                } else {
                    const ranchWhere: Record<string, unknown> = {
                        uuid_ranch: plain.ranch_uuid,
                        is_active: true,
                    };
                    if (options.uuid_company) {
                        ranchWhere.uuid_company = options.uuid_company;
                    }
                    const ranch = await RanchModel.findOne({ where: ranchWhere });
                    canDelete = Boolean(ranch);
                }
            } else {
                canDelete = false;
            }
        }
        if (!canDelete) {
            return false;
        }

        const [count] = await AnimalModel.update({ is_active: false }, { where: { animal_uuid, is_active: true } });
        return count > 0;
    }

    async markInactiveWithStatus(
        animal_uuid: string,
        current_status: AnimalCurrentStatus,
        options?: { uuid_company?: string; uuid_ranch_in?: string[] }
    ): Promise<boolean> {
        const { AnimalModel, RanchModel } = requireTenantModels();
        let canUpdate = true;
        if (options?.uuid_company || options?.uuid_ranch_in?.length) {
            const current = await AnimalModel.findOne({ where: { animal_uuid, is_active: true } });
            if (current) {
                const plain = current.get({ plain: true }) as AnimalAttributes;
                if (options.uuid_ranch_in?.length && !options.uuid_ranch_in.includes(plain.ranch_uuid)) {
                    canUpdate = false;
                } else {
                    const ranchWhere: Record<string, unknown> = {
                        uuid_ranch: plain.ranch_uuid,
                        is_active: true,
                    };
                    if (options.uuid_company) {
                        ranchWhere.uuid_company = options.uuid_company;
                    }
                    const ranch = await RanchModel.findOne({ where: ranchWhere });
                    canUpdate = Boolean(ranch);
                }
            } else {
                canUpdate = false;
            }
        }
        if (!canUpdate) {
            return false;
        }

        const [count] = await AnimalModel.update(
            { is_active: false, current_status },
            { where: { animal_uuid, is_active: true } }
        );
        return count > 0;
    }

    async countActiveByCompany(uuid_company: string): Promise<number> {
        const { AnimalModel, RanchModel } = requireTenantModels();
        return AnimalModel.count({
            where: { is_active: true },
            distinct: true,
            col: 'animal_uuid',
            include: [{
                model: RanchModel,
                as: 'ranch',
                required: true,
                attributes: [],
                where: { uuid_company, is_active: true },
            }],
        });
    }

    async findAnimalUuidByRanchAndChip(
        ranch_uuid: string,
        chip_number: string,
        options?: { excludeAnimalUuid?: string }
    ): Promise<string | null> {
        const { AnimalModel } = requireTenantModels();
        const where: Record<string, unknown> = {
            ranch_uuid,
            chip_number: chip_number.trim(),
            is_active: true,
        };
        if (options?.excludeAnimalUuid) {
            where.animal_uuid = { [Op.ne]: options.excludeAnimalUuid };
        }
        const found = await AnimalModel.findOne({
            where,
            attributes: ['animal_uuid'],
        });
        return found ? (found.get('animal_uuid') as string) : null;
    }

    async findAnimalUuidByRanchAndRegistration(
        ranch_uuid: string,
        registration_number: string,
        options?: { excludeAnimalUuid?: string }
    ): Promise<string | null> {
        const { AnimalModel } = requireTenantModels();
        const where: Record<string, unknown> = {
            ranch_uuid,
            registration_number: registration_number.trim(),
            is_active: true,
        };
        if (options?.excludeAnimalUuid) {
            where.animal_uuid = { [Op.ne]: options.excludeAnimalUuid };
        }
        const found = await AnimalModel.findOne({
            where,
            attributes: ['animal_uuid'],
        });
        return found ? (found.get('animal_uuid') as string) : null;
    }

    async listByRanchForParentSelection(
        ranch_uuid: string,
        sex: AnimalSex
    ): Promise<{ animal_uuid: string; registration_number: string }[]> {
        const { AnimalModel } = requireTenantModels();
        const rows = await AnimalModel.findAll({
            where: { ranch_uuid, sex, is_active: true },
            attributes: ['animal_uuid', 'registration_number'],
            order: [['registration_number', 'ASC']],
        });
        return rows.map((r) => {
            const p = r.get({ plain: true }) as { animal_uuid: string; registration_number: string };
            return { animal_uuid: p.animal_uuid, registration_number: p.registration_number };
        });
    }

    async findActiveUuidByRanchRegistrationAndSex(
        ranch_uuid: string,
        registration_number: string,
        sex: AnimalSex
    ): Promise<string | null> {
        const { AnimalModel } = requireTenantModels();
        const row = await AnimalModel.findOne({
            where: {
                ranch_uuid,
                registration_number: registration_number.trim(),
                sex,
                is_active: true,
            },
            attributes: ['animal_uuid'],
        });
        return row ? (row.get('animal_uuid') as string) : null;
    }
}

export default AnimalRepository;
