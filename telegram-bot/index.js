import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { logFunctionCall } from './log.js';
import { registerBotActions, setupCommandsMenu } from './bot-actions.js';

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

// 创建机器人实例
const bot = new Telegraf(getBotToken());

// 注册所有 bot 命令和动作处理器
registerBotActions(bot);

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
        await setupCommandsMenu(bot);
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
