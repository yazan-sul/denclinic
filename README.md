This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev

## Typescript React + Tailwind css

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
