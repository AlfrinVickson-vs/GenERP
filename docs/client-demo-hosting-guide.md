# GENSIS ERP Client Demo Hosting Guide

This guide explains the simplest way to publish GENSIS ERP as a temporary online demo for a client.

## Recommended Option

Use Render for the demo because it can host:

- the Next.js web app
- the NestJS API
- a temporary PostgreSQL database

Free Render services are suitable for demos, but not production. Free web services can sleep after inactivity, and free PostgreSQL databases are temporary.

## What You Need First

1. A GitHub account.
2. A Render account.
3. This project pushed to a GitHub repository.
4. A demo admin password that you are comfortable sharing with the client.

Default seeded demo login:

- Username: `admin`
- Password: `Admin123!`

Change this before sharing with a real client if the URL will be public.

## Step 1. Push The Project To GitHub

From the project folder:

```bash
git init
git add .
git commit -m "Prepare GENSIS ERP demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gensis-erp.git
git push -u origin main
```

If the repository already exists, use the remote URL GitHub gives you.

## Step 2. Create The Database On Render

1. Open Render.
2. Click New.
3. Choose PostgreSQL.
4. Name it `gensis-erp-db`.
5. Choose the Free plan for demo use.
6. Create the database.
7. Copy the Internal Database URL.

You will paste this into the API service as `DATABASE_URL`.

## Step 3. Create The API Service On Render

1. Click New.
2. Choose Web Service.
3. Connect the GitHub repository.
4. Select the repo for GENSIS ERP.
5. Use these settings:

```text
Name: gensis-erp-api
Runtime: Node
Root Directory: leave blank
Build Command: npm install && npm run prisma:generate -w @erp/api && npm run build -w @erp/api && npm run prisma:push -w @erp/api && npm run prisma:seed -w @erp/api
Start Command: npm run start -w @erp/api
```

Add these environment variables:

```text
DATABASE_URL=<Render Internal Database URL>
JWT_ACCESS_SECRET=<generate a long random secret>
COOKIE_SECRET=<generate a long random secret>
COOKIE_SECURE=true
WEB_ORIGIN=https://gensis-erp-web.onrender.com
UPLOAD_DIR=/tmp/uploads
NODE_VERSION=20.11.0
```

Deploy the API. After it finishes, open:

```text
https://YOUR_API_URL.onrender.com/docs
```

If Swagger API docs open, the API is running.

## Step 4. Create The Web App Service On Render

1. Click New.
2. Choose Web Service.
3. Connect the same GitHub repository.
4. Use these settings:

```text
Name: gensis-erp-web
Runtime: Node
Root Directory: leave blank
Build Command: npm install && npm run build -w @erp/web
Start Command: npm run start -w @erp/web
```

Add these environment variables:

```text
NEXT_PUBLIC_API_URL=https://YOUR_API_URL.onrender.com
NODE_VERSION=20.11.0
```

Deploy the web app. After it finishes, open:

```text
https://YOUR_WEB_URL.onrender.com
```

## Step 5. Update API CORS

After the web app URL is final:

1. Open the API service in Render.
2. Go to Environment.
3. Set `WEB_ORIGIN` to the exact web app URL.
4. Save changes.
5. Redeploy the API service.

This is required so the browser can log in and call the API.

## Step 6. Demo Checklist

Before sharing the URL with the client:

- Open the web URL.
- Log in with the demo admin user.
- Open dashboard, company, organisation, roles, users, inventory, sales, purchasing, accounting, and reports.
- Create one test record.
- Confirm dark mode, branch selector, quick create, and logout work.
- Share only the web URL with the client, not the API URL.

## Demo Limitations

- Free hosting may sleep after inactivity. The first page load can take around a minute.
- Free database hosting is temporary. Do not store real production data.
- File uploads stored in `/tmp/uploads` are not permanent on free demo hosting.
- Use paid hosting and proper backups before using this for a real company.
