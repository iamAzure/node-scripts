import { Markup } from 'telegraf';
import dayjs from 'dayjs';
import { logUserAction, logFunctionCall } from './log.js';
import { calculateTimeRange, getSupply, getExchangeBalance, getMVRV } from './data-process.js';

// 存储用户的时间范围偏好
export const userTimeRange = new Map();

// 创建主菜单键盘
export function getMainMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('📈 供应量查询', 'query_supply'),
            Markup.button.callback('📊 交易所余额', 'query_exchange')
        ],
        [
            Markup.button.callback('💰 MVRV 查询', 'query_mvrv')
        ],
        [
            Markup.button.callback('⏰ 时间范围: 上一周', 'set_week'),
            Markup.button.callback('⏰ 时间范围: 上个月', 'set_month')
        ],
        [
            Markup.button.callback('📋 帮助', 'show_help')
        ]
    ]);
}

// 创建返回菜单按钮
export function getBackMenuButton() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🔙 返回菜单', 'show_menu')]
    ]);
}

// 设置命令菜单（左下角菜单按钮）
export async function setupCommandsMenu(bot) {
    try {
        console.log('📋 正在设置命令菜单...');
        const commands = [
            {
                command: 'start',
                description: '功能速覽 - 开始使用机器人'
            },
            {
                command: 'menu',
                description: '主菜单 - 显示功能菜单'
            },
            {
                command: 'help',
                description: '入門指南 - 查看帮助信息'
            }
        ];
        
        await bot.telegram.setMyCommands(commands);
        console.log('✅ 命令菜单已设置成功');
        console.log('📝 设置的命令:', commands.map(c => `/${c.command} - ${c.description}`).join(', '));
        logFunctionCall('setupCommandsMenu', { success: true, commands: commands.length });
        return true;
    } catch (error) {
        console.error('❌ 设置命令菜单失败:', error);
        console.error('错误详情:', error.message);
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
        logFunctionCall('setupCommandsMenu', { success: false, error: error.message });
        return false;
    }
}

// 注册所有 bot 命令和动作处理器
export function registerBotActions(bot) {
    // 帮助命令
    bot.command('help', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'command_help');
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
        const helpText = `
🤖 **Glassnode 数据查询机器人**

**可用功能：**

📊 数据查询：
• 📈 供应量查询 - BTC 长期和短期持有者
• 📊 交易所余额 - ETH, DOGE, BTC, SOL, EIGEN
• 💰 MVRV 查询 - BTC 长期和短期持有者

⏰ 时间范围：
• 上一周 - 从上周一到上周日
• 上个月 - 从上个月第一天到最后一天

💡 使用 /menu 显示菜单按钮，或使用命令：
/supply - 查询供应量
/exchange - 查询交易所余额
/mvrv - 查询 MVRV
/week - 设置时间范围为上一周
/month - 设置时间范围为上个月
/menu - 显示主菜单

当前时间范围：${timeRangeText}
`;
        ctx.reply(helpText, { parse_mode: 'Markdown', ...getMainMenu() });
    });

    // 开始命令
    bot.command('start', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'command_start');
        const welcomeText = `
👋 欢迎使用 Glassnode 数据查询机器人！

我可以帮你查询以下数据：
• 📈 供应量变化（BTC 长期和短期持有者）
• 📊 交易所余额变化（ETH, DOGE, BTC, SOL, EIGEN）
• 💰 MVRV 变化（BTC 长期和短期持有者）

💡 使用下方菜单按钮快速操作，无需输入命令！
`;
        ctx.reply(welcomeText, getMainMenu());
        // 初始化用户时间范围
        if (!userTimeRange.has(ctx.from.id)) {
            userTimeRange.set(ctx.from.id, 'week');
        }
    });

    // 菜单命令
    bot.command('menu', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'command_menu');
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
        ctx.reply(`📋 主菜单\n\n当前时间范围：${timeRangeText}`, getMainMenu());
    });

    // 设置命令菜单（管理员命令，用于测试）
    bot.command('setupmenu', async (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'command_setupmenu');
        try {
            await ctx.reply('⏳ 正在设置命令菜单...');
            const result = await setupCommandsMenu(bot);
            if (result) {
                await ctx.reply('✅ 命令菜单设置成功！\n\n请尝试：\n1. 关闭并重新打开与机器人的对话\n2. 点击左下角的菜单按钮查看命令');
            } else {
                await ctx.reply('❌ 命令菜单设置失败，请查看服务器日志');
            }
        } catch (error) {
            await ctx.reply(`❌ 设置失败: ${error.message}`);
        }
    });

    // 设置时间范围为上一周
    bot.command('week', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'command_week', { timeRange: 'week' });
        userTimeRange.set(ctx.from.id, 'week');
        ctx.reply('✅ 已设置时间范围为：**上一周**', { parse_mode: 'Markdown', ...getMainMenu() });
    });

    // 设置时间范围为上个月
    bot.command('month', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'command_month', { timeRange: 'month' });
        userTimeRange.set(ctx.from.id, 'month');
        ctx.reply('✅ 已设置时间范围为：**上个月**', { parse_mode: 'Markdown', ...getMainMenu() });
    });

    // 处理按钮回调
    bot.action('show_menu', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'action_show_menu');
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
        ctx.editMessageText(`📋 主菜单\n\n当前时间范围：${timeRangeText}`, getMainMenu());
    });

    // 显示帮助
    bot.action('show_help', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'action_show_help');
        const helpText = `
🤖 **Glassnode 数据查询机器人**

**可用功能：**

📊 数据查询：
• 📈 供应量查询 - BTC 长期和短期持有者
• 📊 交易所余额 - ETH, DOGE, BTC, SOL, EIGEN
• 💰 MVRV 查询 - BTC 长期和短期持有者

⏰ 时间范围：
• 上一周 - 从上周一到上周日
• 上个月 - 从上个月第一天到最后一天

💡 使用菜单按钮快速操作，或使用命令：
/supply - 查询供应量
/exchange - 查询交易所余额
/mvrv - 查询 MVRV
/week - 设置时间范围为上一周
/month - 设置时间范围为上个月
/menu - 显示主菜单
`;
        ctx.editMessageText(helpText, { parse_mode: 'Markdown', ...getBackMenuButton() });
    });

    // 设置时间范围为上一周（按钮）
    bot.action('set_week', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'action_set_week', { timeRange: 'week' });
        userTimeRange.set(ctx.from.id, 'week');
        ctx.answerCbQuery('✅ 已设置时间范围为：上一周');
        const timeRangeText = '上一周';
        ctx.editMessageText(`📋 主菜单\n\n当前时间范围：${timeRangeText}`, getMainMenu());
    });

    // 设置时间范围为上个月（按钮）
    bot.action('set_month', (ctx) => {
        logUserAction(ctx.from.id, ctx.from.username, 'action_set_month', { timeRange: 'month' });
        userTimeRange.set(ctx.from.id, 'month');
        ctx.answerCbQuery('✅ 已设置时间范围为：上个月');
        const timeRangeText = '上个月';
        ctx.editMessageText(`📋 主菜单\n\n当前时间范围：${timeRangeText}`, getMainMenu());
    });

    // 查询供应量（按钮）
    bot.action('query_supply', async (ctx) => {
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        logUserAction(ctx.from.id, ctx.from.username, 'action_query_supply', { timeRange });
        try {
            await ctx.answerCbQuery('⏳ 正在查询供应量数据...');
            const { startDate, endDate } = calculateTimeRange(timeRange);
            const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
            const timeInfo = `📅 时间范围：${timeRangeText}\n${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`;

            const result = await getSupply(startDate, endDate);
            await ctx.editMessageText(timeInfo + '\n' + result, { 
                parse_mode: 'Markdown', 
                ...getBackMenuButton() 
            });
            logUserAction(ctx.from.id, ctx.from.username, 'action_query_supply', { timeRange, success: true });
        } catch (error) {
            logUserAction(ctx.from.id, ctx.from.username, 'action_query_supply', { timeRange, success: false, error: error.message });
            ctx.editMessageText(`❌ 错误：${error.message}`, getBackMenuButton());
        }
    });

    // 查询交易所余额（按钮）
    bot.action('query_exchange', async (ctx) => {
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        logUserAction(ctx.from.id, ctx.from.username, 'action_query_exchange', { timeRange });
        try {
            await ctx.answerCbQuery('⏳ 正在查询交易所余额数据...');
            const { startDate, endDate } = calculateTimeRange(timeRange);
            const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
            const timeInfo = `📅 时间范围：${timeRangeText}\n${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`;

            const result = await getExchangeBalance(startDate, endDate);
            await ctx.editMessageText(timeInfo + '\n' + result, { 
                parse_mode: 'Markdown', 
                ...getBackMenuButton() 
            });
            logUserAction(ctx.from.id, ctx.from.username, 'action_query_exchange', { timeRange, success: true });
        } catch (error) {
            logUserAction(ctx.from.id, ctx.from.username, 'action_query_exchange', { timeRange, success: false, error: error.message });
            ctx.editMessageText(`❌ 错误：${error.message}`, getBackMenuButton());
        }
    });

    // 查询 MVRV（按钮）
    bot.action('query_mvrv', async (ctx) => {
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        logUserAction(ctx.from.id, ctx.from.username, 'action_query_mvrv', { timeRange });
        try {
            await ctx.answerCbQuery('⏳ 正在查询 MVRV 数据...');
            const { startDate, endDate } = calculateTimeRange(timeRange);
            const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
            const timeInfo = `📅 时间范围：${timeRangeText}\n${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`;

            const result = await getMVRV(startDate, endDate);
            await ctx.editMessageText(timeInfo + '\n' + result, { 
                parse_mode: 'Markdown', 
                ...getBackMenuButton() 
            });
            logUserAction(ctx.from.id, ctx.from.username, 'action_query_mvrv', { timeRange, success: true });
        } catch (error) {
            logUserAction(ctx.from.id, ctx.from.username, 'action_query_mvrv', { timeRange, success: false, error: error.message });
            ctx.editMessageText(`❌ 错误：${error.message}`, getBackMenuButton());
        }
    });

    // 查询供应量（命令）
    bot.command('supply', async (ctx) => {
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        logUserAction(ctx.from.id, ctx.from.username, 'command_supply', { timeRange });
        try {
            const { startDate, endDate } = calculateTimeRange(timeRange);
            const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
            const timeInfo = `📅 时间范围：${timeRangeText}\n${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`;

            await ctx.reply('⏳ 正在查询供应量数据...');
            const result = await getSupply(startDate, endDate);
            await ctx.reply(timeInfo + '\n' + result, { 
                parse_mode: 'Markdown',
                ...getBackMenuButton()
            });
            logUserAction(ctx.from.id, ctx.from.username, 'command_supply', { timeRange, success: true });
        } catch (error) {
            logUserAction(ctx.from.id, ctx.from.username, 'command_supply', { timeRange, success: false, error: error.message });
            ctx.reply(`❌ 错误：${error.message}`, getBackMenuButton());
        }
    });

    // 查询交易所余额（命令）
    bot.command('exchange', async (ctx) => {
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        logUserAction(ctx.from.id, ctx.from.username, 'command_exchange', { timeRange });
        try {
            const { startDate, endDate } = calculateTimeRange(timeRange);
            const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
            const timeInfo = `📅 时间范围：${timeRangeText}\n${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`;

            await ctx.reply('⏳ 正在查询交易所余额数据...');
            const result = await getExchangeBalance(startDate, endDate);
            await ctx.reply(timeInfo + '\n' + result, { 
                parse_mode: 'Markdown',
                ...getBackMenuButton()
            });
            logUserAction(ctx.from.id, ctx.from.username, 'command_exchange', { timeRange, success: true });
        } catch (error) {
            logUserAction(ctx.from.id, ctx.from.username, 'command_exchange', { timeRange, success: false, error: error.message });
            ctx.reply(`❌ 错误：${error.message}`, getBackMenuButton());
        }
    });

    // 查询 MVRV（命令）
    bot.command('mvrv', async (ctx) => {
        const timeRange = userTimeRange.get(ctx.from.id) || 'week';
        logUserAction(ctx.from.id, ctx.from.username, 'command_mvrv', { timeRange });
        try {
            const { startDate, endDate } = calculateTimeRange(timeRange);
            const timeRangeText = timeRange === 'month' ? '上个月' : '上一周';
            const timeInfo = `📅 时间范围：${timeRangeText}\n${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 至 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`;

            await ctx.reply('⏳ 正在查询 MVRV 数据...');
            const result = await getMVRV(startDate, endDate);
            await ctx.reply(timeInfo + '\n' + result, { 
                parse_mode: 'Markdown',
                ...getBackMenuButton()
            });
            logUserAction(ctx.from.id, ctx.from.username, 'command_mvrv', { timeRange, success: true });
        } catch (error) {
            logUserAction(ctx.from.id, ctx.from.username, 'command_mvrv', { timeRange, success: false, error: error.message });
            ctx.reply(`❌ 错误：${error.message}`, getBackMenuButton());
        }
    });

    // 错误处理
    bot.catch((err, ctx) => {
        const userId = ctx.from?.id || 'unknown';
        const username = ctx.from?.username || 'unknown';
        logUserAction(userId, username, 'error', { 
            updateType: ctx.updateType, 
            error: err.message,
            stack: err.stack 
        });
        console.error(`错误发生在 ${ctx.updateType}:`, err);
        ctx.reply('❌ 发生了一个错误，请稍后重试或联系管理员');
    });
}

