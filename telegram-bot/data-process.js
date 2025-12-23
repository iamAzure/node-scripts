import dayjs from 'dayjs';
import { fetchSupply, fetchBalanceExchanges, fetchMVRV } from './glass-api.js';
import { logFunctionCall } from './log.js';

// 计算时间范围
export function calculateTimeRange(timeRange) {
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
export function formatDiff(data, symbol) {
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
export async function getExchangeBalance(startDate, endDate) {
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
export async function getSupply(startDate, endDate) {
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
export async function getMVRV(startDate, endDate) {
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

