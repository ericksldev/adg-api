import { Response, NextFunction } from 'express';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import { handleResponse } from '../utils/response.handler';
import LivestockCategoryService from '../services/livestock-category.service';
import { tenantRequestStorage } from '../database/tenant/tenant-request-context';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';

class LivestockCategoryController {
    constructor(private readonly livestockCategoryService: LivestockCategoryService) {}

    listCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.livestockCategoryService.listCategories(
                this.actor(req),
                req.query.includeInactive === 'true'
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.livestockCategoryService.createCategory(this.actor(req), req.body ?? {});
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.livestockCategoryService.updateCategory(
                this.actor(req),
                this.uuidParam(req.params.category_uuid, 'category_uuid'),
                req.body ?? {}
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    deactivateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.livestockCategoryService.deactivateCategory(
                this.actor(req),
                this.uuidParam(req.params.category_uuid, 'category_uuid')
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    listAnimalCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.livestockCategoryService.listAnimalCategories(
                this.actor(req),
                this.uuidParam(req.params.animal_uuid, 'animal_uuid')
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    listAnimalHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.livestockCategoryService.listAnimalHistory(
                this.actor(req),
                this.uuidParam(req.params.animal_uuid, 'animal_uuid')
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    assignAnimalCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = req.body ?? {};
            const response = await this.livestockCategoryService.assign(
                this.actor(req),
                this.uuidParam(req.params.animal_uuid, 'animal_uuid'),
                this.uuidParam(body.category_uuid, 'category_uuid'),
                typeof body.reason === 'string' ? body.reason : null
            );
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    removeAnimalCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = req.body ?? {};
            const response = await this.livestockCategoryService.remove(
                this.actor(req),
                this.uuidParam(req.params.animal_uuid, 'animal_uuid'),
                this.uuidParam(req.params.category_uuid, 'category_uuid'),
                typeof body.reason === 'string' ? body.reason : null
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    private actor(req: AuthRequest) {
        const uuidCompany = tenantRequestStorage.getStore()?.uuid_company ?? req.user?.uuid_company;
        if (!uuidCompany) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'uuid_company is required',
            });
        }
        return { uuid_company: uuidCompany, uuid_user: req.user?.sub };
    }

    private uuidParam(value: unknown, field: string): string {
        const text = typeof value === 'string' ? value.trim() : '';
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `${field} must be a UUID`,
            });
        }
        return text;
    }
}

export default LivestockCategoryController;
