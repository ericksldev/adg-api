export const SYSTEM_LIVESTOCK_CATEGORIES: readonly {
    system_code: string;
    name: string;
    description: string;
    category_type: 'PRODUCTIVE' | 'SELECTION';
}[] = [
    {
        system_code: 'CALF_MALE',
        name: 'Ternero',
        description: 'Macho joven.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'CALF_FEMALE',
        name: 'Ternera',
        description: 'Hembra joven.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'STEER',
        name: 'Novillo',
        description: 'Macho de desarrollo posterior a ternero.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'YOUNG_BULL',
        name: 'Torillo',
        description: 'Macho joven en desarrollo.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'HEIFER',
        name: 'Vaquilla',
        description: 'Hembra joven.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'COW',
        name: 'Vaca',
        description: 'Hembra adulta.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'BULL',
        name: 'Toro',
        description: 'Macho adulto.',
        category_type: 'PRODUCTIVE',
    },
    {
        system_code: 'BREEDING_FEMALE',
        name: 'Vientre',
        description: 'Hembra destinada a reproduccion.',
        category_type: 'SELECTION',
    },
    {
        system_code: 'CULL',
        name: 'Descarte',
        description: 'Animal marcado para salida del rodeo.',
        category_type: 'SELECTION',
    },
    {
        system_code: 'BULL_CANDIDATE',
        name: 'Candidato para toro',
        description: 'Macho en evaluacion como reproductor.',
        category_type: 'SELECTION',
    },
    {
        system_code: 'SELECTED_BREEDER',
        name: 'Reproductor seleccionado',
        description: 'Animal elegido como reproductor.',
        category_type: 'SELECTION',
    },
] as const;
