const { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType, MessageFlags } = require('discord.js');

const userLogs = new Map();
const userPunishments = new Map();

module.exports = {
    name: "NDJ Security",
    description: "Anti-RAID com limites dinâmicos e correções de API",
    init: (bot) => {
        // Comando de Reset
        bot.command({
            name: 'reset-punesp',
            description: 'Reseta o nível de punição de um usuário',
            options: [{
                name: 'usuario',
                description: 'O usuário para resetar',
                type: ApplicationCommandOptionType.User,
                required: true
            }],
            run: async (ctx) => {
                if (!ctx.interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return ctx.reply({ 
                        content: "❌ Sem permissão.", 
                        flags: [MessageFlags.Ephemeral] // Correção do aviso de deprecation
                    });
                }

                const target = ctx.interaction.options.getUser('usuario');
                userPunishments.delete(target.id);
                userLogs.delete(target.id);

                await ctx.reply({ 
                    content: `✅ Punições de **${target.tag}** resetadas!`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        });

        // Acessando o client real para ouvir as mensagens
        const client = bot.client || bot; 

        client.on('messageCreate', async (msg) => {
            if (msg.author.bot || !msg.guild) return;

            // Busca os limites dinâmicos do seu bot.config
            const msgLimit = bot.config?.messagespam || 5;
            const timeLimit = (bot.config?.limitmessagespam || 15) * 1000;

            const now = Date.now();
            const userData = userLogs.get(msg.author.id) || { count: 0, firstMsg: now };

            if (now - userData.firstMsg > timeLimit) {
                userLogs.set(msg.author.id, { count: 1, firstMsg: now });
            } else {
                userData.count++;
                if (userData.count >= msgLimit) {
                    let level = (userPunishments.get(msg.author.id) || 0) + 1;
                    userPunishments.set(msg.author.id, level);

                    let muteTime = level < 3 ? 60000 : (level < 10 ? 86400000 : 604800000);
                    let label = level < 3 ? "1 minuto" : (level < 10 ? "24 horas" : "7 dias");

                    try {
                        // Aplica o timeout
                        await msg.member.timeout(muteTime, `Spam detectado (Nível ${level})`);
                        
                        // Envia o aviso de spam
                        await msg.channel.send(`⚠️ **Anti-Spam:** O usuário ${msg.author} foi mutado por **${label}** (Punição Nível ${level}).`);
                        
                        await msg.author.send(`Você foi mutado em **${msg.guild.name}** por **${label}**.`).catch(() => null);
                        
                        userLogs.delete(msg.author.id);
                    } catch (e) {
                        console.error("[SECURITY] Erro ao aplicar timeout. Verifique as permissões do bot.");
                    }
                } else {
                    userLogs.set(msg.author.id, userData);
                }
            }
        });
    }
};
