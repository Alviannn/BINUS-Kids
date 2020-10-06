const { Client, Message } = require('discord.js');
const { Schedule } = require('./objects/schedules');

const superagent = require('superagent');
const fs = require('fs');
const path = require('path');

const _schedule_result = {
    /** last save millis */
    last_save: 0,
    /** 
     * the schedule list 
     * @type {Schedule[]} 
     */
    schedules: []
};

const commandTemplate = {
    /** Command name */
    name: '',
    /** Command aliases */
    aliases: ['', ''],
    /** Command descriptions */
    desc: '',
    /**
     * Executes the command
     * 
     * @param {Message} msg the message instance
     * @param {string[]} args the arguments
     */
    async execute(msg, args) { }
};

module.exports = {
    /** @type {Client} */
    client: null,
    /** Handles creating a client object */
    createClient() {
        module.exports.client = new Client({
            presence: {
                status: 'online',
                activity: {
                    type: 'WATCHING',
                    name: 'LC01 schedules'
                }
            }
        });
    },
    /** The command template */
    command: commandTemplate,
    manager: {
        /** @type {Map<string, commandTemplate>} */
        commandMap: new Map(),
        /**
         * Loads all commands
         * 
         * @param {fs.PathLike} cmdsPath the commands folder path
         */
        loadCommands(cmdsPath) {
            if (!fs.existsSync(cmdsPath))
                throw Error('Cannot find commands folder path!');
            if (!fs.lstatSync(cmdsPath).isDirectory())
                throw Error("Commands path isn't a folder/directory!");

            const commandMap = module.exports.manager.commandMap;
            for (const file of fs.readdirSync(cmdsPath)) {
                // excludes invalid files
                if (file.startsWith('_') || !file.endsWith('.js'))
                    continue;

                // resolves the file path to command
                // this is necessary for loading another JS files
                const resolvedPath = path.resolve(path.join(cmdsPath, file));
                /** @type _command_template */
                const command = require(resolvedPath);
                if (!command)
                    continue;

                commandMap.set(command.name, command);
                console.log(`[COMMAND] Loaded ${file}!`);
            }
        },
        /**
         * Loads all events
         * 
         * @param {fs.PathLike} eventsPath the events folder path
         */
        loadEvents(eventsPath) {
            if (!fs.existsSync(eventsPath))
                throw Error('Cannot find events folder path!');
            if (!fs.lstatSync(eventsPath).isDirectory())
                throw Error("Events path isn't a folder/directory!");

            for (const file of fs.readdirSync(eventsPath)) {
                // excludes invalid files
                if (file.startsWith('_') || !file.endsWith('.js'))
                    continue;

                // resolves the file path to command
                // this is necessary for loading another JS files
                const resolvedPath = path.resolve(path.join(eventsPath, file));
                // loads the events codes
                require(resolvedPath);

                console.log(`[EVENT] Loaded ${file}!`);
            }
        },
        /**
         * Finds a command
         * 
         * @param {string} name the possible command name
         * @returns {commandTemplate | null}
         */
        findCommand(name) {
            const { commandMap } = module.exports.manager;

            for (const cmd of commandMap.values()) {
                if (cmd.name.toLowerCase() === name.toLowerCase())
                    return cmd;

                for (const alias of cmd.aliases) {
                    if (alias.toLowerCase() === name.toLowerCase())
                        return cmd;
                }
            }

            return null;
        }
    },
    /** The common times utilities */
    times: {
        /** Gets a date time instance */
        dateTime() {
            return require('luxon').DateTime;
        },
        /** Gets the current asia date */
        asiaDate() {
            return this.dateTime().utc().setZone('Asia/Bangkok', { keepLocalTime: false });
        },
        /**
         * Creates a date instance from millis (for Asia timezone)
         * 
         * @param {number} millis
         */
        fromMillisAsia(millis) {
            return this.dateTime().fromMillis(millis, { zone: 'Asia/Bangkok', setZone: true });
        }
    },
    strings: {
        /**
         * Creates a spaces to be used within a word
         * 
         * Example:
         * 
         * From:
         * ```js
         * Name: Kirito
         * Age: 15
         * ```
         * To:
         * ```js
         * Name  : Kirito
         * Age   : 15
         * ```
         * 
         * @param {number} maxSpaces 
         * @param {string} word 
         */
        createSpacing(maxSpaces, wordLength) {
            const spaces = maxSpaces - wordLength.length;
            return ' '.repeat(spaces);
        },
        /**
         * Capitalizes a word
         * 
         * @param {string} word 
         */
        capitalize(word) {
            const firstLetter = word[0].toUpperCase();
            return firstLetter + word.substr(1);
        },
    },
    /** The common utilities */
    utils: {
        _schedule_result: _schedule_result,
        /**
         * Handles saving the schedules
         * 
         * @param {Schedule[]} schedules the schedules
         */
        saveSchedules(schedules) {
            const { times } = module.exports;

            /** @type {_schedule_result} */
            const finalData = {
                last_save: times.asiaDate().toMillis(),
                schedules: schedules
            };

            const dumped = JSON.stringify(finalData, null, 4);
            fs.writeFileSync('./schedules.json', dumped, { encoding: 'utf8' });
        },
        /**
         * Handles grabbing the schedules
         */
        async getSchedules() {
            /** Handles reading the schedules locally */
            function read() {
                if (!fs.existsSync('./schedules.json'))
                    return;

                const stream = fs.readFileSync('./schedules.json', { encoding: 'utf8' });
                /** @type {_schedule_result} */
                const rawObject = JSON.parse(stream);

                let schedules = [];
                const lastSave = rawObject.last_save;

                for (const data of rawObject.schedules) {
                    let schedule = new Schedule();
                    Object.assign(schedule, data);

                    schedules.push(schedule);
                }

                return { last_save: lastSave, schedules: schedules };
            }

            /** Handles fetching the class schedules */
            async function fetch() {
                const { parseSchedule } = require('./objects/schedules');
                const { utils } = module.exports;

                const loginData = {
                    'Username': process.env.BINUS_USER,
                    'Password': process.env.BINUS_PASS,
                    'btnSubmit': true
                };

                let schedules = [];
                try {
                    const agent = superagent.agent();
                    const loginRes = await agent.post('https://myclass.apps.binus.ac.id/Auth/Login')
                        .send(loginData);

                    if (!loginRes.body['Status'])
                        throw Error();

                    const lastRes = await agent.get('https://myclass.apps.binus.ac.id/Home/GetViconSchedule');
                    schedules = lastRes.body;
                } catch (error) {
                    throw Error();
                }

                const scheduleList = [];
                for (const clazz of schedules)
                    scheduleList.push(parseSchedule(clazz));

                utils.saveSchedules(scheduleList);
                return scheduleList;
            }

            const { times } = module.exports;

            let schedules;
            let readResult = read();

            if (!readResult) {
                await fetch();
                readResult = read();
            }

            const dateFormat = 'dd MMM yyyy';
            const lastSaveDate = times.fromMillisAsia(readResult.last_save).toFormat(dateFormat);
            const currentDate = times.asiaDate().toFormat(dateFormat);

            if (lastSaveDate !== currentDate)
                schedules = await fetch();
            else
                schedules = readResult.schedules;

            return schedules;
        }
    }
};