import UserService from "../services/user.services";
import UserRepository from "../repositories/user.repository";
import CompanyRepository from "../repositories/company.repository";
import CompanyService from "../services/company.service";
import UserController from "../controllers/user.controller";
import CompanyController from "../controllers/company.controller";
import RanchRepository from "../repositories/ranch.repository";
import RanchService from "../services/ranch.service";
import AnimalRepository from "../repositories/animal.repository";
import AnimalService from "../services/animal.service";
import AnimalController from "../controllers/animal.controller";
import RanchController from "../controllers/ranch.controller";
import AnimalWorkSessionRepository from "../repositories/animal-work-session.repository";
import AnimalWorkSessionService from "../services/animal-work-session.service";
import AnimalWorkSessionController from "../controllers/animal-work-session.controller";
import CorralSessionRepository from "../repositories/corral-session.repository";
import CorralSessionHistorySyncService from "../services/corral-session-history-sync.service";
import CorralWorkSessionService from "../services/corral-work-session.service";
import AnimalMovementRepository from "../repositories/animal-movement.repository";
import AnimalMovementService from "../services/animal-movement.service";
import CorralWorkSessionController from "../controllers/corral-work-session.controller";
import AuthenticationRepository from "../repositories/authentication.repository";
import AuthenticationController from "../controllers/authentication.controller";
import AuthenticationService from "../services/authentication.service";
import SessionService from "../services/session.service";
import SessionRepository from "../repositories/session.repository";
import PasswordValidatorService from "../services/password/password-validator.service";
import MembershipRepository from "../repositories/membership.repository";
import MembershipService from "../services/membership.service";
import MembershipController from "../controllers/membership.controller";
import TenantProvisioningService from "../services/tenant-provisioning.service";
import ReferenceSampleRepository from "../repositories/reference-sample.repository";
import ReferenceSampleService from "../services/reference-sample.service";
import ReferenceSampleController from "../controllers/reference-sample.controller";
import CompanyPaymentRepository from "../repositories/company-payment.repository";
import CompanyPaymentService from "../services/company-payment.service";
import CompanyPaymentController from "../controllers/company-payment.controller";
import OwnerRepository from "../repositories/owner.repository";
import OwnerService from "../services/owner.service";
import OwnerController from "../controllers/owner.controller";
import PaddockRepository from "../repositories/paddock.repository";
import PaddockService from "../services/paddock.service";
import PaddockController from "../controllers/paddock.controller";
import HealthService from "../services/health.service";
import HealthController from "../controllers/health.controller";
import AnimalAttendanceRepository from "../repositories/animal-attendance.repository";
import AnimalAttendanceService from "../services/animal-attendance.service";
import AnimalAttendanceController from "../controllers/animal-attendance.controller";
import SaasPlanRepository from "../repositories/saas-plan.repository";
import SaasPlanService from "../services/saas-plan.service";
import SaasPlanController from "../controllers/saas-plan.controller";
import TermsAcceptanceRepository from "../repositories/terms-acceptance.repository";
import TermsAcceptanceService from "../services/terms-acceptance.service";
import TermsAcceptanceController from "../controllers/terms-acceptance.controller";
import RecordPurgeRepository from "../repositories/record-purge.repository";
import RecordPurgeService from "../services/record-purge.service";
import RecordPurgeController from "../controllers/record-purge.controller";

//Repositories
const companyRepository = new CompanyRepository();
const userRepository = new UserRepository();
const ranchRepository = new RanchRepository();
const animalRepository = new AnimalRepository();
const animalWorkSessionRepository = new AnimalWorkSessionRepository();
const corralSessionRepository = new CorralSessionRepository();
const corralSessionHistorySyncService = new CorralSessionHistorySyncService();
const animalMovementRepository = new AnimalMovementRepository();
const animalMovementService = new AnimalMovementService(animalMovementRepository);
const sessionRepository = new SessionRepository();
const authenticationRepository = new AuthenticationRepository();
const membershipRepository = new MembershipRepository();
const referenceSampleRepository = new ReferenceSampleRepository();
const companyPaymentRepository = new CompanyPaymentRepository();
const saasPlanRepository = new SaasPlanRepository();
const ownerRepository = new OwnerRepository();
const paddockRepository = new PaddockRepository();

//Services
const passwordValidatorService = new PasswordValidatorService();
const tenantProvisioningService = new TenantProvisioningService();
const saasPlanService = new SaasPlanService(saasPlanRepository, companyRepository);
const companyService = new CompanyService(
    companyRepository,
    companyPaymentRepository,
    tenantProvisioningService,
    saasPlanService
);
const userService = new UserService(
    userRepository,
    userRepository,
    companyService,
    passwordValidatorService,
    saasPlanService
);
const paddockService = new PaddockService(paddockRepository, ranchRepository);
const ranchService = new RanchService(ranchRepository, paddockRepository);
const animalService = new AnimalService(animalRepository, companyService, saasPlanService);
const animalWorkSessionService = new AnimalWorkSessionService(animalWorkSessionRepository);
const corralWorkSessionService = new CorralWorkSessionService(
    corralSessionRepository,
    corralSessionHistorySyncService,
    animalMovementService,
    saasPlanService
);
const sessionService = new SessionService(sessionRepository);
const termsAcceptanceRepository = new TermsAcceptanceRepository();
const termsAcceptanceService = new TermsAcceptanceService(termsAcceptanceRepository);
const authenticationService = new AuthenticationService(
    authenticationRepository,
    sessionService,
    userService,
    membershipRepository,
    termsAcceptanceService
);
const membershipService = new MembershipService(userService, ranchService);
const referenceSampleService = new ReferenceSampleService(referenceSampleRepository);
const companyPaymentService = new CompanyPaymentService(
    companyPaymentRepository,
    companyService,
    saasPlanService
);
const ownerService = new OwnerService(ownerRepository);
const healthService = new HealthService();
const animalAttendanceRepository = new AnimalAttendanceRepository();
const animalAttendanceService = new AnimalAttendanceService(animalAttendanceRepository);
const recordPurgeRepository = new RecordPurgeRepository();
const recordPurgeService = new RecordPurgeService(recordPurgeRepository);

//Controllers
const userController = new UserController(userService, userService);
const companyController = new CompanyController(companyService);
const animalController = new AnimalController(animalService);
const ranchController = new RanchController(ranchService);
const animalWorkSessionController = new AnimalWorkSessionController(animalWorkSessionService);
const corralWorkSessionController = new CorralWorkSessionController(corralWorkSessionService);
const authenticationController = new AuthenticationController(authenticationService);
const membershipController = new MembershipController(membershipService);
const referenceSampleController = new ReferenceSampleController(referenceSampleService);
const companyPaymentController = new CompanyPaymentController(companyPaymentService);
const ownerController = new OwnerController(ownerService);
const paddockController = new PaddockController(paddockService);
const healthController = new HealthController(healthService);
const animalAttendanceController = new AnimalAttendanceController(animalAttendanceService);
const saasPlanController = new SaasPlanController(saasPlanService);
const termsAcceptanceController = new TermsAcceptanceController(termsAcceptanceService);
const recordPurgeController = new RecordPurgeController(recordPurgeService);

export { membershipRepository };

export const container = {
    userController,
    companyController,
    animalController,
    ranchController,
    animalWorkSessionController,
    corralWorkSessionController,
    authenticationController,
    membershipController,
    referenceSampleController,
    companyPaymentController,
    ownerController,
    paddockController,
    healthController,
    animalAttendanceController,
    saasPlanController,
    termsAcceptanceController,
    termsAcceptanceService,
    recordPurgeController
}