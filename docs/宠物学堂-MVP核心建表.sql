-- 宠物学堂 MVP 核心数据模型（PostgreSQL 16）
-- 说明：这是研发评审稿，不会自动连接或修改任何数据库；正式项目必须由 Flyway 执行。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE family (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timezone varchar(64) NOT NULL DEFAULT 'Asia/Shanghai',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);

CREATE TABLE guardian (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_hash varchar(128) NOT NULL UNIQUE,
    status varchar(24) NOT NULL CHECK (status IN ('active','frozen','deleting')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);

CREATE TABLE family_guardian (
    family_id uuid NOT NULL REFERENCES family(id),
    guardian_id uuid NOT NULL REFERENCES guardian(id),
    role varchar(24) NOT NULL CHECK (role IN ('owner','guardian')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (family_id, guardian_id)
);

CREATE TABLE child_profile (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id uuid NOT NULL REFERENCES family(id),
    nickname varchar(32) NOT NULL,
    grade_level varchar(32) NOT NULL CHECK (grade_level IN ('preschool','transition','grade1_basic','grade1_review')),
    status varchar(24) NOT NULL CHECK (status IN ('active','frozen','deleting')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);
CREATE INDEX idx_child_profile_family_status ON child_profile(family_id, status);

CREATE TABLE task_plan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    name varchar(80) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status varchar(24) NOT NULL CHECK (status IN ('draft','active','disabled')),
    rule_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_task_plan_child_status ON task_plan(child_id, status, effective_from DESC);

CREATE TABLE daily_plan (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    source_plan_id uuid REFERENCES task_plan(id),
    local_date date NOT NULL,
    family_timezone varchar(64) NOT NULL,
    required_count integer NOT NULL DEFAULT 0 CHECK (required_count >= 0),
    confirmed_required_count integer NOT NULL DEFAULT 0 CHECK (confirmed_required_count >= 0),
    status varchar(24) NOT NULL CHECK (status IN ('active','completed','closed')),
    generated_key varchar(160) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    UNIQUE (child_id, local_date),
    UNIQUE (generated_key),
    CHECK (confirmed_required_count <= required_count)
);

CREATE TABLE task_instance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id uuid NOT NULL REFERENCES daily_plan(id),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    title varchar(120) NOT NULL,
    subject varchar(24) NOT NULL,
    task_type varchar(40) NOT NULL,
    is_required boolean NOT NULL DEFAULT true,
    confirmation_mode varchar(24) NOT NULL CHECK (confirmation_mode IN ('automatic','guardian')),
    content_snapshot jsonb NOT NULL,
    status varchar(24) NOT NULL CHECK (status IN ('pending','submitted','confirmed','rejected','cancelled')),
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);
CREATE INDEX idx_task_instance_daily_sort ON task_instance(daily_plan_id, sort_order, id);
CREATE INDEX idx_task_instance_child_status ON task_instance(child_id, status, created_at DESC);

CREATE TABLE submission (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_instance_id uuid NOT NULL REFERENCES task_instance(id),
    attempt_no integer NOT NULL CHECK (attempt_no > 0),
    payload_json jsonb NOT NULL,
    status varchar(24) NOT NULL CHECK (status IN ('submitted','confirmed','rejected')),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    confirmed_by uuid REFERENCES guardian(id),
    confirmed_at timestamptz,
    reject_reason varchar(240),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (task_instance_id, attempt_no)
);

CREATE TABLE daily_reward_claim (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    daily_plan_id uuid NOT NULL REFERENCES daily_plan(id),
    local_date date NOT NULL,
    status varchar(24) NOT NULL CHECK (status IN ('locked','available','claimed')),
    star_amount integer CHECK (star_amount IS NULL OR star_amount >= 0),
    claimed_at timestamptz,
    idempotency_key uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    UNIQUE (child_id, local_date),
    UNIQUE (child_id, idempotency_key),
    CHECK ((status <> 'claimed') OR (claimed_at IS NOT NULL AND star_amount IS NOT NULL))
);

CREATE TABLE reward_balance (
    child_id uuid PRIMARY KEY REFERENCES child_profile(id),
    star_balance integer NOT NULL DEFAULT 0 CHECK (star_balance >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);

CREATE TABLE reward_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    direction varchar(8) NOT NULL CHECK (direction IN ('credit','debit')),
    amount integer NOT NULL CHECK (amount > 0),
    reason varchar(40) NOT NULL CHECK (reason IN ('daily_package','pet_feeding','manual_correction')),
    reference_type varchar(40) NOT NULL,
    reference_id uuid NOT NULL,
    idempotency_key uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (child_id, idempotency_key)
);
CREATE INDEX idx_reward_ledger_child_created ON reward_ledger(child_id, created_at DESC, id DESC);

CREATE TABLE pet_catalog (
    code varchar(40) PRIMARY KEY,
    display_name varchar(40) NOT NULL,
    tier varchar(16) NOT NULL CHECK (tier IN ('basic','fantasy','future')),
    unlock_rule_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    status varchar(24) NOT NULL CHECK (status IN ('available','locked','coming_soon')),
    sort_order integer NOT NULL DEFAULT 0
);

-- 产品数值配置只影响之后生成的计划或互动；历史结算通过快照字段保留原值。
CREATE TABLE product_rule_config (
    config_key varchar(80) PRIMARY KEY,
    config_value_json jsonb NOT NULL,
    effective_from timestamptz NOT NULL,
    status varchar(16) NOT NULL CHECK (status IN ('draft','active','retired')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);

INSERT INTO product_rule_config(config_key, config_value_json, effective_from, status) VALUES
('daily_reward', '{"stars":20,"min":5,"max":50}'::jsonb, now(), 'active'),
('feeding', '{"starCost":5,"growthDelta":5,"dailyLimit":4}'::jsonb, now(), 'active'),
('pet_stage_thresholds', '{"juvenile":50,"growth":200,"mature":500}'::jsonb, now(), 'active');

CREATE TABLE child_milestone_counter (
    child_id uuid NOT NULL REFERENCES child_profile(id),
    milestone_code varchar(64) NOT NULL,
    counter_value integer NOT NULL DEFAULT 0 CHECK (counter_value >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (child_id, milestone_code)
);

CREATE TABLE pet_unlock_eligibility (
    child_id uuid NOT NULL REFERENCES child_profile(id),
    pet_code varchar(40) NOT NULL REFERENCES pet_catalog(code),
    unlocked_at timestamptz NOT NULL,
    rule_snapshot_json jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (child_id, pet_code)
);

CREATE TABLE child_pet (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    pet_code varchar(40) NOT NULL REFERENCES pet_catalog(code),
    nickname varchar(32) NOT NULL,
    stage varchar(16) NOT NULL CHECK (stage IN ('nursing','juvenile','growth','mature')),
    growth_value integer NOT NULL DEFAULT 0 CHECK (growth_value >= 0),
    is_current boolean NOT NULL DEFAULT false,
    adopted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0,
    UNIQUE (child_id, pet_code)
);
CREATE UNIQUE INDEX uk_child_pet_current ON child_pet(child_id) WHERE is_current;
CREATE INDEX idx_child_pet_child_adopted ON child_pet(child_id, adopted_at, id);

CREATE TABLE pet_state (
    pet_id uuid PRIMARY KEY REFERENCES child_pet(id),
    satiety smallint NOT NULL DEFAULT 80 CHECK (satiety BETWEEN 0 AND 100),
    cleanliness smallint NOT NULL DEFAULT 80 CHECK (cleanliness BETWEEN 0 AND 100),
    happiness smallint NOT NULL DEFAULT 80 CHECK (happiness BETWEEN 0 AND 100),
    energy smallint NOT NULL DEFAULT 80 CHECK (energy BETWEEN 0 AND 100),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version bigint NOT NULL DEFAULT 0
);

CREATE TABLE pet_interaction (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id uuid NOT NULL REFERENCES child_profile(id),
    pet_id uuid NOT NULL REFERENCES child_pet(id),
    interaction_type varchar(24) NOT NULL CHECK (interaction_type IN ('feed','clean','pet','play','rest')),
    star_cost integer NOT NULL DEFAULT 0 CHECK (star_cost >= 0),
    growth_delta integer NOT NULL DEFAULT 0 CHECK (growth_delta >= 0),
    state_delta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (child_id, idempotency_key)
);
CREATE INDEX idx_pet_interaction_pet_created ON pet_interaction(pet_id, created_at DESC, id DESC);
CREATE INDEX idx_pet_interaction_child_day ON pet_interaction(child_id, created_at DESC)
    WHERE interaction_type = 'feed' AND star_cost > 0;

-- 【注意】领取礼包必须在一个事务内锁定 daily_reward_claim 与 reward_balance，追加账本后再提交。
-- 【注意】投喂必须在一个事务内条件扣减余额、追加账本、写互动记录并更新宠物状态，任何一步失败整体回滚。
-- 【注意】每日 4 次投喂上限按家庭时区计算；并发请求必须在事务中统计并锁定孩子余额，不能仅靠前端禁用按钮。
-- 【注意】解锁资格一经写入 pet_unlock_eligibility 不得因后续配置提高门槛而撤销。
-- 【注意】所有 child_id 都必须由服务端根据监护关系再次校验，不能只相信请求头。
