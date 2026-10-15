import { Router } from 'express';
import { container } from '../containers/container';
import { authorize } from '../middlewares/authorization.middleware';
import { Permission } from '../constants/authorization.constants';

const livestockCategoryRoutes = Router();
const read = authorize(Permission.LIVESTOCK_CATEGORY_READ);
const write = authorize(Permission.LIVESTOCK_CATEGORY_WRITE);
const animalRead = authorize(Permission.ANIMAL_READ);
const animalWrite = authorize(Permission.ANIMAL_WRITE);

livestockCategoryRoutes.get('/categories', read, container.livestockCategoryController.listCategories);
livestockCategoryRoutes.post('/categories', write, container.livestockCategoryController.createCategory);
livestockCategoryRoutes.put('/categories/:category_uuid', write, container.livestockCategoryController.updateCategory);
livestockCategoryRoutes.post(
    '/categories/:category_uuid/deactivate',
    write,
    container.livestockCategoryController.deactivateCategory
);

livestockCategoryRoutes.get('/animals/:animal_uuid', animalRead, container.livestockCategoryController.listAnimalCategories);
livestockCategoryRoutes.get(
    '/animals/:animal_uuid/history',
    animalRead,
    container.livestockCategoryController.listAnimalHistory
);
livestockCategoryRoutes.post('/animals/:animal_uuid', animalWrite, container.livestockCategoryController.assignAnimalCategory);
livestockCategoryRoutes.delete(
    '/animals/:animal_uuid/:category_uuid',
    animalWrite,
    container.livestockCategoryController.removeAnimalCategory
);

export default livestockCategoryRoutes;
