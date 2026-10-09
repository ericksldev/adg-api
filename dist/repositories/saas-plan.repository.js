"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlanView = toPlanView;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../database"));
const saas_plan_model_1 = __importDefault(require("../database/models/saas-plan.model"));
const saas_plan_limit_model_1 = __importDefault(require("../database/models/saas-plan-limit.model"));
const saas_plan_constants_1 = require("../constants/saas-plan.constants");
const SORTABLE_COLUMNS = new Set(['name', 'code', 'annual_price', 'created_at', 'updated_at', 'is_active']);
function emptyLimits() {
    return {
        USERS: null,
        ANIMALS: null,
        ACTIVITY_RECORDS: null,
    };
}
function toNumber(value) {
    return Number(value);
}
function toPlanView(plan, limits) {
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
    async findAll(params) {
        const offset = (params.page - 1) * params.size;
        const where = {};
        if (params.status === 'active') {
            where.is_active = true;
        }
        else if (params.status === 'inactive') {
            where.is_active = false;
        }
        const sortBy = SORTABLE_COLUMNS.has(params.sortBy) ? params.sortBy : 'name';
        const { rows, count } = await saas_plan_model_1.default.findAndCountAll({
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
    async findById(uuidPlan) {
        const row = await saas_plan_model_1.default.findByPk(uuidPlan);
        if (!row) {
            return null;
        }
        const [view] = await this.attachLimits([row.get({ plain: true })]);
        return view ?? null;
    }
    async findByCode(code) {
        const row = await saas_plan_model_1.default.findOne({ where: { code } });
        if (!row) {
            return null;
        }
        const [view] = await this.attachLimits([row.get({ plain: true })]);
        return view ?? null;
    }
    async findByCodes(codes) {
        if (codes.length === 0) {
            return [];
        }
        const rows = await saas_plan_model_1.default.findAll({
            where: { code: { [sequelize_1.Op.in]: codes } },
        });
        return this.attachLimits(rows.map((row) => row.get({ plain: true })));
    }
    async findLimitValue(code, resourceCode) {
        const plan = await saas_plan_model_1.default.findOne({
            where: { code },
            attributes: ['uuid_plan'],
        });
        if (!plan) {
            return null;
        }
        const limit = await saas_plan_limit_model_1.default.findOne({
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
    async create(plan, limits) {
        const created = await database_1.default.transaction(async (transaction) => {
            const row = await saas_plan_model_1.default.create(plan, { transaction });
            await this.replaceLimits(row.uuid_plan, limits, transaction);
            return row.get({ plain: true });
        });
        const [view] = await this.attachLimits([created]);
        return view;
    }
    async update(uuidPlan, plan, limits) {
        const updated = await database_1.default.transaction(async (transaction) => {
            const row = await saas_plan_model_1.default.findByPk(uuidPlan, { transaction });
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
    async replaceLimits(uuidPlan, limits, transaction) {
        for (const limit of limits) {
            const existing = await saas_plan_limit_model_1.default.findOne({
                where: {
                    uuid_plan: uuidPlan,
                    resource_code: limit.resource_code,
                },
                transaction,
            });
            if (existing) {
                await existing.update({ max_value: limit.max_value }, { transaction });
            }
            else {
                await saas_plan_limit_model_1.default.create({
                    uuid_plan: uuidPlan,
                    resource_code: limit.resource_code,
                    max_value: limit.max_value,
                }, { transaction });
            }
        }
    }
    async attachLimits(plans) {
        if (plans.length === 0) {
            return [];
        }
        const limits = await saas_plan_limit_model_1.default.findAll({
            where: {
                uuid_plan: { [sequelize_1.Op.in]: plans.map((plan) => plan.uuid_plan) },
                resource_code: { [sequelize_1.Op.in]: [...saas_plan_constants_1.SAAS_PLAN_RESOURCE_CODES] },
            },
        });
        const byPlan = new Map();
        for (const limit of limits) {
            const plain = limit.get({ plain: true });
            const bucket = byPlan.get(plain.uuid_plan) ?? [];
            bucket.push(plain);
            byPlan.set(plain.uuid_plan, bucket);
        }
        return plans.map((plan) => toPlanView(plan, byPlan.get(plan.uuid_plan) ?? []));
    }
}
exports.default = SaasPlanRepository;
