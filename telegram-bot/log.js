import dayjs from 'dayjs';

/**
 * 记录函数调用
 * @param {string} functionName - 函数名称
 * @param {object} params - 参数对象
 */
export function logFunctionCall(functionName, params = {}) {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const logData = {
        timestamp,
        function: functionName,
        ...params
    };
    console.log(`[LOG] ${JSON.stringify(logData)}`);
}

/**
 * 记录用户操作
 * @param {number|string} userId - 用户ID
 * @param {string} username - 用户名
 * @param {string} action - 操作类型
 * @param {object} params - 额外参数
 */
export function logUserAction(userId, username, action, params = {}) {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const logData = {
        timestamp,
        userId,
        username: username || 'unknown',
        action,
        ...params
    };
    console.log(`[USER_ACTION] ${JSON.stringify(logData)}`);
}

/**
 * 记录API调用
 * @param {string} functionName - API函数名称
 * @param {object} params - API参数
 * @param {boolean} success - 是否成功
 * @param {Error|null} error - 错误对象（如果有）
 */
export function logApiCall(functionName, params = {}, success = true, error = null) {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const logData = {
        timestamp,
        function: functionName,
        params,
        success,
        error: error ? error.message : null
    };
    console.log(`[API_CALL] ${JSON.stringify(logData)}`);
}

