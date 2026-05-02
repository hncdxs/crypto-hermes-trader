-- Crypto Hermes Trader 数据库初始化

-- LLM 配置
CREATE TABLE IF NOT EXISTS llm_config (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider    VARCHAR(50) NOT NULL,
    api_key     TEXT NOT NULL,
    model       VARCHAR(100) NOT NULL,
    base_url    TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- 交易所账户
CREATE TABLE IF NOT EXISTS exchange_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('demo', 'live')),
    api_key     TEXT NOT NULL,
    secret_key  TEXT NOT NULL,
    passphrase  TEXT NOT NULL,
    site        VARCHAR(20) DEFAULT 'global',
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 策略（只负责交易逻辑）
CREATE TABLE IF NOT EXISTS strategies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL UNIQUE,
    indicators      JSONB NOT NULL DEFAULT '[]',       -- 指标配置: [{"name":"MA","params":{"period":5}}, ...]
    description     TEXT NOT NULL DEFAULT '',           -- 策略描述（大输入框，开仓/平仓/止损条件）
    status          VARCHAR(20) DEFAULT 'active',
    current_version VARCHAR(10) DEFAULT 'v1',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 策略版本历史
CREATE TABLE IF NOT EXISTS strategy_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    version     VARCHAR(10) NOT NULL,
    content     TEXT NOT NULL,                         -- 完整策略快照（JSON）
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(strategy_id, version)
);

-- 交易员（负责执行配置 + 运行参数）
CREATE TABLE IF NOT EXISTS traders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(100) NOT NULL,
    strategy_id          UUID REFERENCES strategies(id) ON DELETE SET NULL,
    -- 周期配置
    main_period          VARCHAR(20) NOT NULL DEFAULT '5m',   -- 主周期(K线): 5m,15m,1h,4h,1d
    ref_period           VARCHAR(20) NOT NULL DEFAULT '1h',   -- 参考周期: 15m,1h,4h,1d,1w
    scan_interval        VARCHAR(20) NOT NULL DEFAULT '5m',   -- 扫描周期(脚本间隔): 1m,5m,15m,30m,1h
    -- 交易类型
    trade_type           VARCHAR(20) NOT NULL DEFAULT 'spot',         -- spot, swap_cross, swap_isolated
    -- 币种
    symbols              JSONB NOT NULL DEFAULT '[]',         -- ["BTC-USDT","ETH-USDT"]
    -- 关联
    llm_config_id        UUID REFERENCES llm_config(id),
    exchange_account_id  UUID REFERENCES exchange_accounts(id),
    -- 子代理温度
    executor_temp        DECIMAL(3,2) DEFAULT 0.30,          -- Executor 温度，默认 0.3
    risk_temp            DECIMAL(3,2) DEFAULT 0.30,           -- Risk 温度，默认 0.3
    -- 状态
    status               VARCHAR(20) DEFAULT 'stopped',      -- stopped, running, paused
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- 决策日志（Monitor → Master → Executor 完整链路）
CREATE TABLE IF NOT EXISTS decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id       UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    strategy_id     UUID REFERENCES strategies(id),
    scan_interval   VARCHAR(20),                         -- 本次决策的扫描周期
    symbol          VARCHAR(20) NOT NULL,
    signal          VARCHAR(20) NOT NULL,                -- long, short, close, hold
    confidence      DECIMAL(5,2) DEFAULT 0,              -- 置信度 0-100
    monitor_output  TEXT,                                -- Monitor 输出的提示词原文
    master_reason   TEXT,                                -- Master 的分析推理
    master_chain    TEXT,                                -- AI 思维链完整内容
    decision_chain  JSONB,                               -- 完整决策过程
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 仓位记录
CREATE TABLE IF NOT EXISTS positions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id   UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES strategies(id),
    symbol      VARCHAR(20) NOT NULL,
    side        VARCHAR(10) NOT NULL,                    -- long, short
    open_price  DECIMAL(20, 8),
    close_price DECIMAL(20, 8),
    quantity    DECIMAL(20, 8),
    pnl         DECIMAL(20, 8),
    fee         DECIMAL(20, 8),
    open_time   TIMESTAMP,
    close_time  TIMESTAMP,
    status      VARCHAR(20) DEFAULT 'open'               -- open, closed
);

-- 子代理配置
CREATE TABLE IF NOT EXISTS agent_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id       UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    agent_type      VARCHAR(50) NOT NULL,                -- monitor, master, executor, risk
    llm_config_id   UUID REFERENCES llm_config(id),
    temperature     DECIMAL(3,2) DEFAULT 0.30,           -- AI 温度
    system_prompt   TEXT DEFAULT '',                      -- 角色系统提示词（用户可自定义）
    cron_expression VARCHAR(100),                        -- 定时表达式
    status          VARCHAR(20) DEFAULT 'idle',          -- idle, running, error
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 插件注册表
CREATE TABLE IF NOT EXISTS plugins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    version     VARCHAR(20) NOT NULL,
    enabled     BOOLEAN DEFAULT TRUE,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMP DEFAULT NOW()
);
