import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import { fetchSupply, fetchBalanceExchanges, fetchMVRV } from './glass-api.js';
import { logFunctionCall, logUserAction } from './log.js';

dotenv.config();

// 获取环境变量
function getBotToken() {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
        console.error('错误: 请设置 BOT_TOKEN 环境变量');
        console.error('请在项目根目录的 .env 文件中添加: BOT_TOKEN=your_telegram_bot_token');
        process.exit(1);
    }
    return BOT_TOKEN;
}

// 计算时间范围
function calculateTimeRange(timeRange) {
    let startDate, endDate;

    if (timeRange === 'week') {
        // 上一周：从上周一开始到上周日结束
        const lastWeek = dayjs().subtract(1, 'week');
        startDate = lastWeek.startOf('week').unix();
        endDate = lastWeek.endOf('week').unix();
    } else if (timeRange === 'month') {
        // 上个月：从上个月第一天到最后一天
        const lastMonth = dayjs().subtract(1, 'month');
        startDate = lastMonth.startOf('month').unix();
        endDate = lastMonth.endOf('month').unix();
    } else {
        // 默认：上一周
        const lastWeek = dayjs().subtract(1, 'week');
        startDate = lastWeek.startOf('week').unix();
        endDate = lastWeek.endOf('week').unix();
    }

    return { startDate, endDate };
}

// 计算差值并格式化
function formatDiff(data, symbol) {
    if (!data || data.length === 0) {
        return `${symbol}: 无数据`;
    }
    const first = data[0];
    const last = data[data.length - 1];
    const diff = last.v - first.v;
    const diffPercentage = first.v !== 0 ? ((diff / first.v) * 100).toFixed(2) : '0.00';
    const diffSign = diff >= 0 ? '+' : '';
    return `${symbol}\n  起始值: ${first.v.toLocaleString()}\n  结束值: ${last.v.toLocaleString()}\n  变化: ${diffSign}${diff.toLocaleString()} (${diffSign}${diffPercentage}%)`;
}

// 获取交易所余额数据
async function getExchangeBalance(startDate, endDate) {
    logFunctionCall('getExchangeBalance', { startDate, endDate });
    try {
        const [ethData, dogeData, btcData, solData, eigenData] = await Promise.all([
            fetchBalanceExchanges({ symbol: 'ETH', startDate, endDate }),
            fetchBalanceExchanges({ symbol: 'DOGE', startDate, endDate }),
            fetchBalanceExchanges({ symbol: 'BTC', startDate, endDate }),
            fetchBalanceExchanges({ symbol: 'SOL', startDate, endDate }),
            fetchBalanceExchanges({ symbol: 'EIGEN', startDate, endDate }),
        ]);

        const lines = [
            '📊 **交易所余额变化**\n',
            formatDiff(ethData, '🟦 ETH'),
            formatDiff(dogeData, '🟨 DOGE'),
            formatDiff(btcData, '🟧 BTC'),
            formatDiff(solData, '🟣 SOL'),
            formatDiff(eigenData, '🟢 EIGEN'),
        ];

        logFunctionCall('getExchangeBalance', { startDate, endDate, success: true });
        return lines.join('\n\n');
    } catch (error) {
        logFunctionCall('getExchangeBalance', { startDate, endDate, success: false, error: error.message });
        console.error('获取交易所余额失败:', error);
        throw new Error('获取交易所余额数据失败，请稍后重试');
    }
}

// 获取供应量数据
async function getSupply(startDate, endDate) {
    logFunctionCall('getSupply', { startDate, endDate });
    try {
        const [btcLongTermHoldersData, btcShortTermHoldersData] = await fetchSupply({ symbol: 'BTC', startDate, endDate });

        const lines = [
            '📈 **供应量变化**\n',
            formatDiff(btcLongTermHoldersData, '🟧 BTC 长期持有者'),
            formatDiff(btcShortTermHoldersData, '🟧 BTC 短期持有者'),
        ];

        logFunctionCall('getSupply', { startDate, endDate, success: true });
        return lines.join('\n\n');
    } catch (error) {
        logFunctionCall('getSupply', { startDate, endDate, success: false, error: error.message });
        console.error('获取供应量失败:', error);
        throw new Error('获取供应量数据失败，请稍后重试');
    }
}

// 获取 MVRV 数据
async function getMVRV(startDate, endDate) {
    logFunctionCall('getMVRV', { startDate, endDate });
    try {
        const [btcLthMvrv, btcSthMvrv] = await fetchMVRV({ symbol: 'BTC', startDate, endDate });
        const lines = [
            '💰 **MVRV 变化**\n',
            formatDiff(btcLthMvrv, '🟧 BTC 长期持有者 MVRV'),
            formatDiff(btcSthMvrv, '🟧 BTC 短期持有者 MVRV'),
        ];

        logFunctionCall('getMVRV', { startDate, endDate, success: true });
        return lines.join('\n\n');
    } catch (error) {
        logFunctionCall('getMVRV', { startDate, endDate, success: false, error: error.message });
        console.error('获取 MVRV 失败:', error);
        throw new Error('获取 MVRV 数据失败，请稍后重试');
    }
}

// 创建机器人实例
const bot = new Telegraf(getBotToken());

// 设置命令菜单（左下角菜单按钮）
async function setupCommandsMenu() {
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

// 存储用户的时间范围偏好
const userTimeRange = new Map();

// 创建主菜单键盘
function getMainMenu() {
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
function getBackMenuButton() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🔙 返回菜单', 'show_menu')]
    ]);
}

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
        const result = await setupCommandsMenu();
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

// 启动机器人
console.log('🤖 正在启动 Telegram 机器人...');
logFunctionCall('bot_startup', { status: 'starting' });

(async () => {
    try {
        await bot.launch();
        logFunctionCall('bot_startup', { status: 'success' });
        console.log('✅ 机器人已成功启动！');
        
        // 等待一小段时间确保 bot 完全初始化
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 设置命令菜单
        await setupCommandsMenu();
    } catch (error) {
        logFunctionCall('bot_startup', { status: 'failed', error: error.message });
        console.error('❌ 机器人启动失败:', error);
        process.exit(1);
    }
})();

// 优雅关闭
process.once('SIGINT', () => {
    logFunctionCall('bot_shutdown', { signal: 'SIGINT' });
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    logFunctionCall('bot_shutdown', { signal: 'SIGTERM' });
    bot.stop('SIGTERM');
});

