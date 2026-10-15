import { Op, Transaction } from 'sequelize';
import { SYSTEM_LIVESTOCK_CATEGORIES } from '../constants/livestock-category.constants';
import { requireTenantModels, requireTenantSequelize } from '../database/tenant/tenant-request-context';

export interface LivestockCategoryRow {
    category_uuid: string;
    uuid_company: string | null;
    system_code: string | null;
    name: string;
    description: string | null;
    category_type: string;
    is_system: boolean;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface AnimalCategoryRow {
    animal_category_uuid: string;
    animal_uuid: string;
    category_uuid: string;
    uuid_user: string | null;
    assigned_at: Date;
    name?: string;
}

function plain<T>(row: { get: (options: { plain: true }) => T }): T {
    return row.get({ plain: true });
}

class LivestockCategoryRepository {
    async ensureSystemCategories(): Promise<void> {
        const { LivestockCategoryModel } = requireTenantModels();
        for (const item of SYSTEM_LIVESTOCK_CATEGORIES) {
            const existing = await LivestockCategoryModel.findOne({ where: { system_code: item.system_code, is_system: true } });
            if (existing) {
                continue;
            }
            await LivestockCategoryModel.create({
                ...item,
                uuid_company: null,
                is_system: true,
                is_active: true,
            });
        }
    }

    async listCategories(uuidCompany: string, includeInactive: boolean): Promise<LivestockCategoryRow[]> {
        const { LivestockCategoryModel } = requireTenantModels();
        const where: Record<string, unknown> = {
            [Op.or]: [{ is_system: true }, { uuid_company: uuidCompany }],
        };
        if (!includeInactive) {
            where.is_active = true;
        }
        const rows = await LivestockCategoryModel.findAll({ where, order: [['name', 'ASC']] });
        return rows.map((row) => plain<LivestockCategoryRow>(row));
    }

    async findCategory(categoryUuid: string): Promise<LivestockCategoryRow | null> {
        const { LivestockCategoryModel } = requireTenantModels();
        const row = await LivestockCategoryModel.findByPk(categoryUuid);
        return row ? plain<LivestockCategoryRow>(row) : null;
    }

    async findCategoryByName(uuidCompany: string, name: string): Promise<LivestockCategoryRow | null> {
        const { LivestockCategoryModel } = requireTenantModels();
        const row = await LivestockCategoryModel.findOne({
            where: {
                name: { [Op.iLike]: name.trim() },
                [Op.or]: [{ is_system: true }, { uuid_company: uuidCompany }],
            },
        });
        return row ? plain<LivestockCategoryRow>(row) : null;
    }

    async createCategory(values: {
        uuid_company: string;
        name: string;
        description: string | null;
        category_type: string;
    }): Promise<LivestockCategoryRow> {
        const { LivestockCategoryModel } = requireTenantModels();
        const row = await LivestockCategoryModel.create({
            ...values,
            system_code: null,
            is_system: false,
            is_active: true,
        });
        return plain<LivestockCategoryRow>(row);
    }

    async updateCategory(
        categoryUuid: string,
        values: { name?: string; description?: string | null; category_type?: string; is_active?: boolean }
    ): Promise<LivestockCategoryRow | null> {
        const { LivestockCategoryModel } = requireTenantModels();
        const row = await LivestockCategoryModel.findByPk(categoryUuid);
        if (!row) {
            return null;
        }
        await row.update(values);
        return plain<LivestockCategoryRow>(row);
    }

    async countAssignments(categoryUuid: string): Promise<number> {
        const { AnimalCategoryModel } = requireTenantModels();
        return AnimalCategoryModel.count({ where: { category_uuid: categoryUuid } });
    }

    async findAnimal(animalUuid: string): Promise<{ animal_uuid: string; ranch_uuid: string } | null> {
        const { AnimalModel } = requireTenantModels();
        const row = await AnimalModel.findByPk(animalUuid);
        if (!row) {
            return null;
        }
        return {
            animal_uuid: String(row.get('animal_uuid')),
            ranch_uuid: String(row.get('ranch_uuid')),
        };
    }

    async findRanchCompany(ranchUuid: string): Promise<string | null> {
        const { RanchModel } = requireTenantModels();
        const row = await RanchModel.findByPk(ranchUuid);
        if (!row) {
            return null;
        }
        return String(row.get('uuid_company'));
    }

    async listCurrent(animalUuid: string): Promise<AnimalCategoryRow[]> {
        const map = await this.listCurrentForAnimals([animalUuid]);
        return map.get(animalUuid) ?? [];
    }

    async listCurrentForAnimals(animalUuids: string[]): Promise<Map<string, AnimalCategoryRow[]>> {
        const grouped = new Map<string, AnimalCategoryRow[]>();
        if (animalUuids.length === 0) {
            return grouped;
        }
        const { AnimalCategoryModel, LivestockCategoryModel } = requireTenantModels();
        const rows = await AnimalCategoryModel.findAll({ where: { animal_uuid: animalUuids } });
        const categoryIds = [...new Set(rows.map((row) => String(row.get('category_uuid'))))];
        const categories = categoryIds.length
            ? await LivestockCategoryModel.findAll({ where: { category_uuid: categoryIds } })
            : [];
        const names = new Map(categories.map((row) => [String(row.get('category_uuid')), String(row.get('name'))]));
        for (const row of rows) {
            const data = plain<AnimalCategoryRow>(row);
            const bucket = grouped.get(data.animal_uuid) ?? [];
            bucket.push({ ...data, name: names.get(data.category_uuid) });
            grouped.set(data.animal_uuid, bucket);
        }
        return grouped;
    }

    async listHistory(animalUuid: string): Promise<Record<string, unknown>[]> {
        const { AnimalCategoryHistoryModel, LivestockCategoryModel } = requireTenantModels();
        const rows = await AnimalCategoryHistoryModel.findAll({
            where: { animal_uuid: animalUuid },
            order: [['recorded_at', 'DESC']],
            limit: 200,
        });
        const categoryIds = [...new Set(rows.map((row) => String(row.get('category_uuid'))))];
        const categories = categoryIds.length
            ? await LivestockCategoryModel.findAll({ where: { category_uuid: categoryIds } })
            : [];
        const names = new Map(categories.map((row) => [String(row.get('category_uuid')), String(row.get('name'))]));
        return rows.map((row) => {
            const data = plain<Record<string, unknown>>(row);
            return { ...data, category_name: names.get(String(data.category_uuid)) ?? null };
        });
    }

    async assign(params: {
        animalUuid: string;
        categoryUuid: string;
        uuidUser?: string;
        reason?: string | null;
    }): Promise<'created' | 'exists'> {
        const sequelize = requireTenantSequelize();
        const { AnimalCategoryModel } = requireTenantModels();
        const now = new Date();
        return sequelize.transaction(async (transaction) => {
            const existing = await AnimalCategoryModel.findOne({
                where: { animal_uuid: params.animalUuid, category_uuid: params.categoryUuid },
                transaction,
            });
            if (existing) {
                return 'exists';
            }
            await AnimalCategoryModel.create(
                {
                    animal_uuid: params.animalUuid,
                    category_uuid: params.categoryUuid,
                    uuid_user: params.uuidUser ?? null,
                    assigned_at: now,
                },
                { transaction }
            );
            await this.insertHistory(transaction, {
                animal_uuid: params.animalUuid,
                category_uuid: params.categoryUuid,
                action: 'ASSIGN',
                uuid_user: params.uuidUser ?? null,
                reason: params.reason ?? null,
                at: now,
            });
            return 'created';
        });
    }

    async remove(params: {
        animalUuid: string;
        categoryUuid: string;
        uuidUser?: string;
        reason?: string | null;
    }): Promise<boolean> {
        const sequelize = requireTenantSequelize();
        const { AnimalCategoryModel } = requireTenantModels();
        const now = new Date();
        return sequelize.transaction(async (transaction) => {
            const removed = await AnimalCategoryModel.destroy({
                where: { animal_uuid: params.animalUuid, category_uuid: params.categoryUuid },
                transaction,
            });
            if (removed === 0) {
                return false;
            }
            await this.insertHistory(transaction, {
                animal_uuid: params.animalUuid,
                category_uuid: params.categoryUuid,
                action: 'REMOVE',
                uuid_user: params.uuidUser ?? null,
                reason: params.reason ?? null,
                at: now,
            });
            return true;
        });
    }

    private async insertHistory(
        transaction: Transaction,
        values: {
            animal_uuid: string;
            category_uuid: string;
            action: 'ASSIGN' | 'REMOVE';
            uuid_user: string | null;
            reason: string | null;
            at: Date;
        }
    ): Promise<void> {
        const { AnimalCategoryHistoryModel } = requireTenantModels();
        await AnimalCategoryHistoryModel.create(
            {
                animal_uuid: values.animal_uuid,
                category_uuid: values.category_uuid,
                action: values.action,
                effective_at: values.at,
                recorded_at: values.at,
                uuid_user: values.uuid_user,
                reason: values.reason,
            },
            { transaction }
        );
    }
}

export default LivestockCategoryRepository;
