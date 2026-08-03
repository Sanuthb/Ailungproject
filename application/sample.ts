// # --- Supabase Postgres ---
// # From your Supabase project: Settings -> Database -> Connection string.
// # DATABASE_URL: "Transaction" pooler connection (port 6543) — used by the app at runtime.
// DATABASE_URL="postgresql://postgres.nhjjawyyyfrzsglfvjrs:sanuthbibin@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
// # DIRECT_URL: "Session"/direct connection (port 5432) — used only for `prisma migrate`.
// DIRECT_URL="postgresql://postgres.nhjjawyyyfrzsglfvjrs:sanuthbibin@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

// # --- Supabase Storage ---
// # From your Supabase project: Settings -> API.
// NEXT_PUBLIC_SUPABASE_URL="https://nhjjawyyyfrzsglfvjrs.supabase.co"
// # Service role key — server-only, never expose to the client/browser.
// SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oamphd3l5eWZyenNnbGZ2anJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk0NzAyOCwiZXhwIjoyMTAwNTIzMDI4fQ.lnm-1QNiC_HnmG1vXGLWt7EqbtT-p32W5M-er9RCPrI"
// # Storage bucket used for scan images, Grad-CAM overlays, and report PDFs.
// SUPABASE_STORAGE_BUCKET="medical-uploads"

// # --- Auth ---
// JWT_SECRET="ailung-jwt-secret-key-change-in-production-32chars"
// NEXT_PUBLIC_APP_URL="http://localhost:3000"

// # --- AI Inference ---
// # Full URL of the /predict endpoint. Point this at your local Docker container
// # while testing (`docker run -p 7860:7860 ailung-api`), or at a deployed
// # Space's URL in production, e.g. "https://<your-username>-ailung-inference.hf.space/predict".
// # Without this set, /api/predict falls back to simulated predictions in development.
// HUGGINGFACE_SPACE_URL="http://localhost:7860/predict"
// # Optional bearer token if the Space requires authentication.
// HUGGINGFACE_API_TOKEN=""

// # U-Net Lung Nodule Segmentation Microservice URL
// UNET_SERVICE_URL="http://localhost:8001/predict-nodule"

// # --- Seed data (npm run db:seed) ---
// # Shared password for all seeded demo accounts.
// SEED_DEFAULT_PASSWORD="Ailung@12345"
