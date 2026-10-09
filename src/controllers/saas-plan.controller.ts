import { Response, NextFunction } from 'express';
import { handleResponse } from '../utils/response.handler';
import { buildGetAllParams } from '../utils/query.builder';
import { IBaseParams } from '../interfaces/params/query.interface';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import SaasPlanService from '../services/saas-plan.service';
import { SaasPlanWriteBody } from '../interfaces/saas-plan/saas-plan.interface';

class SaasPlanController {
    private readonly saasPlanService: SaasPlanService;

    constructor(saasPlanService: SaasPlanService) {
        this.saasPlanService = saasPlanService;
    }

    create = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.saasPlanService.create(req.body as SaasPlanWriteBody);
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.saasPlanService.getById(req.params.uuid_plan);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const params: IBaseParams = buildGetAllParams(req.query);
            if (!req.query.sortBy) {
                params.sortBy = 'name';
                params.order = 'ASC';
            }
            const response = await this.saasPlanService.getAll(params);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    update = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.saasPlanService.update(req.params.uuid_plan, req.body as SaasPlanWriteBody);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };
}

export default SaasPlanController;
