const { MessageEmbed } = require('discord.js');
const { command } = require('../global');
const util = require('util');

/** @type {command} */
module.exports = {
    name: 'eval',
    aliases: ['evalutaion'],
    desc: 'Tests JS codes',
    async execute(msg, args) {
        const { channel, member, client, author } = msg;

        if (member.id !== '217970261230747648')
            return await channel.send("You don't have enough permission!");
        if (!args[0])
            return await channel.send('Cannot accept empty argument for this command!');

            let codeInput = args.join(' ');
            if (codeInput.startsWith('```js') && codeInput.endsWith('```'))
                codeInput = codeInput.replace(/^```js/g, '')
                    .replace(/```$/gi, '');
    
            if (codeInput.includes(client.token)) {
                await msg.delete({ timeout: 50 });
                const res = await channel.send('Invalid code input!');
    
                return await res.delete({ timeout: 1_000 });
            }
            
            const embed = new MessageEmbed()
                .setTitle('Code Evaluation')
                .setFooter(`Executed by ${author.tag}`, author.displayAvatarURL())
                .setColor(0x00FF2E)
                .addField(':inbox_tray: Code Input', '```js\n' + codeInput + '```');
    
            msg.delete({ timeout: 100 });
            try {
                let result = eval(codeInput);
                // if the result isn't a string, then inspect the object 
                // and get the inner result
                if (typeof result !== 'string')
                    result = util.inspect(result, { depth: 0 });
    
                // don't allow bot token to be shown
                if (result.includes(msg.client.token))
                    throw Error("You don't have the permission to access this!");
    
                embed.addField(':outbox_tray: Code Output', '```js\n' + result + '```');
                await channel.send(embed);
            } catch (error) {
                embed.setDescription('An error has occurred during code evaluation!')
                    .setColor(0xFF0000)
                    .addField(':e_mail: Error', '```js\n' + error + '```');
    
                await channel.send(embed);
            }
    }
};