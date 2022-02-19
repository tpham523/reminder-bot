const Discord = require('discord.js')
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require("./config.json");
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');


const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"]});

const classes = ['CPSC-545', 'CPSC-546']
// Must creat commands first.
const commands = [
    new SlashCommandBuilder()
    .setName('homework')
    .setDescription("Check Homework! Only available for CPSC-545 & CPSC-546")
    .addStringOption(option =>
        option.setName('course')
        .setDescription('Ex: cpsc545')
        .setRequired(true)
        .addChoice('CPSC-545', 'cpsc545')
        .addChoice('CPSC-546', 'cpsc546'))
        ,

    new SlashCommandBuilder()
    .setName('urban')
    .setDescription('Check meaning of a word.')
    .addStringOption(option =>
		option.setName('term')
			.setDescription('word to look up')
			.setRequired(true))
]   
    .map(command => command.toJSON())

const rest = new REST({ version: '9'}).setToken(config.BOT_TOKEN);

// update command list 
rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands })
.then( () => console.log('Successfully registered application commands.'))
.catch(console.error);


client.on('interactionCreate', async interaction => {
    const headers = {
        'Authorization': `Bearer ${config.CANVAS_TOKEN}`
    };

    const trim = (str, max) => ((str.length > max) ? `${str.slice(0, max - 3)}...` : str);

	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

    if (commandName === 'urban') {
		await interaction.deferReply();
		const term = interaction.options.getString('term');
		const query = new URLSearchParams({ term });

        const { list } = await fetch(`https://api.urbandictionary.com/v0/define?${query}`)
			.then(response => response.json());

        if (!list.length) {
            return interaction.editReply(`No results found for **${term}**.`);
        }
        
        interaction.editReply(`**${term}**: ${list[0].definition}`);
	}

    if (commandName === 'homework') {
        await interaction.deferReply();
        const course = interaction.options.getString('course');
        let course_id, course_name;

        if (course.toLowerCase() === 'cpsc545') {
            course_id = 3251229;
            course_name = 'CPSC-545 Software Design & Architecture'
        }
        
        else if (course.toLocaleLowerCase() === 'cpsc546') {
            course_id = 3251244;
            course_name = 'CPSC-546 Modern Software Management'
        }

        else {
            return interaction.editReply(`Invalid course(s).`);
        }

        const link = `https://csufullerton.instructure.com/api/v1/courses/${course_id}/assignments?bucket=future&order_by=due_at`;

        let list = []

        list = await fetch(link, { method: 'GET', headers: headers })
        .then(response => response.json());

        if (!list.length) {
            return interaction.editReply(`No results found for **${course}**.`);
        }

        const [answer] = list;
        let embeds = [];

        list.forEach(item => {
            let date = new Date(item.due_at).toLocaleDateString("en-US", {timeZone: "America/Los_Angeles"});
            let embed = new MessageEmbed()
            .setColor('#EFFF00')
            .setTitle(trim(item.name), 1024)
            .setURL(item.html_url)
            .addFields(
                { name: 'Due Date', value: trim(date, 1024) },
                { name: 'Course', value: trim(course_name, 1024) },
            );

            embeds.push(embed);
        });

        interaction.editReply({ embeds: embeds });

        // interaction.editReply({list: [list]});


        // interaction.editReply(`**${list[0]['name']}**: ${list[0]['due_at']}`);
        
        // list.slice(1, list.length).forEach(hw => { 
        //     // console.log(hw['description'] + " : " + hw['due_at']);            
        //     interaction.followUp(`**${hw['name']}**: ${hw['due_at']}`);
        // });
    }
});

client.login(config.BOT_TOKEN);