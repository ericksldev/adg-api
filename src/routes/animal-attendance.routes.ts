import { Router } from 'express';
import { container } from '../containers/container';
import { authorize } from '../middlewares/authorization.middleware';
import { Permission } from '../constants/authorization.constants';

const animalAttendanceRoutes = Router();

animalAttendanceRoutes.get(
    '/',
    authorize(Permission.ANIMAL_READ),
    container.animalAttendanceController.review
);

export default animalAttendanceRoutes;
