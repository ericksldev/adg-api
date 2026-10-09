"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_handler_1 = require("../utils/response.handler");
const query_builder_1 = require("../utils/query.builder");
class CorralWorkSessionController {
    constructor(service) {
        this.getAll = async (req, res, next) => {
            try {
                const base = (0, query_builder_1.buildGetAllParams)(req.query);
                const response = await this.service.getAll({
                    page: base.page,
                    size: base.size,
                    sortBy: base.sortBy,
                    order: base.order,
                    ranch_uuid: typeof req.query.ranch_uuid === 'string' ? req.query.ranch_uuid : undefined,
                    status: typeof req.query.status === 'string' ? req.query.status : undefined,
                    work_date: typeof req.query.work_date === 'string' ? req.query.work_date : undefined,
                    activity_code: typeof req.query.activity_code === 'string'
                        ? req.query.activity_code
                        : undefined,
                });
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.listPendingAnimalRegistrations = async (req, res, next) => {
            try {
                const ranchUuid = typeof req.query.ranch_uuid === 'string' ? req.query.ranch_uuid : undefined;
                const response = await this.service.listPendingAnimalRegistrations(ranchUuid);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.getById = async (req, res, next) => {
            try {
                const response = await this.service.getById(req.params.uuid_corral_work_session);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.getWorkspace = async (req, res, next) => {
            try {
                const response = await this.service.getWorkspace(req.params.uuid_corral_work_session);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.create = async (req, res, next) => {
            try {
                const body = req.body;
                if (req.user?.username) {
                    body.created_by = req.user.username;
                }
                const response = await this.service.create(body);
                return (0, response_handler_1.handleResponse)(res, response, 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.configureWork = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.configureWork(req.params.uuid_corral_work_session, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.extendWorkConfiguration = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.extendWorkConfiguration(req.params.uuid_corral_work_session, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.scanStepAnimal = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.scanStepAnimal(req.params.uuid_corral_work_session, req.params.uuid_corral_session_step, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.addUnregisteredStepAnimal = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.addUnregisteredStepAnimal(req.params.uuid_corral_work_session, req.params.uuid_corral_session_step, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.previewAnimals = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.previewAnimals(req.params.uuid_corral_work_session, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.loadAnimals = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.loadAnimals(req.params.uuid_corral_work_session, body);
                return (0, response_handler_1.handleResponse)(res, response, 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateStepWorkMode = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.updateStepWorkMode(req.params.uuid_corral_work_session, req.params.uuid_corral_session_step, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.appendAnimalsToStep = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.appendAnimalsToStep(req.params.uuid_corral_work_session, req.params.uuid_corral_session_step, body);
                return (0, response_handler_1.handleResponse)(res, response, 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.start = async (req, res, next) => {
            try {
                const response = await this.service.start(req.params.uuid_corral_work_session);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.close = async (req, res, next) => {
            try {
                const response = await this.service.close(req.params.uuid_corral_work_session);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.applyPaddockDistribution = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.applyPaddockDistribution(req.params.uuid_corral_work_session, req.params.uuid_corral_session_step, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.saveStepGrid = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.saveStepGrid(req.params.uuid_corral_work_session, req.params.uuid_corral_session_step, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAnimalWorkHistory = async (req, res, next) => {
            try {
                const response = await this.service.getAnimalWorkHistory(req.params.uuid_corral_work_session, req.params.animal_uuid);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.lookupAnimal = async (req, res, next) => {
            try {
                const identifier = typeof req.query.identifier === 'string' ? req.query.identifier : '';
                const response = await this.service.lookupAnimal(req.params.uuid_corral_work_session, identifier);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.upsertFinding = async (req, res, next) => {
            try {
                const body = req.body;
                const response = await this.service.upsertFinding(req.params.uuid_corral_work_session, body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.service = service;
    }
}
exports.default = CorralWorkSessionController;
