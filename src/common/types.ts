import { Message } from 'discord.js';

export abstract class Command {

    /** Command name */
    public readonly name: string;
    /** Command aliases */
    public readonly aliases: string[];
    /** command descriptions */
    public readonly desc: string;

    constructor(name: string, aliases: string[] | null, desc: string) {
        this.name = name;
        this.aliases = aliases ? aliases : [];
        this.desc = desc;
    }

    /**
     * Executes the command asynchronously
     * 
     * @param msg the message instance
     * @param args the arguments
     */
    public abstract execute(msg: Message, args: string[]): Promise<unknown>

}

export type Meeting = {
    id: string,
    password: string,
    url: string
}

export type Schedule = {
    date: string,
    time: string,
    code: string,
    delivery: string,
    course: string,
    week: number,
    session: number,
    meeting: Meeting | null
}

export type Notification = {
    /** the notification id */
    id: string,
    /** the assignment title */
    title: string,
    /** the sender name */
    sender: string,
    /** the url/link to the assignment */
    link: string,
    /** the notification time */
    time: string
}

export type Assignment = {
    /** the notification id */
    id: string,
    /** the assignment title */
    title: string,
    /** the assignment creator */
    sender: string,
    /** the creation date */
    time: string,
    /** the deadline date */
    deadline: string,
    /** the assignment url */
    link: string,
    /** the assignment path id, ex: `CHAR6034/015318/2010/CLC/20332` */
    pathId: string,
}

export type NullableCommand = Command | null;

export type ScheduleResult = {
    /** Last fetch date */
    last_fetch: string | null,
    /** All of the schedules */
    schedules: Schedule[]
}

export type BinusAccount = {
    username: string,
    password: string
}

export type ServerConfig = {
    prefix?: string,
    schedules_channel: string,
    assignments_channel: string,
    forums_channel: string,
    use_account: string,
}

export type Config = {
    default_prefix: string,
    binus_accounts: Record<string, BinusAccount>,
    servers: Record<string, ServerConfig>,
}