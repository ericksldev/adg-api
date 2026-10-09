import { Op, Transaction } from 'sequelize';
import saasSequelize from '../database';
import SaasPlanModel from '../database/models/saas-plan.model';
import SaasPlanLimitModel from '../database/models/saas-plan-limit.model';
import { IBaseParams } from '../interfaces/params/query.interface';
import {
    SaasPlanAttributes,
    SaasPlanCreationAttributes,
    SaasPlanLimitAttributes,
    SaasPlanLimitValues,
    SaasPlanView,
} from '../interfaces/saas-plan/saas-plan.interface';
import { SAAS_PLAN_RESOURCE_CODES } from '../constants/saas-plan.constants';

const SORTABLE_COLUMNS = new Set(['name', 'code', 'annual_price', 'created_at', 'updated_at', 'is_active']);

function emptyLimits(): SaasPlanLimitValues {
    return {
        USERS: null,
        ANIMALS: null,
        ACTIVITY_RECORDS: null,
    };
}

function toNumber(value: unknown): number {
    return Number(value);
}

export function toPlanView(
    plan: SaasPlanAttributes,
    limits: SaasPlanLimitAttributes[]
): SaasPlanView {
    const viewLimits = emptyLimits();
    for (const limit of limits) {
        if (limit.resource_code === 'USERS' || limit.resource_code === 'ANIMALS' || limit.resource_code === 'ACTIVITY_RECORDS') {
            viewLimits[limit.resource_code] = limit.max_value;
        }
    }

    return {
        uuid_plan: plan.uuid_plan,
        code: plan.code,
        name: plan.name,
        description: plan.description ?? null,
        annual_price: toNumber(plan.annual_price),
        currency: plan.currency,
        is_active: plan.is_active,
        limits: viewLimits,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
    };
}

class SaasPlanRepository {
    async findAll(params: IBaseParams): Promise<{ rows: SaasPlanView[]; count: number }> {
        const offset = (params.page - 1) * params.size;
        const where: Record<string, unknown> = {};
        if (params.status === 'active') {
            where.is_active = true;
        } else if (params.status === 'inactive') {
            where.is_active = false;
        }

        const sortBy = SORTABLE_COLUMNS.has(params.sortBy) ? params.sortBy : 'name';
        const { rows, count } = await SaasPlanModel.findAndCountAll({
            where,
            offset,
            limit: params.size,
            order: [[sortBy, params.order]],
            distinct: true,
        });

        const plans = rows.map((row) => row.get({ plain: true }));
        const views = await this.attachLimits(plans);
        return { rows: views, count };
    }

    async findById(uuidPlan: string): Promise<SaasPlanView | null> {
        const row = await SaasPlanModel.findByPk(uuidPlan);
        if (!row) {
            return null;
        }
        const [view] = await this.attachLimits([row.get({ plain: true })]);
        return view ?? null;
    }

    async findByCode(code: string): Promise<SaasPlanView | null> {
        const row = await SaasPlanModel.findOne({ where: { code } });
        if (!row) {
            return null;
        }
        const [view] = await this.attachLimits([row.get({ plain: true })]);
        return view ?? null;
    }

    async findByCodes(codes: string[]): Promise<SaasPlanView[]> {
        if (codes.length === 0) {
            return [];
        }
        const rows = await SaasPlanModel.findAll({
            where: { code: { [Op.in]: codes } },
        });
        return this.attachLimits(rows.map((row) => row.get({ plain: true })));
    }

    async findLimitValue(code: string, resourceCode: string): Promise<number | null> {
        const plan = await SaasPlanModel.findOne({
            where: { code },
            attributes: ['uuid_plan'],
        });
        if (!plan) {
            return null;
        }
        const limit = await SaasPlanLimitModel.findOne({
            where: {
                uuid_plan: plan.uuid_plan,
                resource_code: resourceCode,
            },
        });
        if (!limit) {
            return null;
        }
        return limit.max_value;
    }

    async create(
        plan: SaasPlanCreationAttributes,
        limits: Array<{ resource_code: string; max_value: number }>
    ): Promise<SaasPlanView> {
        const created = await saasSequelize.transaction(async (transaction) => {
            const row = await SaasPlanModel.create(plan, { transaction });
            await this.replaceLimits(row.uuid_plan, limits, transaction);
            return row.get({ plain: true });
        });
        const [view] = await this.attachLimits([created]);
        return view;
    }

    async update(
        uuidPlan: string,
        plan: Partial<Pick<SaasPlanAttributes, 'name' | 'description' | 'annual_price' | 'currency' | 'is_active'>>,
        limits: Array<{ resource_code: string; max_value: number }>
    ): Promise<SaasPlanView | null> {
        const updated = await saasSequelize.transaction(async (transaction) => {
            const row = await SaasPlanModel.findByPk(uuidPlan, { transaction });
            if (!row) {
                return null;
            }
            await row.update(plan, { transaction });
            await this.replaceLimits(uuidPlan, limits, transaction);
            return row.get({ plain: true });
        });
        if (!updated) {
            return null;
        }
        const [view] = await this.attachLimits([updated]);
        return view;
    }

    private async replaceLimits(
        uuidPlan: string,
        limits: Array<{ resource_code: string; max_value: number }>,
        transaction: Transaction
    ): Promise<void> {
        for (const limit of limits) {
            const existing = await SaasPlanLimitModel.findOne({
                where: {
                    uuid_plan: uuidPlan,
                    resource_code: limit.resource_code,
                },
                transaction,
            });
            if (existing) {
                await existing.update({ max_value: limit.max_value }, { transaction });
            } else {
                await SaasPlanLimitModel.create(
                    {
                        uuid_plan: uuidPlan,
                        resource_code: limit.resource_code,
                        max_value: limit.max_value,
                    },
                    { transaction }
                );
            }
        }
    }

    private async attachLimits(plans: SaasPlanAttributes[]): Promise<SaasPlanView[]> {
        if (plans.length === 0) {
            return [];
        }
        const limits = await SaasPlanLimitModel.findAll({
            where: {
                uuid_plan: { [Op.in]: plans.map((plan) => plan.uuid_plan) },
                resource_code: { [Op.in]: [...SAAS_PLAN_RESOURCE_CODES] },
            },
        });
        const byPlan = new Map<string, SaasPlanLimitAttributes[]>();
        for (const limit of limits) {
            const plain = limit.get({ plain: true });
            const bucket = byPlan.get(plain.uuid_plan) ?? [];
            bucket.push(plain);
            byPlan.set(plain.uuid_plan, bucket);
        }
        return plans.map((plan) => toPlanView(plan, byPlan.get(plan.uuid_plan) ?? []));
    }
}

export default SaasPlanRepository;
