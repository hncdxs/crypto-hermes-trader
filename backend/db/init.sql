-- Crypto AI Trader 数据库初始化

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

-- 策略
CREATE TABLE IF NOT EXISTS strategies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL UNIQUE,
    current_version VARCHAR(10) DEFAULT 'v1',
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 策略版本
CREATE TABLE IF NOT EXISTS strategy_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    version     VARCHAR(10) NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(strategy_id, version)
);

-- 交易员
CREATE TABLE IF NOT EXISTS traders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(100) NOT NULL,
    llm_config_id        UUID REFERENCES llm_config(id),
    exchange_account_id  UUID REFERENCES exchange_accounts(id),
    strategy_version_id  UUID REFERENCES strategy_versions(id),
    status               VARCHAR(20) DEFAULT 'stopped',
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- 监控交易对
CREATE TABLE IF NOT EXISTS monitored_symbols (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id  UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    symbol     VARCHAR(20) NOT NULL,
    status     VARCHAR(20) DEFAULT 'active',
    added_at   TIMESTAMP DEFAULT NOW()
);

-- 决策日志
CREATE TABLE IF NOT EXISTS decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id       UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    symbol          VARCHAR(20) NOT NULL,
    signal          VARCHAR(20) NOT NULL,
    decision_chain  JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 仓位记录
CREATE TABLE IF NOT EXISTS positions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id   UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    symbol      VARCHAR(20) NOT NULL,
    side        VARCHAR(10) NOT NULL,
    open_price  DECIMAL(20, 8),
    close_price DECIMAL(20, 8),
    pnl         DECIMAL(20, 8),
    fee         DECIMAL(20, 8),
    open_time   TIMESTAMP,
    close_time  TIMESTAMP
);

-- 子代理配置
CREATE TABLE IF NOT EXISTS agent_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trader_id       UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
    agent_type      VARCHAR(50) NOT NULL,
    llm_config_id   UUID REFERENCES llm_config(id),
    status          VARCHAR(20) DEFAULT 'idle',
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
