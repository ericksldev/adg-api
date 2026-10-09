"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = exports.membershipRepository = void 0;
const user_services_1 = __importDefault(require("../services/user.services"));
const user_repository_1 = __importDefault(require("../repositories/user.repository"));
const company_repository_1 = __importDefault(require("../repositories/company.repository"));
const company_service_1 = __importDefault(require("../services/company.service"));
const user_controller_1 = __importDefault(require("../controllers/user.controller"));
const company_controller_1 = __importDefault(require("../controllers/company.controller"));
const ranch_repository_1 = __importDefault(require("../repositories/ranch.repository"));
const ranch_service_1 = __importDefault(require("../services/ranch.service"));
const animal_repository_1 = __importDefault(require("../repositories/animal.repository"));
const animal_service_1 = __importDefault(require("../services/animal.service"));
const animal_controller_1 = __importDefault(require("../controllers/animal.controller"));
const ranch_controller_1 = __importDefault(require("../controllers/ranch.controller"));
const animal_work_session_repository_1 = __importDefault(require("../repositories/animal-work-session.repository"));
const animal_work_session_service_1 = __importDefault(require("../services/animal-work-session.service"));
const animal_work_session_controller_1 = __importDefault(require("../controllers/animal-work-session.controller"));
const corral_session_repository_1 = __importDefault(require("../repositories/corral-session.repository"));
const corral_session_history_sync_service_1 = __importDefault(require("../services/corral-session-history-sync.service"));
const corral_work_session_service_1 = __importDefault(require("../services/corral-work-session.service"));
const animal_movement_repository_1 = __importDefault(require("../repositories/animal-movement.repository"));
const animal_movement_service_1 = __importDefault(require("../services/animal-movement.service"));
const corral_work_session_controller_1 = __importDefault(require("../controllers/corral-work-session.controller"));
const authentication_repository_1 = __importDefault(require("../repositories/authentication.repository"));
const authentication_controller_1 = __importDefault(require("../controllers/authentication.controller"));
const authentication_service_1 = __importDefault(require("../services/authentication.service"));
const session_service_1 = __importDefault(require("../services/session.service"));
const session_repository_1 = __importDefault(require("../repositories/session.repository"));
const password_validator_service_1 = __importDefault(require("../services/password/password-validator.service"));
const membership_repository_1 = __importDefault(require("../repositories/membership.repository"));
const membership_service_1 = __importDefault(require("../services/membership.service"));
const membership_controller_1 = __importDefault(require("../controllers/membership.controller"));
const tenant_provisioning_service_1 = __importDefault(require("../services/tenant-provisioning.service"));
const reference_sample_repository_1 = __importDefault(require("../repositories/reference-sample.repository"));
const reference_sample_service_1 = __importDefault(require("../services/reference-sample.service"));
const reference_sample_controller_1 = __importDefault(require("../controllers/reference-sample.controller"));
const company_payment_repository_1 = __importDefault(require("../repositories/company-payment.repository"));
const company_payment_service_1 = __importDefault(require("../services/company-payment.service"));
const company_payment_controller_1 = __importDefault(require("../controllers/company-payment.controller"));
const owner_repository_1 = __importDefault(require("../repositories/owner.repository"));
const owner_service_1 = __importDefault(require("../services/owner.service"));
const owner_controller_1 = __importDefault(require("../controllers/owner.controller"));
const paddock_repository_1 = __importDefault(require("../repositories/paddock.repository"));
const paddock_service_1 = __importDefault(require("../services/paddock.service"));
const paddock_controller_1 = __importDefault(require("../controllers/paddock.controller"));
const health_service_1 = __importDefault(require("../services/health.service"));
const health_controller_1 = __importDefault(require("../controllers/health.controller"));
const animal_attendance_repository_1 = __importDefault(require("../repositories/animal-attendance.repository"));
const animal_attendance_service_1 = __importDefault(require("../services/animal-attendance.service"));
const animal_attendance_controller_1 = __importDefault(require("../controllers/animal-attendance.controller"));
const saas_plan_repository_1 = __importDefault(require("../repositories/saas-plan.repository"));
const saas_plan_service_1 = __importDefault(require("../services/saas-plan.service"));
const saas_plan_controller_1 = __importDefault(require("../controllers/saas-plan.controller"));
const terms_acceptance_repository_1 = __importDefault(require("../repositories/terms-acceptance.repository"));
const terms_acceptance_service_1 = __importDefault(require("../services/terms-acceptance.service"));
const terms_acceptance_controller_1 = __importDefault(require("../controllers/terms-acceptance.controller"));
const record_purge_repository_1 = __importDefault(require("../repositories/record-purge.repository"));
const record_purge_service_1 = __importDefault(require("../services/record-purge.service"));
const record_purge_controller_1 = __importDefault(require("../controllers/record-purge.controller"));
//Repositories
const companyRepository = new company_repository_1.default();
const userRepository = new user_repository_1.default();
const ranchRepository = new ranch_repository_1.default();
const animalRepository = new animal_repository_1.default();
const animalWorkSessionRepository = new animal_work_session_repository_1.default();
const corralSessionRepository = new corral_session_repository_1.default();
const corralSessionHistorySyncService = new corral_session_history_sync_service_1.default();
const animalMovementRepository = new animal_movement_repository_1.default();
const animalMovementService = new animal_movement_service_1.default(animalMovementRepository);
const sessionRepository = new session_repository_1.default();
const authenticationRepository = new authentication_repository_1.default();
const membershipRepository = new membership_repository_1.default();
exports.membershipRepository = membershipRepository;
const referenceSampleRepository = new reference_sample_repository_1.default();
const companyPaymentRepository = new company_payment_repository_1.default();
const saasPlanRepository = new saas_plan_repository_1.default();
const ownerRepository = new owner_repository_1.default();
const paddockRepository = new paddock_repository_1.default();
//Services
const passwordValidatorService = new password_validator_service_1.default();
const tenantProvisioningService = new tenant_provisioning_service_1.default();
const saasPlanService = new saas_plan_service_1.default(saasPlanRepository, companyRepository);
const companyService = new company_service_1.default(companyRepository, companyPaymentRepository, tenantProvisioningService, saasPlanService);
const userService = new user_services_1.default(userRepository, userRepository, companyService, passwordValidatorService, saasPlanService);
const paddockService = new paddock_service_1.default(paddockRepository, ranchRepository);
const ranchService = new ranch_service_1.default(ranchRepository, paddockRepository);
const animalService = new animal_service_1.default(animalRepository, companyService, saasPlanService);
const animalWorkSessionService = new animal_work_session_service_1.default(animalWorkSessionRepository);
const corralWorkSessionService = new corral_work_session_service_1.default(corralSessionRepository, corralSessionHistorySyncService, animalMovementService, saasPlanService);
const sessionService = new session_service_1.default(sessionRepository);
const termsAcceptanceRepository = new terms_acceptance_repository_1.default();
const termsAcceptanceService = new terms_acceptance_service_1.default(termsAcceptanceRepository);
const authenticationService = new authentication_service_1.default(authenticationRepository, sessionService, userService, membershipRepository, termsAcceptanceService);
const membershipService = new membership_service_1.default(userService, ranchService);
const referenceSampleService = new reference_sample_service_1.default(referenceSampleRepository);
const companyPaymentService = new company_payment_service_1.default(companyPaymentRepository, companyService, saasPlanService);
const ownerService = new owner_service_1.default(ownerRepository);
const healthService = new health_service_1.default();
const animalAttendanceRepository = new animal_attendance_repository_1.default();
const animalAttendanceService = new animal_attendance_service_1.default(animalAttendanceRepository);
const recordPurgeRepository = new record_purge_repository_1.default();
const recordPurgeService = new record_purge_service_1.default(recordPurgeRepository);
//Controllers
const userController = new user_controller_1.default(userService, userService);
const companyController = new company_controller_1.default(companyService);
const animalController = new animal_controller_1.default(animalService);
const ranchController = new ranch_controller_1.default(ranchService);
const animalWorkSessionController = new animal_work_session_controller_1.default(animalWorkSessionService);
const corralWorkSessionController = new corral_work_session_controller_1.default(corralWorkSessionService);
const authenticationController = new authentication_controller_1.default(authenticationService);
const membershipController = new membership_controller_1.default(membershipService);
const referenceSampleController = new reference_sample_controller_1.default(referenceSampleService);
const companyPaymentController = new company_payment_controller_1.default(companyPaymentService);
const ownerController = new owner_controller_1.default(ownerService);
const paddockController = new paddock_controller_1.default(paddockService);
const healthController = new health_controller_1.default(healthService);
const animalAttendanceController = new animal_attendance_controller_1.default(animalAttendanceService);
const saasPlanController = new saas_plan_controller_1.default(saasPlanService);
const termsAcceptanceController = new terms_acceptance_controller_1.default(termsAcceptanceService);
const recordPurgeController = new record_purge_controller_1.default(recordPurgeService);
exports.container = {
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
};
