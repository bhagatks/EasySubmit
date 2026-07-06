-- Remove deprecated app_config.aiConfig row (unused since aiEngine + dataRefresh).
-- Safe to run on prod — no runtime code reads this key after 2026-07-06.
DELETE FROM app_config WHERE key = 'aiConfig';
