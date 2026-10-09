"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_builder_1 = require("../utils/query.builder");
const response_handler_1 = require("../utils/response.handler");
class RecordPurgeController {
    constructor(recordPurgeService) {
        this.listAnimals = async (req, res, next) => {
            try {
                const params = (0, query_builder_1.buildGetAllParams)(req.query);
                const response = await this.recordPurgeService.listAnimalCandidates(params.page, params.size, params.search);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.listWorkSessions = async (req, res, next) => {
            try {
                const params = (0, query_builder_1.buildGetAllParams)(req.query);
                const response = await this.recordPurgeService.listWorkSessionCandidates(params.page, params.size, params.search);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.purgeAnimal = async (req, res, next) => {
            try {
                const animalUuid = String(req.params.animal_uuid ?? '');
                const response = await this.recordPurgeService.purgeAnimal(animalUuid, req.user?.username ?? '');
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.purgeWorkSession = async (req, res, next) => {
            try {
                const sessionUuid = String(req.params.session_uuid ?? '');
                const response = await this.recordPurgeService.purgeWorkSession(sessionUuid, req.user?.username ?? '');
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.listAudits = async (req, res, next) => {
            try {
                const params = (0, query_builder_1.buildGetAllParams)(req.query);
                const response = await this.recordPurgeService.listAudits(params.page, params.size);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.recordPurgeService = recordPurgeService;
    }
}
exports.default = RecordPurgeController;
