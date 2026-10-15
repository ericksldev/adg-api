import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import { ServiceResponse } from '../interfaces/common/service-response.interface';
import LivestockCategoryRepository, { AnimalCategoryRow } from '../repositories/livestock-category.repository';

const CATEGORY_TYPES = ['PRODUCTIVE', 'SELECTION', 'CUSTOM'] as const;

export interface LivestockActorContext {
    uuid_company: string;
    uuid_user?: string;
}

class LivestockCategoryService {
    constructor(private readonly repository: LivestockCategoryRepository) {}

    async listCategories(context: LivestockActorContext, includeInactive: boolean): Promise<ServiceResponse<unknown>> {
        await this.repository.ensureSystemCategories();
        const data = await this.repository.listCategories(context.uuid_company, includeInactive);
        return { success: true, data };
    }

    async createCategory(
        context: LivestockActorContext,
        body: { name?: string; description?: string | null; category_type?: string }
    ): Promise<ServiceResponse<unknown>> {
        await this.repository.ensureSystemCategories();
        const name = this.requireName(body.name);
        const categoryType = this.requireCategoryType(body.category_type);
        await this.assertNameAvailable(context.uuid_company, name);
        const data = await this.repository.createCategory({
            uuid_company: context.uuid_company,
            name,
            description: this.optionalText(body.description),
            category_type: categoryType,
        });
        return { success: true, data };
    }

    async updateCategory(
        context: LivestockActorContext,
        categoryUuid: string,
        body: { name?: string; description?: string | null; category_type?: string; is_active?: boolean }
    ): Promise<ServiceResponse<unknown>> {
        const category = await this.requireVisibleCategory(context.uuid_company, categoryUuid, true);
        if (category.is_system && (body.name != null || body.description != null || body.category_type != null)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'System categories cannot be renamed. Deactivate them or create a company category.',
            });
        }
        const values: { name?: string; description?: string | null; category_type?: string; is_active?: boolean } = {};
        if (body.name != null) {
            values.name = this.requireName(body.name);
            await this.assertNameAvailable(context.uuid_company, values.name, category.category_uuid);
        }
        if (body.description !== undefined) {
            values.description = this.optionalText(body.description);
        }
        if (body.category_type != null) {
            values.category_type = this.requireCategoryType(body.category_type);
        }
        if (body.is_active != null) {
            values.is_active = Boolean(body.is_active);
        }
        const data = await this.repository.updateCategory(categoryUuid, values);
        return { success: true, data };
    }

    async deactivateCategory(context: LivestockActorContext, categoryUuid: string): Promise<ServiceResponse<unknown>> {
        const category = await this.requireVisibleCategory(context.uuid_company, categoryUuid, true);
        const activeAssignments = await this.repository.countAssignments(categoryUuid);
        const data = await this.repository.updateCategory(category.category_uuid, { is_active: false });
        return { success: true, data: { category: data, active_assignments: activeAssignments } };
    }

    async listAnimalCategories(context: LivestockActorContext, animalUuid: string): Promise<ServiceResponse<unknown>> {
        await this.assertAnimal(context.uuid_company, animalUuid);
        const data = await this.repository.listCurrent(animalUuid);
        return { success: true, data };
    }

    async listAnimalHistory(context: LivestockActorContext, animalUuid: string): Promise<ServiceResponse<unknown>> {
        await this.assertAnimal(context.uuid_company, animalUuid);
        const data = await this.repository.listHistory(animalUuid);
        return { success: true, data };
    }

    async labelsForAnimals(context: LivestockActorContext, animalUuids: string[]): Promise<Map<string, AnimalCategoryRow[]>> {
        if (!context.uuid_company || animalUuids.length === 0) {
            return new Map();
        }
        return this.repository.listCurrentForAnimals(animalUuids);
    }

    async assign(
        context: LivestockActorContext,
        animalUuid: string,
        categoryUuid: string,
        reason?: string | null
    ): Promise<ServiceResponse<unknown>> {
        await this.assertAnimal(context.uuid_company, animalUuid);
        const category = await this.requireVisibleCategory(context.uuid_company, categoryUuid, false);
        const result = await this.repository.assign({
            animalUuid,
            categoryUuid: category.category_uuid,
            uuidUser: context.uuid_user,
            reason,
        });
        return { success: true, data: { status: result } };
    }

    async remove(
        context: LivestockActorContext,
        animalUuid: string,
        categoryUuid: string,
        reason?: string | null
    ): Promise<ServiceResponse<unknown>> {
        await this.assertAnimal(context.uuid_company, animalUuid);
        await this.requireVisibleCategory(context.uuid_company, categoryUuid, true);
        await this.repository.remove({
            animalUuid,
            categoryUuid,
            uuidUser: context.uuid_user,
            reason,
        });
        return { success: true, data: null };
    }

    private async assertAnimal(uuidCompany: string, animalUuid: string): Promise<void> {
        const animal = await this.repository.findAnimal(animalUuid);
        if (!animal) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found',
            });
        }
        const ranchCompany = await this.repository.findRanchCompany(animal.ranch_uuid);
        if (ranchCompany !== uuidCompany) {
            throw new ApiError({
                name: 'Forbidden',
                statusCode: HttpStatusCodes.FORBIDDEN,
                description: 'Animal is outside your company',
            });
        }
    }

    private async requireVisibleCategory(uuidCompany: string, categoryUuid: string, allowInactive: boolean) {
        const category = await this.repository.findCategory(categoryUuid);
        const visible = category != null && (category.is_system || category.uuid_company === uuidCompany);
        if (!category || !visible || (!allowInactive && !category.is_active)) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Livestock category not found',
            });
        }
        if (!allowInactive && !category.is_active) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Inactive categories cannot be assigned',
            });
        }
        return category;
    }

    private async assertNameAvailable(uuidCompany: string, name: string, ignoreUuid?: string): Promise<void> {
        const existing = await this.repository.findCategoryByName(uuidCompany, name);
        if (existing && existing.category_uuid !== ignoreUuid) {
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
                description: 'A category with this name already exists',
            });
        }
    }

    private requireName(value: string | undefined): string {
        const name = value?.trim() ?? '';
        if (name.length < 2 || name.length > 128) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Category name must be between 2 and 128 characters',
            });
        }
        return name;
    }

    private requireCategoryType(value: string | undefined): string {
        const categoryType = value?.trim().toUpperCase() ?? '';
        if (!CATEGORY_TYPES.includes(categoryType as (typeof CATEGORY_TYPES)[number])) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'category_type must be PRODUCTIVE, SELECTION, or CUSTOM',
            });
        }
        return categoryType;
    }

    private optionalText(value: string | null | undefined): string | null {
        if (value == null) {
            return null;
        }
        const text = value.trim();
        return text === '' ? null : text;
    }
}

export default LivestockCategoryService;
