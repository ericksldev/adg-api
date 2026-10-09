import { Router } from 'express';
import { container } from '../containers/container';
import { Permission } from '../constants/authorization.constants';
import { authorize } from '../middlewares/authorization.middleware';

const recordPurgeRoutes = Router();

recordPurgeRoutes.get(
    '/animals',
    authorize(Permission.RECORD_PURGE_READ),
    container.recordPurgeController.listAnimals
);
recordPurgeRoutes.delete(
    '/animals/:animal_uuid',
    authorize(Permission.RECORD_PURGE_WRITE),
    container.recordPurgeController.purgeAnimal
);
recordPurgeRoutes.get(
    '/work-sessions',
    authorize(Permission.RECORD_PURGE_READ),
    container.recordPurgeController.listWorkSessions
);
recordPurgeRoutes.delete(
    '/work-sessions/:session_uuid',
    authorize(Permission.RECORD_PURGE_WRITE),
    container.recordPurgeController.purgeWorkSession
);
recordPurgeRoutes.get(
    '/audits',
    authorize(Permission.RECORD_PURGE_READ),
    container.recordPurgeController.listAudits
);

export default recordPurgeRoutes;
