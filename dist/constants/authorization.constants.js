"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_ROLE_MAP = exports.Permission = void 0;
const roles_interface_1 = require("../interfaces/roles/roles.interface");
var Permission;
(function (Permission) {
    /** Listar / operar todas las compañías (solo SaaS). */
    Permission["COMPANY_READ"] = "COMPANY_READ";
    /** Alta / baja global de compañía (solo SaaS). */
    Permission["COMPANY_WRITE"] = "COMPANY_WRITE";
    /** Ver compañía concreta, pagos, etc. (SaaS o administrador de esa compañía). */
    Permission["COMPANY_TENANT_READ"] = "COMPANY_TENANT_READ";
    /** Actualizar datos de la propia compañía y pagos (SaaS o administrador de esa compañía). */
    Permission["COMPANY_TENANT_WRITE"] = "COMPANY_TENANT_WRITE";
    Permission["USER_READ"] = "USER_READ";
    Permission["USER_WRITE"] = "USER_WRITE";
    Permission["RANCH_READ"] = "RANCH_READ";
    /** Crear / editar / eliminar rancho (solo SaaS y administrador). */
    Permission["RANCH_WRITE"] = "RANCH_WRITE";
    Permission["PADDOCK_READ"] = "PADDOCK_READ";
    Permission["PADDOCK_WRITE"] = "PADDOCK_WRITE";
    Permission["OWNER_READ"] = "OWNER_READ";
    Permission["OWNER_WRITE"] = "OWNER_WRITE";
    Permission["MEMBERSHIP_READ"] = "MEMBERSHIP_READ";
    Permission["MEMBERSHIP_WRITE"] = "MEMBERSHIP_WRITE";
    Permission["ANIMAL_READ"] = "ANIMAL_READ";
    Permission["ANIMAL_WRITE"] = "ANIMAL_WRITE";
    Permission["ANIMAL_WORK_SESSION_READ"] = "ANIMAL_WORK_SESSION_READ";
    Permission["ANIMAL_WORK_SESSION_WRITE"] = "ANIMAL_WORK_SESSION_WRITE";
    Permission["REFERENCE_SAMPLE_READ"] = "REFERENCE_SAMPLE_READ";
    Permission["REFERENCE_SAMPLE_WRITE"] = "REFERENCE_SAMPLE_WRITE";
    Permission["SAAS_PLAN_READ"] = "SAAS_PLAN_READ";
    Permission["SAAS_PLAN_WRITE"] = "SAAS_PLAN_WRITE";
    Permission["TERMS_VERSION_READ"] = "TERMS_VERSION_READ";
    Permission["TERMS_VERSION_WRITE"] = "TERMS_VERSION_WRITE";
    /** Ver candidatos a borrado permanente y la auditoria (solo administrador de la empresa). */
    Permission["RECORD_PURGE_READ"] = "RECORD_PURGE_READ";
    /** Borrar de forma permanente un candidato (solo administrador de la empresa). */
    Permission["RECORD_PURGE_WRITE"] = "RECORD_PURGE_WRITE";
})(Permission || (exports.Permission = Permission = {}));
exports.PERMISSION_ROLE_MAP = {
    [Permission.COMPANY_READ]: [roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.COMPANY_WRITE]: [roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.COMPANY_TENANT_READ]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.COMPANY_TENANT_WRITE]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.USER_READ]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.USER_WRITE]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.RANCH_READ]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.RANCH_WRITE]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.PADDOCK_READ]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.PADDOCK_WRITE]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.OWNER_READ]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.OWNER_WRITE]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.MEMBERSHIP_READ]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.MEMBERSHIP_WRITE]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.ANIMAL_READ]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.ANIMAL_WRITE]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.ANIMAL_WORK_SESSION_READ]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.ANIMAL_WORK_SESSION_WRITE]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.REFERENCE_SAMPLE_READ]: [roles_interface_1.UserRole.RANCH_STAFF, roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.REFERENCE_SAMPLE_WRITE]: [roles_interface_1.UserRole.ADMINISTRATOR, roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.SAAS_PLAN_READ]: [roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.SAAS_PLAN_WRITE]: [roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.TERMS_VERSION_READ]: [roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.TERMS_VERSION_WRITE]: [roles_interface_1.UserRole.SAAS_OWNER],
    [Permission.RECORD_PURGE_READ]: [roles_interface_1.UserRole.ADMINISTRATOR],
    [Permission.RECORD_PURGE_WRITE]: [roles_interface_1.UserRole.ADMINISTRATOR],
};
