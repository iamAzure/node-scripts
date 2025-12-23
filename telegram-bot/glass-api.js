import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

function getApiKey() {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        console.error('错误: 请设置 API_KEY 环境变量');
        console.error('请在项目根目录创建 .env 文件，并添加: API_KEY=your_api_key_here');
        process.exit(1);
    }
    return API_KEY;
}

const BASE_URL = 'https://grassnoodle.cloud';
const API_BALANCE_EXCHANGES = '/v1/metrics/distribution/balance_exchanges';
const API_LTH_SUPPLY = '/v1/metrics/supply/lth_sum';
const API_STH_SUPPLY = '/v1/metrics/supply/sth_sum';
const API_STH_MVRV = 'v1/metrics/market/mvrv_less_155';
const API_LTH_MVRV = 'v1/metrics/market/mvrv_more_155';

export function fetchMVRV(params) {
    const API_KEY = getApiKey();
    const queryParams = {
        'a': params.symbol,
        'i': '24h',
        's': params.startDate,
        'u': params.endDate,
    }
    return Promise.all([
        axios({
            method: 'GET',
            url: API_LTH_MVRV,
            baseURL: BASE_URL,
            params: queryParams,
            headers: { 'x-key': API_KEY },
        }).then(response => response.data),
        axios({
            method: 'GET',
            url: API_STH_MVRV,
            baseURL: BASE_URL,
            params: queryParams,
            headers: { 'x-key': API_KEY },
        }).then(response => response.data),
    ]);
}

export function fetchSupply(params) {
    const API_KEY = getApiKey();
    return Promise.all([
        axios({
            method: 'GET',
            url: API_LTH_SUPPLY,
            baseURL: BASE_URL,
            headers: { 'x-key': API_KEY },
            params: { 'a': params.symbol, 'i': '24h', 's': params.startDate, 'u': params.endDate }
        }).then(response => response.data),
        axios({
            method: 'GET',
            url: API_STH_SUPPLY,
            baseURL: BASE_URL,
            headers: { 'x-key': API_KEY },
            params: { 'a': params.symbol, 'i': '24h', 's': params.startDate, 'u': params.endDate }
        }).then(response => response.data),
    ]);
}

export function fetchBalanceExchanges(params) {
    const API_KEY = getApiKey();
    return axios({
        method: 'GET',
        url: API_BALANCE_EXCHANGES,
        baseURL: BASE_URL,
        headers: { 'x-key': API_KEY },
        params: { 'a': params.symbol, 'i': '24h', 's': params.startDate, 'u': params.endDate }
    }).then(response => response.data);
}

