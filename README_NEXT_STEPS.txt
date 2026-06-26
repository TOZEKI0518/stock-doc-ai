1. Install dependency:
   npm install @supabase/supabase-js

2. Add Vercel Environment Variables:
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SNAPSHOT_LIMIT=120
   SNAPSHOT_SECRET=optional_secret

3. If SNAPSHOT_SECRET is set, call daily snapshot manually with:
   Authorization: Bearer your_secret

4. Vercel Cron schedule is UTC. "0 14 * * *" = 23:00 Japan time.

5. IMPORTANT: The SQL table snapshots needs unique constraint for upsert:
   alter table snapshots add constraint snapshots_snapshot_date_code_key unique (snapshot_date, code);
