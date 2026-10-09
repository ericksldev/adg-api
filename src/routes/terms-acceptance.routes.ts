import { Router } from 'express';
import { container } from '../containers/container';
import { authorize } from '../middlewares/authorization.middleware';
import { requireTermsAcceptance } from '../middlewares/terms-acceptance.middleware';
import { Permission } from '../constants/authorization.constants';

const termsAcceptanceController = container.termsAcceptanceController;
const requireCurrentTerms = requireTermsAcceptance(container.termsAcceptanceService);

/**
 * Status, current document and acceptance stay available before the terms gate.
 * Publishing a version requires the caller to have accepted the current terms.
 */
const termsRoutes = Router();

termsRoutes.get('/status', termsAcceptanceController.status);
termsRoutes.get('/current', termsAcceptanceController.current);
termsRoutes.post('/accept', termsAcceptanceController.accept);

termsRoutes.get(
    '/versions',
    requireCurrentTerms,
    authorize(Permission.TERMS_VERSION_READ),
    termsAcceptanceController.listVersions
);
termsRoutes.post(
    '/versions',
    requireCurrentTerms,
    authorize(Permission.TERMS_VERSION_WRITE),
    termsAcceptanceController.createVersion
);
termsRoutes.post(
    '/versions/:uuid_terms_version/publish',
    requireCurrentTerms,
    authorize(Permission.TERMS_VERSION_WRITE),
    termsAcceptanceController.publishVersion
);

export default termsRoutes;
