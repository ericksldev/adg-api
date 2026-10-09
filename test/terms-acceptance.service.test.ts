import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ITermsAcceptanceRepository } from '../src/interfaces/repositories/terms-acceptance-repository.interface';
import {
    CompanyMembershipSnapshot,
    TermsAcceptanceAttributes,
    TermsAcceptanceCreationAttributes,
    TermsVersionAttributes,
    TermsVersionCreationAttributes,
} from '../src/interfaces/terms/terms.interface';
import TermsAcceptanceService from '../src/services/terms-acceptance.service';

const NOW = new Date('2026-10-08T12:00:00.000Z');
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const COMPANY_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const COMPANY_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function company(uuidCompany: string, overrides: Partial<CompanyMembershipSnapshot> = {}): CompanyMembershipSnapshot {
    return {
        uuid_company: uuidCompany,
        is_active: true,
        membership_status: 'ACTIVE',
        membership_renewal_at: null,
        ...overrides,
    };
}

function version(partial: Partial<TermsVersionAttributes> & Pick<TermsVersionAttributes, 'uuid_terms_version' | 'version'>): TermsVersionAttributes {
    return {
        title: 'Condiciones de Servicio y Aceptación de Membresía',
        content: 'x'.repeat(80),
        effective_at: new Date('2026-10-01T00:00:00.000Z'),
        is_active: false,
        requires_acceptance: true,
        created_at: new Date('2026-10-01T00:00:00.000Z'),
        updated_at: new Date('2026-10-01T00:00:00.000Z'),
        ...partial,
    };
}

class MemoryTermsRepository implements ITermsAcceptanceRepository {
    companies: CompanyMembershipSnapshot[] = [];
    versions: TermsVersionAttributes[] = [];
    acceptances: TermsAcceptanceAttributes[] = [];
    failNextCreate = false;
    throwUniqueOnCreate = false;
    skipNextAcceptanceLookup = false;

    async findCompany(uuidCompany: string): Promise<CompanyMembershipSnapshot | null> {
        return this.companies.find((row) => row.uuid_company === uuidCompany) ?? null;
    }

    async findCurrentRequiredVersion(now: Date): Promise<TermsVersionAttributes | null> {
        const matches = this.versions
            .filter((row) => row.is_active && row.requires_acceptance && row.effective_at.getTime() <= now.getTime())
            .sort((left, right) => right.effective_at.getTime() - left.effective_at.getTime());
        return matches[0] ?? null;
    }

    async findAcceptance(uuidUser: string, uuidCompany: string, uuidTermsVersion: string): Promise<TermsAcceptanceAttributes | null> {
        if (this.skipNextAcceptanceLookup) {
            this.skipNextAcceptanceLookup = false;
            return null;
        }
        return this.acceptances.find((row) =>
            row.uuid_user === uuidUser
            && row.uuid_company === uuidCompany
            && row.uuid_terms_version === uuidTermsVersion
        ) ?? null;
    }

    async createAcceptance(data: TermsAcceptanceCreationAttributes): Promise<TermsAcceptanceAttributes> {
        if (this.failNextCreate) {
            this.failNextCreate = false;
            throw new Error('database unavailable');
        }
        if (this.throwUniqueOnCreate) {
            this.throwUniqueOnCreate = false;
            const error = new Error('duplicate');
            error.name = 'SequelizeUniqueConstraintError';
            throw error;
        }
        const row: TermsAcceptanceAttributes = {
            uuid_terms_acceptance: `acceptance-${this.acceptances.length + 1}`,
            created_at: data.accepted_at,
            updated_at: data.accepted_at,
            ...data,
        };
        this.acceptances.push(row);
        return row;
    }

    async findVersionById(uuidTermsVersion: string): Promise<TermsVersionAttributes | null> {
        return this.versions.find((row) => row.uuid_terms_version === uuidTermsVersion) ?? null;
    }

    async findVersionByCode(code: string): Promise<TermsVersionAttributes | null> {
        return this.versions.find((row) => row.version === code) ?? null;
    }

    async listVersions(): Promise<TermsVersionAttributes[]> {
        return [...this.versions];
    }

    async insertVersion(data: TermsVersionCreationAttributes, publish: boolean): Promise<TermsVersionAttributes> {
        const row = version({
            uuid_terms_version: `version-${data.version}`,
            version: data.version,
            title: data.title,
            content: data.content,
            effective_at: data.effective_at,
            requires_acceptance: data.requires_acceptance,
            is_active: false,
            created_at: NOW,
            updated_at: NOW,
        });
        this.versions.push(row);
        if (publish) {
            await this.activateVersion(row.uuid_terms_version);
        }
        return (await this.findVersionById(row.uuid_terms_version)) as TermsVersionAttributes;
    }

    async activateVersion(uuidTermsVersion: string): Promise<TermsVersionAttributes | null> {
        const row = await this.findVersionById(uuidTermsVersion);
        if (!row) {
            return null;
        }
        for (const item of this.versions) {
            item.is_active = false;
        }
        row.is_active = true;
        row.updated_at = NOW;
        return row;
    }
}

function serviceWithActiveMembership(): { service: TermsAcceptanceService; repository: MemoryTermsRepository } {
    const repository = new MemoryTermsRepository();
    repository.companies.push(company(COMPANY_A), company(COMPANY_B));
    repository.versions.push(version({
        uuid_terms_version: 'version-1.0',
        version: '1.0',
        is_active: true,
    }));
    return { service: new TermsAcceptanceService(repository), repository };
}

describe('terms acceptance access', () => {
    it('blocks a user who has never accepted the required version', async () => {
        const { service } = serviceWithActiveMembership();
        const decision = await service.evaluateAccess(USER_A, COMPANY_A, NOW);

        assert.equal(decision.access_granted, false);
        assert.equal(decision.block_reason, 'acceptance_required');
        assert.equal(decision.current_version?.version, '1.0');
    });

    it('allows a user who accepted the current required version', async () => {
        const { service } = serviceWithActiveMembership();
        await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);

        const decision = await service.evaluateAccess(USER_A, COMPANY_A, NOW);
        assert.equal(decision.access_granted, true);
        assert.equal(decision.accepted, true);
    });

    it('blocks a user whose acceptance belongs to an older version', async () => {
        const { service, repository } = serviceWithActiveMembership();
        await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);

        await service.createVersion({
            version: '1.1',
            title: 'Condiciones de Servicio y Aceptación de Membresía',
            content: 'y'.repeat(80),
            effective_at: '2026-11-01T00:00:00.000Z',
            requires_acceptance: true,
            publish: true,
        });

        const later = new Date('2026-11-02T00:00:00.000Z');
        const decision = await service.evaluateAccess(USER_A, COMPANY_A, later);
        assert.equal(decision.access_granted, false);
        assert.equal(decision.block_reason, 'acceptance_required');
        assert.equal(decision.current_version?.version, '1.1');
        assert.equal(repository.acceptances.length, 1);
        assert.equal(repository.versions.find((row) => row.version === '1.0')?.is_active, false);
    });

    it('allows access after the user accepts the new version and keeps prior history', async () => {
        const { service, repository } = serviceWithActiveMembership();
        await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);

        await service.createVersion({
            version: '1.1',
            title: 'Condiciones de Servicio y Aceptación de Membresía',
            content: 'y'.repeat(80),
            effective_at: '2026-11-01T00:00:00.000Z',
            requires_acceptance: true,
            publish: true,
        });

        const later = new Date('2026-11-02T00:00:00.000Z');
        const accepted = await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.1',
            accepted: true,
        }, later);

        assert.equal(accepted.data?.already_recorded, false);
        assert.equal(accepted.data?.access.access_granted, true);
        assert.equal(repository.acceptances.length, 2);
        assert.deepEqual(
            repository.acceptances.map((row) => row.uuid_terms_version).sort(),
            ['version-1.0', 'version-1.1']
        );
    });

    it('does not create a duplicate acceptance for the same user, organization and version', async () => {
        const { service, repository } = serviceWithActiveMembership();
        const command = {
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        };

        const first = await service.accept(command, NOW);
        const second = await service.accept(command, new Date('2026-10-08T13:00:00.000Z'));

        assert.equal(first.data?.already_recorded, false);
        assert.equal(second.data?.already_recorded, true);
        assert.equal(repository.acceptances.length, 1);
        assert.equal(
            repository.acceptances[0]?.accepted_at.toISOString(),
            NOW.toISOString()
        );
    });

    it('treats a unique constraint race as the existing acceptance', async () => {
        const { service, repository } = serviceWithActiveMembership();
        await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);
        repository.skipNextAcceptanceLookup = true;
        repository.throwUniqueOnCreate = true;

        const second = await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);

        assert.equal(second.data?.already_recorded, true);
        assert.equal(repository.acceptances.length, 1);
    });

    it('does not let an acceptance from another organization grant access', async () => {
        const { service } = serviceWithActiveMembership();
        await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);

        const sameUserOtherCompany = await service.evaluateAccess(USER_B, COMPANY_A, NOW);
        const otherCompany = await service.evaluateAccess(USER_A, COMPANY_B, NOW);

        assert.equal(sameUserOtherCompany.access_granted, false);
        assert.equal(otherCompany.access_granted, false);
        assert.equal(otherCompany.block_reason, 'acceptance_required');
    });

    it('keeps the user blocked when recording the acceptance fails', async () => {
        const { service, repository } = serviceWithActiveMembership();
        repository.failNextCreate = true;

        await assert.rejects(() => service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW));

        const decision = await service.evaluateAccess(USER_A, COMPANY_A, NOW);
        assert.equal(decision.access_granted, false);
        assert.equal(decision.block_reason, 'acceptance_required');
        assert.equal(repository.acceptances.length, 0);
    });

    it('blocks existing users when a new obligatory version is published', async () => {
        const { service } = serviceWithActiveMembership();
        await service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);
        await service.accept({
            uuid_user: USER_B,
            uuid_company: COMPANY_B,
            uuid_terms_version: 'version-1.0',
            accepted: true,
        }, NOW);

        await service.createVersion({
            version: '1.2',
            title: 'Condiciones de Servicio y Aceptación de Membresía',
            content: 'z'.repeat(80),
            effective_at: '2026-12-01T00:00:00.000Z',
            requires_acceptance: true,
            publish: true,
        });

        const later = new Date('2026-12-02T00:00:00.000Z');
        const first = await service.evaluateAccess(USER_A, COMPANY_A, later);
        const second = await service.evaluateAccess(USER_B, COMPANY_B, later);
        assert.equal(first.access_granted, false);
        assert.equal(second.access_granted, false);
        assert.equal(first.current_version?.version, '1.2');
    });

    it('rejects implicit acceptance and a version that is not the required one', async () => {
        const { service, repository } = serviceWithActiveMembership();

        await assert.rejects(() => service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-1.0',
            accepted: false,
        }, NOW));

        repository.versions.push(version({
            uuid_terms_version: 'version-0.9',
            version: '0.9',
            is_active: false,
        }));

        await assert.rejects(() => service.accept({
            uuid_user: USER_A,
            uuid_company: COMPANY_A,
            uuid_terms_version: 'version-0.9',
            accepted: true,
        }, NOW));

        assert.equal(repository.acceptances.length, 0);
    });

    it('blocks an organization without a valid membership', async () => {
        const { service, repository } = serviceWithActiveMembership();
        repository.companies[0] = company(COMPANY_A, { membership_status: 'CANCELLED' });

        const decision = await service.evaluateAccess(USER_A, COMPANY_A, NOW);
        assert.equal(decision.access_granted, false);
        assert.equal(decision.block_reason, 'membership_invalid');
    });

    it('blocks a user who is not tied to an organization', async () => {
        const { service } = serviceWithActiveMembership();
        const decision = await service.evaluateAccess(USER_A, '', NOW);
        assert.equal(decision.access_granted, false);
        assert.equal(decision.block_reason, 'organization_missing');
    });
});
