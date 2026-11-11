#!/bin/bash
# fresh DB -> schema -> 5 demo users (as the dashboard would create them) -> seed
cd /home/claude/db && ./reset_testdb.sh
P="su postgres -c"
$P "psql -v ON_ERROR_STOP=1 -q -d sstest -f /home/claude/db/supabase/migrations/20261111000000_initial_schema.sql" 2>&1 | grep -v NOTICE
$P "psql -v ON_ERROR_STOP=1 -q -d sstest -f /home/claude/db/supabase/migrations/20261111000001_security_hardening.sql" 2>&1 | grep -v NOTICE
$P "psql -v ON_ERROR_STOP=1 -q -d sstest" <<'EOF'
insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values
 ('natasha.mwale@example.com', now(), '{"full_name":"Natasha Mwale"}'),
 ('rachael.musongo@example.com', now(), '{"full_name":"Rachael Musongo","signup_role":"owner"}'),
 ('johnson.kawemba@example.com', now(), '{}'),
 ('joseph.sakala@example.com', now(), '{}'),
 ('platform.admin@example.com', now(), '{}');
EOF
$P "psql -v ON_ERROR_STOP=1 -d sstest -f /home/claude/db/supabase/seed/demo_data.sql" 2>&1 | grep -v "^SET\|^INSERT\|^UPDATE\|^ALTER\|^CREATE\|^DO$" | head -30
