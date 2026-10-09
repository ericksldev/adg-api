import { AnimalAttendanceMark } from '../animal-attendance/animal-attendance.interface';

export interface IAnimalAttendanceQueryParams {
    ranch_uuid: string;
    from?: string;
    to?: string;
    paddock_uuid?: string;
    animal_uuid?: string;
    attendance_status?: AnimalAttendanceMark;
    page: number;
    size: number;
    uuid_company?: string;
}
