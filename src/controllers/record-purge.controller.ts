import { NextFunction, Response } from 'express';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import RecordPurgeService from '../services/record-purge.service';
import { buildGetAllParams } from '../utils/query.builder';
import { handleResponse } from '../utils/response.handler';

class RecordPurgeController {
    private readonly recordPurgeService: RecordPurgeService;

    constructor(recordPurgeService: RecordPurgeService) {
        this.recordPurgeService = recordPurgeService;
    }

    listAnimals = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const params = buildGetAllParams(req.query);
            const response = await this.recordPurgeService.listAnimalCandidates(
                params.page,
                params.size,
                params.search
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    listWorkSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const params = buildGetAllParams(req.query);
            const response = await this.recordPurgeService.listWorkSessionCandidates(
                params.page,
                params.size,
                params.search
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    purgeAnimal = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const animalUuid = String(req.params.animal_uuid ?? '');
            const response = await this.recordPurgeService.purgeAnimal(
                animalUuid,
                req.user?.username ?? ''
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    purgeWorkSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const sessionUuid = String(req.params.session_uuid ?? '');
            const response = await this.recordPurgeService.purgeWorkSession(
                sessionUuid,
                req.user?.username ?? ''
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    listAudits = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const params = buildGetAllParams(req.query);
            const response = await this.recordPurgeService.listAudits(params.page, params.size);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };
}

export default RecordPurgeController;
