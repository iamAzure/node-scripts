import dayjs from 'dayjs';
import { Command } from 'commander';
import { fetchSupply, fetchBalanceExchanges, fetchMVRV } from './glass-api.js';

const program = new Command();

function printDiff(data, symbol) {
    // 找到第一个非零值作为起始点（如果第一个值是0）
    const first = data[0];
    const last = data[data.length - 1];
    const diff = last.v - first.v;
    const diffPercentage = ((diff / first.v) * 100).toFixed(2);
    console.log(`${symbol} PreValue: ${first.v} PostValue: ${last.v} Diff: ${diff}(${diffPercentage}%)`);
};

async function printExchangeBalance(startDate, endDate) {
    const [ethData, dogeData, btcData, solData, eigenData] = await Promise.all([
        fetchBalanceExchanges({ symbol: 'ETH', startDate, endDate }),
        fetchBalanceExchanges({ symbol: 'DOGE', startDate, endDate }),
        fetchBalanceExchanges({ symbol: 'BTC', startDate, endDate }),
        fetchBalanceExchanges({ symbol: 'SOL', startDate, endDate }),
        fetchBalanceExchanges({ symbol: 'EIGEN', startDate, endDate }),
    ]);
    printDiff(ethData, 'ETH 交易所余额');
    printDiff(dogeData, 'DOGE 交易所余额');
    printDiff(btcData, 'BTC 交易所余额');
    printDiff(solData, 'SOL 交易所余额');
    printDiff(eigenData, 'EIGEN 交易所余额');
};

async function printSupply(startDate, endDate) {
    const [btcLongTermHoldersData, btcShortTermHoldersData] = await fetchSupply({ symbol: 'BTC', startDate, endDate });
    printDiff(btcLongTermHoldersData, 'BTC 长期持有者');
    printDiff(btcShortTermHoldersData, 'BTC 短期持有者');
};

async function printMVRV(startDate, endDate) {
    const [btcMVRVData, ethMVRVData] = await fetchMVRV({ symbol: 'BTC', startDate, endDate });
    printDiff(btcMVRVData, 'BTC MVRV');

};
// 根据时间范围计算开始和结束时间
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
        // 默认：上一周（保持原有逻辑）
        const lastWeek = dayjs().subtract(1, 'week');
        startDate = lastWeek.startOf('week').unix();
        endDate = lastWeek.endOf('week').unix();
    }

    return { startDate, endDate };
}

async function main(options) {
    // 如果没有提供任何查询类型参数，显示帮助信息
    if (!options.supply && !options.exchangeBalances && !options.mvrv) {
        program.help();
        return;
    }

    // 计算时间范围
    const { startDate, endDate } = calculateTimeRange(options.timeRange);
    const timeRangeText = options.timeRange === 'month' ? '上个月' : '上一周';
    console.log(`查询时间范围 (${timeRangeText}): ${dayjs.unix(startDate).format('YYYY-MM-DD HH:mm:ss')} 到 ${dayjs.unix(endDate).format('YYYY-MM-DD HH:mm:ss')}\n`);

    if (options.exchangeBalances) {
        await printExchangeBalance(startDate, endDate);
    }

    if (options.supply) {
        await printSupply(startDate, endDate);
    }

    if (options.mvrv) {
        await printMVRV(startDate, endDate);
    }
}

// 配置命令行程序
program
    .name('glass-node')
    .description('Glassnode API 查询工具')
    .helpOption('-h, --help', '显示帮助信息')
    .option('-s, --supply', '查询供应量信息')
    .option('-e, --exchange-balances', '查询交易所余额信息')
    .option('-w, --week', '查询上一周的变化量')
    .option('-m, --month', '查询上个月的变化量')
    .option('-v, --mvrv', '查询MVRV信息')
    .action(async (options) => {
        // 确定时间范围（优先使用 month，否则使用 week，默认 week）
        options.timeRange = options.month ? 'month' : (options.week ? 'week' : 'week');
        await main(options);
    });

// 解析命令行参数
program.parse();
