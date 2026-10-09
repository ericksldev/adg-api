import { Router } from 'express';
import { container } from '../containers/container';
import { authorize } from '../middlewares/authorization.middleware';
import { Permission } from '../constants/authorization.constants';

const saasPlanRoutes = Router();

saasPlanRoutes.post(
    '/',
    authorize(Permission.SAAS_PLAN_WRITE),
    container.saasPlanController.create
);
saasPlanRoutes.get(
    '/:uuid_plan',
    authorize(Permission.SAAS_PLAN_READ),
    container.saasPlanController.getById
);
saasPlanRoutes.get(
    '/',
    authorize(Permission.SAAS_PLAN_READ),
    container.saasPlanController.getAll
);
saasPlanRoutes.put(
    '/:uuid_plan',
    authorize(Permission.SAAS_PLAN_WRITE),
    container.saasPlanController.update
);

export default saasPlanRoutes;
