# 测试说明

## 前置条件

1. 安装依赖：
```bash
pnpm install
```

2. 确保已配置 `.env` 文件，包含 `API_KEY`

## 测试命令

### 1. 测试帮助信息
```bash
node glass-node.js --help
```

预期输出：显示所有可用选项和说明

### 2. 测试无参数（应显示帮助）
```bash
node glass-node.js
```

预期输出：显示帮助信息

### 3. 测试查询上一周的供应量
```bash
node glass-node.js -s -w
# 或
node glass-node.js --supply --week
```

预期输出：显示上一周的供应量数据

### 4. 测试查询上个月的交易所余额
```bash
node glass-node.js -e -m
# 或
node glass-node.js --exchange-balances --month
```

预期输出：显示上个月的交易所余额数据

### 5. 测试同时查询供应量和交易所余额
```bash
node glass-node.js -s -e -w
```

预期输出：同时显示供应量和交易所余额数据

### 6. 测试默认时间范围（上一周）
```bash
node glass-node.js -s
```

预期输出：默认查询上一周的数据

## 验证点

- ✅ 命令行参数解析正确
- ✅ 时间范围计算正确
- ✅ API 调用成功
- ✅ 数据输出格式正确
- ✅ 帮助信息显示正确

