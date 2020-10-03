const { Client, Message } = require('discord.js');
const { Schedule } = require('./objects/schedules');

const superagent = require('superagent');
const fs = require('fs');
const path = require('path');

const _schedule_result = {
    /** last save millis */
    last_save: 0,
    /** the schedule list 
     * @type {Schedule[]} */
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
     * @param {Message} msg 
     * @param {string[]} args 
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
        }
    },
    /** The common utilities */
    utils: {
        _schedule_result: _schedule_result,
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
        /** Gets a new moment instanc */
        moment() {
            return require('moment-timezone');
        },
        /** Gets the Asia timezoned moment instance */
        asiaMoment() {
            const { utils } = module.exports;
            return utils.moment().tz('Asia/Bangkok');
        },
        /**
         * Handles saving the schedules
         * 
         * @param {Schedule[]} schedules the schedules
         */
        saveSchedules(schedules) {
            /** @type {_schedule_result} */
            const finalData = {
                last_save: Date.now(),
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
            const read = () => {
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
            };

            /** Handles fetching the class schedules */
            const fetch = async () => {
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
            };

            const { utils } = module.exports;
            const moment = utils.moment();
            const asiaMoment = utils.asiaMoment();

            let schedules;
            let readResult = read();

            if (!readResult) {
                await fetch();
                readResult = read();
            }

            const lastSaveDate = moment(readResult.last_save).format('DD MMM YYYY');
            const currentDate = asiaMoment.format('DD MMM YYYY');

            if (lastSaveDate !== currentDate)
                schedules = await fetch();
            else
                schedules = readResult.schedules;

            return schedules;
        }
    }
};