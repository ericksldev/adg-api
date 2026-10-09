"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const container_1 = require("../containers/container");
const authorization_middleware_1 = require("../middlewares/authorization.middleware");
const authorization_constants_1 = require("../constants/authorization.constants");
const animalAttendanceRoutes = (0, express_1.Router)();
animalAttendanceRoutes.get('/', (0, authorization_middleware_1.authorize)(authorization_constants_1.Permission.ANIMAL_READ), container_1.container.animalAttendanceController.review);
exports.default = animalAttendanceRoutes;
