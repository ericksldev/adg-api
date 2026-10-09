"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = require("../containers/container");
const authorization_middleware_1 = require("../middlewares/authorization.middleware");
const terms_acceptance_middleware_1 = require("../middlewares/terms-acceptance.middleware");
const authorization_constants_1 = require("../constants/authorization.constants");
const termsAcceptanceController = container_1.container.termsAcceptanceController;
const requireCurrentTerms = (0, terms_acceptance_middleware_1.requireTermsAcceptance)(container_1.container.termsAcceptanceService);
/**
 * Status, current document and acceptance stay available before the terms gate.
 * Publishing a version requires the caller to have accepted the current terms.
 */
const termsRoutes = (0, express_1.Router)();
termsRoutes.get('/status', termsAcceptanceController.status);
termsRoutes.get('/current', termsAcceptanceController.current);
termsRoutes.post('/accept', termsAcceptanceController.accept);
termsRoutes.get('/versions', requireCurrentTerms, (0, authorization_middleware_1.authorize)(authorization_constants_1.Permission.TERMS_VERSION_READ), termsAcceptanceController.listVersions);
termsRoutes.post('/versions', requireCurrentTerms, (0, authorization_middleware_1.authorize)(authorization_constants_1.Permission.TERMS_VERSION_WRITE), termsAcceptanceController.createVersion);
termsRoutes.post('/versions/:uuid_terms_version/publish', requireCurrentTerms, (0, authorization_middleware_1.authorize)(authorization_constants_1.Permission.TERMS_VERSION_WRITE), termsAcceptanceController.publishVersion);
exports.default = termsRoutes;
