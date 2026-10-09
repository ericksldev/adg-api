export type Order = 'ASC' | 'DESC';
export type Status = 'all' | 'active' | 'inactive';

export interface IBaseParams {
    page: number;
    size: number;
    sortBy: string;
    order: Order;
    status?: Status;
    uuid_company?: string;
    /** Limitar listados a ranchos concretos (alcance single_ranch). */
    uuid_ranch_in?: string[];
    /** Case-insensitive partial match across resource-specific text fields. */
    search?: string;
    /** Animal list filter: MALE | FEMALE (omit or ALL for no filter). */
    sex?: string;
    /** Animal list filter: a single ranch. */
    ranch_uuid?: string;
    /** Animal list filter: cattle breed code. */
    breed_code?: string;
    /** Animal list filter: BIRTH | PURCHASE | TRANSFER | UNKNOWN. */
    origin_type?: string;
    /** Animal list filter: current owner. */
    current_owner_uuid?: string;
    /** Animal list filter: current paddock. */
    current_paddock_uuid?: string;
    /** Animal list filter: birth date inclusive start (YYYY-MM-DD). */
    birth_date_from?: string;
    /** Animal list filter: birth date inclusive end (YYYY-MM-DD). */
    birth_date_to?: string;
    /** Inactive animal list filter: SALE | DEATH | DISPOSED | MISSING | OTHER. */
    exit_type?: string;
    /** Derived from exit_type for the inactive list. Not a public query param. */
    current_status?: string;
}

export interface SearchQuery {
    search?: string;
}

export interface PaginationQuery {
    page?: string;
    size?: string;
    sortBy?: string;
    order?: string;
}

export interface StatusQuery {
    status?: string;
}

export interface IncludeInactiveQuery {
    includeInactive?: string;
}

export interface GetAllQuery extends PaginationQuery, StatusQuery {}