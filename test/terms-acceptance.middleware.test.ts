import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextFunction, Response } from 'express';
import ApiError from '../src/errors/apiError';
import { AuthRequest } from '../src/interfaces/middleware/auth-middleware.interface';
import { TermsAccessDecision } from '../src/interfaces/terms/terms.interface';
import { requireTermsAcceptance } from '../src/middlewares/terms-acceptance.middleware';

function runMiddleware(
    decision: TermsAccessDecision | Error,
    body: unknown = { accepted: true, access_granted: true }
): Promise<{ nextArg: unknown }> {
    const middleware = requireTermsAcceptance({
        evaluateAccess: async () => {
            if (decision instanceof Error) {
                throw decision;
            }
            return decision;
        },
    });

    const req = {
        user: {
            sub: 'user-1',
            username: 'ada',
            uuid_company: 'company-1',
            roles: [],
        },
        body,
    } as unknown as AuthRequest;

    return new Promise((resolve, reject) => {
        const next: NextFunction = (arg?: unknown) => {
            resolve({ nextArg: arg });
        };
        middleware(req, {} as Response, next).catch(reject);
    });
}

describe('terms acceptance middleware', () => {
    it('does not grant access when the client claims acceptance but the server does not', async () => {
        const result = await runMiddleware({
            access_granted: false,
            acceptance_required: true,
            accepted: false,
            block_reason: 'acceptance_required',
            current_version: null,
        }, {
            accepted: true,
            access_granted: true,
        });

        assert.ok(result.nextArg instanceof ApiError);
        assert.equal((result.nextArg as ApiError).name, 'TermsAcceptanceRequired');
        assert.equal((result.nextArg as ApiError).statusCode, 403);
    });

    it('allows the request only when the server decision grants access', async () => {
        const result = await runMiddleware({
            access_granted: true,
            acceptance_required: true,
            accepted: true,
            block_reason: 'none',
            current_version: null,
        });

        assert.equal(result.nextArg, undefined);
    });

    it('denies access when the acceptance check fails', async () => {
        const result = await runMiddleware(new Error('database down'));

        assert.ok(result.nextArg instanceof ApiError);
        assert.equal((result.nextArg as ApiError).name, 'TermsAcceptanceCheckFailed');
        assert.equal((result.nextArg as ApiError).statusCode, 403);
    });

    it('denies access when the token has no organization', async () => {
        const middleware = requireTermsAcceptance({
            evaluateAccess: async () => {
                throw new Error('should not be called');
            },
        });
        const req = {
            user: { sub: 'user-1', username: 'ada', roles: [] },
            body: { accepted: true },
        } as unknown as AuthRequest;

        const nextArg = await new Promise<unknown>((resolve, reject) => {
            middleware(req, {} as Response, ((arg?: unknown) => resolve(arg)) as NextFunction).catch(reject);
        });

        assert.ok(nextArg instanceof ApiError);
        assert.equal((nextArg as ApiError).name, 'OrganizationMembershipRequired');
    });
});
