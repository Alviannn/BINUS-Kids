const { MessageEmbed } = require('discord.js');

class Meeting {

    /**
     * @param {string} id 
     * @param {string} password 
     * @param {string} url 
     */
    constructor(id, password, url) {
        this.id = id;
        this.password = password;
        this.url = url;
    }

}


class Schedule {

    /**
     * @param {string} date 
     * @param {string} time 
     * @param {string} code 
     * @param {string} delivery 
     * @param {string} course 
     * @param {number} week 
     * @param {number} session 
     * @param {Meeting} meeting 
     */
    constructor(date, time, code, delivery, course, week, session, meeting) {
        this.date = date;
        this.time = time;
        this.code = code;
        this.delivery = delivery;
        this.course = course;
        this.week = week;
        this.session = session;
        this.meeting = meeting;
    }

}

exports.Meeting = Meeting;
exports.Schedule = Schedule;

/**
 * Handles parsing a schedule class
 * 
 * @param {object} data
 * @returns {Schedule} the class schedule object
 */
exports.parseSchedule = function (data) {
    const date = data['DisplayStartDate'];
    const time = `${data['StartTime']} - ${data['EndTime']}`;

    const code = data['ClassCode'];
    const delivery = data['DeliveryMode'];
    const course = `${data['CourseCode']} - ${data['CourseTitleEn']}`;

    const week = data['WeekSession'];
    const session = data['CourseSessionNumber'];

    const meetingUrl = data['MeetingUrl'];
    const meetingId = data['MeetingId'];
    const meetingPassword = data['MeetingPassword'];

    let meeting = null;
    if (meetingUrl !== '-')
        meeting = new exports.Meeting(meetingId, meetingPassword, meetingUrl);

    return new exports.Schedule(date, time, code, delivery, course, week, session, meeting);
};

// /**
//  * Handles formatting a schedule
//  * 
//  * @param {Schedule} schedule the schedule
//  */
// exports.formatSchedule = function (schedule) {
//     let array = [];

//     for (let [key, value] of Object.entries(schedule)) {
//         if (key === 'code')
//             key = 'Class Code';
//         else
//             key = global.utils.capitalize(key);

//         if (key === 'Meeting' && !value)
//             value = 'No meeting';
//         if (value instanceof Meeting) {
//             array.push(`**Meeting ID:** ${value.id}`);
//             array.push(`**Meeting Password:** ${value.password}`);
//             array.push(`**Meeting URL:** ${value.url}`);
//             continue;
//         }

//         array.push(`**${key} :** ${value}`);
//     }

//     return array.join('\n');
// };

/**
 * Handles formatting a schedule to an embed
 * 
 * @param {Schedule} schedule the schedule
 */
exports.formatEmbedSchedule = function (schedule) {
    const { client } = require('../global.js');
    const icon = client.user.displayAvatarURL();

    const embed = new MessageEmbed()
        .setAuthor(client.user.username, icon)
        .setThumbnail(icon)
        .setColor('RANDOM')

        .addField('**Date**', schedule.date, true)
        .addField('**Time**', schedule.time, true)
        .addField('**Class Code**', schedule.code)
        .addField('**Delivery**', schedule.delivery)
        .addField('**Course**', schedule.course)
        .addField('**Week**', schedule.week, true)
        .addField('**Session**', schedule.session, true);

    const { meeting } = schedule;
    if (meeting)
        embed.addField('**Meeting**',
            `
            **ID**: ${meeting.id}
            **Password**: ${meeting.password}
            **URL**: [Click here](${meeting.url})
            `
        );

    return embed;
};