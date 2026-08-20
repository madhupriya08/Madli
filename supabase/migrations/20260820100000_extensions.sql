-- Phase 1: extensions required by later migrations.
-- pgcrypto and uuid-ossp are already installed on this project; this is here for
-- reproducibility from a clean environment.
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
