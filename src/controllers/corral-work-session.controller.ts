import { Request, Response, NextFunction } from 'express';
import { handleResponse } from '../utils/response.handler';
import { buildGetAllParams } from '../utils/query.builder';
import CorralWorkSessionService from '../services/corral-work-session.service';
import {
    ConfigureCorralWorkBody,
    CreateCorralWorkSessionBody,
    SaveCorralStepGridBody,
    ScanCorralStepAnimalBody,
    UpsertCorralFindingBody,
    CorralSessionAnimalsLoadBody,
    UpdateCorralStepWorkModeBody,
    AppendCorralStepAnimalsBody,
    ApplyPaddockDistributionBody,
} from '../interfaces/corral-session/corral-session.interface';
import { CorralActivityCode } from '../constants/corral-work.constants';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';

class CorralWorkSessionController {
    private readonly service: CorralWorkSessionService;

    constructor(service: CorralWorkSessionService) {
        this.service = service;
    }

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const base = buildGetAllParams(req.query);
            const response = await this.service.getAll({
                page: base.page,
                size: base.size,
                sortBy: base.sortBy,
                order: base.order,
                ranch_uuid: typeof req.query.ranch_uuid === 'string' ? req.query.ranch_uuid : undefined,
                status: typeof req.query.status === 'string' ? req.query.status : undefined,
                work_date: typeof req.query.work_date === 'string' ? req.query.work_date : undefined,
                activity_code:
                    typeof req.query.activity_code === 'string'
                        ? (req.query.activity_code as CorralActivityCode)
                        : undefined,
            });
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    listPendingAnimalRegistrations = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ranchUuid = typeof req.query.ranch_uuid === 'string' ? req.query.ranch_uuid : undefined;
            const response = await this.service.listPendingAnimalRegistrations(ranchUuid);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.service.getById(req.params.uuid_corral_work_session);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    getWorkspace = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.service.getWorkspace(req.params.uuid_corral_work_session);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    create = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = req.body as CreateCorralWorkSessionBody;
            if (req.user?.username) {
                body.created_by = req.user.username;
            }
            const response = await this.service.create(body);
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    configureWork = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as ConfigureCorralWorkBody;
            const response = await this.service.configureWork(req.params.uuid_corral_work_session, body);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    extendWorkConfiguration = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as ConfigureCorralWorkBody;
            const response = await this.service.extendWorkConfiguration(
                req.params.uuid_corral_work_session,
                body
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    scanStepAnimal = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as ScanCorralStepAnimalBody;
            const response = await this.service.scanStepAnimal(
                req.params.uuid_corral_work_session,
                req.params.uuid_corral_session_step,
                body
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    addUnregisteredStepAnimal = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as ScanCorralStepAnimalBody;
            const response = await this.service.addUnregisteredStepAnimal(
                req.params.uuid_corral_work_session,
                req.params.uuid_corral_session_step,
                body
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    previewAnimals = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as CorralSessionAnimalsLoadBody;
            const response = await this.service.previewAnimals(req.params.uuid_corral_work_session, body);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    loadAnimals = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as CorralSessionAnimalsLoadBody;
            const response = await this.service.loadAnimals(req.params.uuid_corral_work_session, body);
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    updateStepWorkMode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as UpdateCorralStepWorkModeBody;
            const response = await this.service.updateStepWorkMode(
                req.params.uuid_corral_work_session,
                req.params.uuid_corral_session_step,
                body
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    appendAnimalsToStep = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as AppendCorralStepAnimalsBody;
            const response = await this.service.appendAnimalsToStep(
                req.params.uuid_corral_work_session,
                req.params.uuid_corral_session_step,
                body
            );
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    start = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.service.start(req.params.uuid_corral_work_session);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    close = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.service.close(req.params.uuid_corral_work_session);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    applyPaddockDistribution = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as ApplyPaddockDistributionBody;
            const response = await this.service.applyPaddockDistribution(
                req.params.uuid_corral_work_session,
                req.params.uuid_corral_session_step,
                body
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    saveStepGrid = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as SaveCorralStepGridBody;
            const response = await this.service.saveStepGrid(
                req.params.uuid_corral_work_session,
                req.params.uuid_corral_session_step,
                body
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    getAnimalWorkHistory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const response = await this.service.getAnimalWorkHistory(
                req.params.uuid_corral_work_session,
                req.params.animal_uuid
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    lookupAnimal = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const identifier = typeof req.query.identifier === 'string' ? req.query.identifier : '';
            const response = await this.service.lookupAnimal(req.params.uuid_corral_work_session, identifier);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    upsertFinding = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as UpsertCorralFindingBody;
            const response = await this.service.upsertFinding(req.params.uuid_corral_work_session, body);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };
}

export default CorralWorkSessionController;
