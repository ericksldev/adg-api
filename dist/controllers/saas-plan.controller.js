"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_handler_1 = require("../utils/response.handler");
const query_builder_1 = require("../utils/query.builder");
class SaasPlanController {
    constructor(saasPlanService) {
        this.create = async (req, res, next) => {
            try {
                const response = await this.saasPlanService.create(req.body);
                return (0, response_handler_1.handleResponse)(res, response, 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getById = async (req, res, next) => {
            try {
                const response = await this.saasPlanService.getById(req.params.uuid_plan);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAll = async (req, res, next) => {
            try {
                const params = (0, query_builder_1.buildGetAllParams)(req.query);
                if (!req.query.sortBy) {
                    params.sortBy = 'name';
                    params.order = 'ASC';
                }
                const response = await this.saasPlanService.getAll(params);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const response = await this.saasPlanService.update(req.params.uuid_plan, req.body);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.saasPlanService = saasPlanService;
    }
}
exports.default = SaasPlanController;
