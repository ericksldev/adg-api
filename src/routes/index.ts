import { Router } from 'express';
import userRoutes from "./user.routes";
import companyRoutes from "./company.routes";
import animalRoutes from "./animal.routes";
import animalWorkSessionRoutes from "./animal-work-session.routes";
import corralWorkSessionRoutes from "./corral-work-session.routes";
import authenticationRoutes from "./authentication.routes";
import ranchRoutes from "./ranch.routes";
import membershipRoutes from "./membership.routes";
import { authenticate } from "../middlewares/auth.middleware";
import { resolveTenantOperationalContext } from "../middlewares/tenant-context.middleware";
import ownerRoutes from "./owner.routes";
import paddockRoutes from "./paddock.routes";
import referenceSampleRoutes from "./reference-sample.routes";
import healthRoutes from "./health.routes";
import animalAttendanceRoutes from "./animal-attendance.routes";
import saasPlanRoutes from "./saas-plan.routes";
import termsRoutes from "./terms-acceptance.routes";
import recordPurgeRoutes from "./record-purge.routes";
import { container } from "../containers/container";
import { requireTermsAcceptance } from "../middlewares/terms-acceptance.middleware";

const router = Router();

router.use('/health', healthRoutes);
router.use('/session', authenticationRoutes);
router.use(authenticate);

router.use('/terms', termsRoutes);
router.use(requireTermsAcceptance(container.termsAcceptanceService));

/** SaaS-only routes: must not run `resolveTenantOperationalContext` (no tenant DB for list endpoints). */
router.use('/reference-sample', referenceSampleRoutes);
router.use('/user', userRoutes);
router.use('/company', companyRoutes);
router.use('/saas-plan', saasPlanRoutes);

const operationalRouter = Router({ mergeParams: true });
operationalRouter.use(resolveTenantOperationalContext);
operationalRouter.use('/ranch', ranchRoutes);
operationalRouter.use('/animal', animalRoutes);
operationalRouter.use('/animal-attendance', animalAttendanceRoutes);
operationalRouter.use('/owner', ownerRoutes);
operationalRouter.use('/paddock', paddockRoutes);
operationalRouter.use('/animal-work-session', animalWorkSessionRoutes);
operationalRouter.use('/corral-work-session', corralWorkSessionRoutes);
operationalRouter.use('/membership', membershipRoutes);
operationalRouter.use('/record-purge', recordPurgeRoutes);

router.use(operationalRouter);

export default router;
