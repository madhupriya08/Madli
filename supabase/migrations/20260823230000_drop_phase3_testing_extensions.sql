-- Phase 4 §7: closes a real migration-reproducibility gap found during this
-- phase's database audit. Phase 3 enabled pg_net and http (via
-- 20260821040058_enable_pg_net_for_phase3_integration_testing.sql and
-- 20260821040748_enable_http_extension_for_phase3_patch_testing.sql) purely
-- as a workaround to exercise real HTTP round trips from Postgres in a
-- sandbox that could not reach the project directly, then dropped both
-- afterward — but only via raw SQL, never as a tracked migration. That left
-- the migration *history* saying both extensions end up installed, while the
-- live project has neither (confirmed via list_extensions:
-- installed_version is null for both) — replaying migrations from a clean
-- environment would silently diverge from the current live state. This
-- migration is idempotent (IF EXISTS) so it is a no-op against the current
-- live project and a correct no-op-at-the-end when replayed from scratch.
drop extension if exists pg_net;
drop extension if exists http;
