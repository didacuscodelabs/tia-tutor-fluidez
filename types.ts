export enum Role {
    USER = 'user',
    TUTOR = 'tutor',
}

export interface Message {
    role: Role;
    text: string;
}
