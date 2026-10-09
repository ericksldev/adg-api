import {
    CompanyMembershipSnapshot,
    TermsAcceptanceAttributes,
    TermsAcceptanceCreationAttributes,
    TermsVersionAttributes,
    TermsVersionCreationAttributes,
} from '../terms/terms.interface';

export interface ITermsAcceptanceRepository {
    findCompany(uuidCompany: string): Promise<CompanyMembershipSnapshot | null>;
    findCurrentRequiredVersion(now: Date): Promise<TermsVersionAttributes | null>;
    findAcceptance(
        uuidUser: string,
        uuidCompany: string,
        uuidTermsVersion: string
    ): Promise<TermsAcceptanceAttributes | null>;
    createAcceptance(data: TermsAcceptanceCreationAttributes): Promise<TermsAcceptanceAttributes>;
    findVersionById(uuidTermsVersion: string): Promise<TermsVersionAttributes | null>;
    findVersionByCode(version: string): Promise<TermsVersionAttributes | null>;
    listVersions(): Promise<TermsVersionAttributes[]>;
    insertVersion(data: TermsVersionCreationAttributes, publish: boolean): Promise<TermsVersionAttributes>;
    activateVersion(uuidTermsVersion: string): Promise<TermsVersionAttributes | null>;
}
