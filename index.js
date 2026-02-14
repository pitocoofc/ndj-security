const { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');

const userLogs = new Map();
const userPunishments = new Map();

module.exports = {
    name: "NDJ Guard",
    description: "Anti-RAID com limites dinâmicos e sistema de reset",
    init: (bot) => {
        // Comando para resetar punições
        bot.command({
            name: 'reset-punesp',
            description: 'Reseta o nível de punição de um usuário no Anti-RAID',
            options: [
                {
                    name: 'usuario',
                    description: 'O usuário para resetar',
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ],
            run: async (ctx) => {
                // Apenas quem tem permissão de moderar pode resetar
                if (!ctx.interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    return ctx.reply({ content: "❌ Você não tem permissão para resetar punições.", ephemeral: true });
                }

                const target = ctx.interaction.options.getUser('usuario');
                userPunishments.delete(target.id);
                userLogs.delete(target.id);

                await ctx.reply({ content: `✅ As punições de **${target.tag}** foram resetadas com sucesso!`, ephemeral: true });
            }
        });

        // Ouvinte de mensagens com verificação de limites dinâmicos
        bot.on('messageCreate', async (msg) => {
            if (msg.author.bot || !msg.guild) return;

            // Pega os limites definidos no bot (ou usa um padrão se não existir)
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
                        await msg.member.timeout(muteTime, `Spam detectado (Nível ${level})`);
                        await msg.author.send(`⚠️ Você foi mutado em **${msg.guild.name}** por **${label}** devido ao excesso de mensagens.`).catch(() => null);
                        userLogs.delete(msg.author.id);
                        console.log(`[GUARD] ${msg.author.tag} mutado. Limite: ${msgLimit} msgs / ${timeLimit/1000}s.`);
                    } catch (e) {
                        console.error("[GUARD] Erro ao aplicar punição.");
                    }
                } else {
                    userLogs.set(msg.author.id, userData);
                }
            }
        });
    }
};
                  
