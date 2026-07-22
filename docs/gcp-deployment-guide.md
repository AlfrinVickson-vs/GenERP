# GENSIS ERP GCP Deployment Guide

This guide deploys GENSIS ERP to Google Cloud Platform using:

- Cloud Run for the API
- Cloud Run for the web app
- Cloud SQL for PostgreSQL
- Artifact Registry for container images
- Cloud Build for builds

## 1. Trial Credit

New Google Cloud customers can receive a 300 USD free trial credit for testing. Confirm the current offer in your Google Cloud account before creating paid resources.

## 2. Recommended Pilot Architecture

```text
Client Browser
  -> Cloud Run Web Service
      -> same-origin Next.js proxy
          -> Cloud Run API Service
              -> Cloud SQL PostgreSQL
```

The web app should call the API through its own web origin. This avoids browser cookie issues across different service domains.

## 3. Create A Project

Suggested project name:

```text
gensis-erp-prod
```

Suggested region:

```text
asia-south1
```

Use `asia-south1` for India-facing clients, or `asia-southeast1` for Singapore/Southeast Asia.

## 4. Enable APIs

Enable these APIs:

```text
Cloud Run API
Cloud Build API
Artifact Registry API
Cloud SQL Admin API
Secret Manager API
```

## 5. Create Artifact Registry

Create a Docker repository:

```text
Repository name: gensis-erp
Format: Docker
Region: asia-south1
```

## 6. Create Cloud SQL PostgreSQL

Suggested test/pilot settings:

```text
Engine: PostgreSQL
Instance ID: gensis-erp-db
Database version: PostgreSQL 16 or newer
Region: asia-south1
Machine: shared core or smallest available
Storage: 10 GB SSD
Backups: enabled
Point-in-time recovery: enabled for production
Database name: gen_erp
User: gen_erp_user
```

Save the generated database password securely.

## 7. Build And Deploy API

Replace:

```text
PROJECT_ID
REGION
INSTANCE_CONNECTION_NAME
DB_PASSWORD
```

Example values:

```text
PROJECT_ID=gensis-erp-prod
REGION=asia-south1
INSTANCE_CONNECTION_NAME=gensis-erp-prod:asia-south1:gensis-erp-db
```

Build API image:

```bash
gcloud builds submit --config infrastructure/gcp/cloudbuild-api.yaml --substitutions=_IMAGE=asia-south1-docker.pkg.dev/PROJECT_ID/gensis-erp/gensis-erp-api:latest
```

Deploy API:

```bash
gcloud run deploy gensis-erp-api \
  --image asia-south1-docker.pkg.dev/PROJECT_ID/gensis-erp/gensis-erp-api:latest \
  --region asia-south1 \
  --allow-unauthenticated \
  --add-cloudsql-instances INSTANCE_CONNECTION_NAME \
  --set-env-vars DATABASE_URL="postgresql://gen_erp_user:DB_PASSWORD@localhost/gen_erp?host=/cloudsql/INSTANCE_CONNECTION_NAME",JWT_ACCESS_SECRET="change-this-long-random-secret",COOKIE_SECRET="change-this-other-long-random-secret",COOKIE_SECURE=true,WEB_ORIGIN="https://TEMP_WEB_URL",UPLOAD_DIR=/tmp/uploads
```

After deployment, copy the API service URL.

## 8. Initialize Database

Run schema push and seed from your local machine with the Cloud SQL Auth Proxy, or run a temporary Cloud Run job. For a first deployment, the simpler path is:

1. Install Google Cloud CLI.
2. Install Cloud SQL Auth Proxy.
3. Connect to Cloud SQL locally.
4. Set `DATABASE_URL`.
5. Run:

```bash
npm run prisma:generate -w @erp/api
npm run prisma:push -w @erp/api
npm run prisma:seed -w @erp/api
```

## 9. Build And Deploy Web

Build web image using the API URL:

```bash
gcloud builds submit --config infrastructure/gcp/cloudbuild-web.yaml --substitutions=_IMAGE=asia-south1-docker.pkg.dev/PROJECT_ID/gensis-erp/gensis-erp-web:latest,_API_PROXY_URL=https://YOUR_API_URL
```

Deploy web:

```bash
gcloud run deploy gensis-erp-web \
  --image asia-south1-docker.pkg.dev/PROJECT_ID/gensis-erp/gensis-erp-web:latest \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars API_PROXY_URL=https://YOUR_API_URL,NEXT_PUBLIC_API_URL=https://YOUR_API_URL
```

After deployment, copy the web service URL.

## 10. Update API WEB_ORIGIN

Update API environment variable:

```text
WEB_ORIGIN=https://YOUR_WEB_URL
```

Redeploy the API service.

## 11. Test

Open the web URL and log in:

```text
Username: admin
Password: Admin123!
```

Test:

- refresh after login
- logout
- company page
- users page
- branches
- reports
- invoice screens
- inventory import screen

## 12. Production Checklist

- Replace demo admin password.
- Rotate `JWT_ACCESS_SECRET` and `COOKIE_SECRET`.
- Enable Cloud SQL backups.
- Enable point-in-time recovery.
- Add a custom domain.
- Move uploads from `/tmp/uploads` to Cloud Storage.
- Add uptime monitoring.
- Add budget alerts.
- Test database restore monthly.
