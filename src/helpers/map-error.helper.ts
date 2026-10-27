import { UniqueConstraintError, ValidationError } from "sequelize";
import ApiError from "../errors/apiError";
import HttpStatusCodes from "../errors/httpStatusCodes";

function isPayloadTooLarge(err: unknown): boolean {
    if (!err || typeof err !== 'object') {
        return false;
    }
    const candidate = err as { type?: string; name?: string; status?: number; statusCode?: number };
    return candidate.type === 'entity.too.large'
        || candidate.name === 'PayloadTooLargeError'
        || candidate.status === HttpStatusCodes.PAYLOAD_TOO_LARGE
        || candidate.statusCode === HttpStatusCodes.PAYLOAD_TOO_LARGE;
}

export const mapErrorHelper = (err: any): ApiError => {

    if (err instanceof ApiError) {
        return err;
    }

    if (err instanceof UniqueConstraintError) {
        const path = err.errors?.[0]?.path as string | undefined;
        const duplicateCode =
            path === 'email'
                ? 'EMAIL_IN_USE'
                : path === 'username'
                    ? 'USERNAME_IN_USE'
                    : path === 'id_card'
                        ? 'ID_CARD_IN_USE'
                        : path === 'name'
                            ? 'COMPANY_NAME_IN_USE'
                            : path === 'tax_id'
                                ? 'TAX_ID_IN_USE'
                                : 'DUPLICATE_VALUE';

        return new ApiError({
            name: 'ConflictError',
            statusCode: HttpStatusCodes.CONFLICT,
            description: duplicateCode
        });
    }

    if (err instanceof ValidationError) {
        return new ApiError({
            name: 'ValidationError',
            statusCode: HttpStatusCodes.BAD_REQUEST,
            description: err.errors?.[0]?.message || 'Validation error'
        });
    }

    if (isPayloadTooLarge(err)) {
        return new ApiError({
            name: 'PayloadTooLargeError',
            statusCode: HttpStatusCodes.PAYLOAD_TOO_LARGE,
            description: 'Request body is too large'
        });
    }

    return new ApiError({
        name: 'InternalServerError',
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        description: 'Something went wrong. Please try again.'
    });
};
