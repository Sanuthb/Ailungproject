# AI Lung Diagnostics

A hospital-grade web application for AI-assisted chest X-ray abnormality detection, built with Next.js 15/16, Supabase (Postgres + Storage), and Prisma. Inference runs on a separate Hugging Face Space hosting a DenseNet121 model trained on CheXpert Small — see `../codex.md` for the full architecture and `../huggingface-space/` for the inference API. Deploy that Space first; the app degrades to simulated predictions without it.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then:

   - **Database**: Settings -> Database -> Connection string. Copy the pooled
     ("Transaction", port 6543) string into `DATABASE_URL` and the direct
     ("Session", port 5432) string into `DIRECT_URL`.
   - **Storage**: Storage -> New bucket -> name it `medical-uploads` (or match
     whatever you set `SUPABASE_STORAGE_BUCKET` to) and make it **public**
     (scans/reports are served via public URLs — see Architecture notes below
     if you need private buckets instead).
   - **API keys**: Settings -> API. Copy the Project URL into
     `NEXT_PUBLIC_SUPABASE_URL` and the **service_role** key (not the anon
     key) into `SUPABASE_SERVICE_ROLE_KEY`.

3. **Configure environment variables** — fill in `.env` (see inline comments for each variable):

   - `DATABASE_URL` / `DIRECT_URL` — Supabase Postgres connection strings.
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` — Supabase Storage.
   - `JWT_SECRET` — secret used to sign auth cookies.
   - `HUGGINGFACE_SPACE_URL` — full `/predict` URL of your deployed inference Space (see `../huggingface-space/README.md`). If unset, `/api/predict` falls back to simulated predictions in development only (never in production).
   - `HUGGINGFACE_API_TOKEN` — optional bearer token if the Space requires auth.
   - `SEED_DEFAULT_PASSWORD` — shared password for the seeded demo accounts.

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

   This seeds one admin and three doctor accounts — the script prints their
   emails and shared password when it runs.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and log in with any seeded account.

## Scripts

- `npm run dev` — start the development server.
- `npm run build` — production build.
- `npm run start` — run the production build.
- `npm run lint` — lint the project.
- `npm run db:seed` — seed the database with demo users and a settings row (idempotent — safe to re-run).

## Architecture notes

- Authentication is custom (JWT in an HTTP-only cookie, bcrypt-hashed passwords, role-based access via `proxy.ts`) — no third-party auth provider.
- AI inference is never run in-process; `src/services/huggingface.ts` is the only place that calls out to the Hugging Face Space.
- Uploaded X-rays, Grad-CAM overlays, and generated report PDFs are stored in Supabase Storage (`src/services/storage.ts`), not on local disk — this is required for serverless/production deploys where local disk doesn't persist. The bucket is assumed public; for private data, swap `getPublicUrl` for `createSignedUrl` and generate signed URLs at read time.
- Generated PDF reports are built client-side (`src/services/pdf-report.ts`) and uploaded to `/api/reports`, which persists them to Storage and records a `Report` row.
- Only administrators can edit hospital-wide settings (`/dashboard/settings`); doctors have read-only access.
