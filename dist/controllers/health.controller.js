"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_handler_1 = require("../utils/response.handler");
class HealthController {
    constructor(healthService) {
        this.check = async (_req, res, next) => {
            try {
                const response = await this.healthService.check();
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.healthService = healthService;
    }
}
exports.default = HealthController;
