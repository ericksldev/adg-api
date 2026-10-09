"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = require("../containers/container");
const healthRoutes = (0, express_1.Router)();
healthRoutes.get('/', container_1.container.healthController.check);
exports.default = healthRoutes;
