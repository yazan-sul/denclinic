This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

## Database Setup

Use these commands for local Prisma workflows:

```bash
npm run db:migrate:dev
npm run db:seed
```

### One-time Team Sync (Required)

Migration history was re-baselined to fix a broken chain. Every developer must run a one-time local reset after pulling these changes.

```bash
npm run db:migrate:reset
npm run db:seed
```

This reset is destructive and should only be used on local development databases.

## Typescript React + Tailwind css
## Prisma + PostgreSql database

denclinic/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/          ← API routes go here
│   ├── components/       ← Reusable UI components
│   ├── lib/              ← DB clients, helpers, utilities
│   └── types/            ← TypeScript type definitions
├── public/
│   ├── manifest.json
│   └── icons/
├── prisma/               ← Schema 
├── .env.local
├── .env
└── next.config.ts
