"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HealthService {
    async check() {
        return {
            success: true,
            data: {
                status: 'ok',
            },
        };
    }
}
exports.default = HealthService;
