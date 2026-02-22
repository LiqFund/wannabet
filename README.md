# WannaBet

A betting platform built with Next.js and Vercel Analytics.

## Features

- Built with Next.js 14 (App Router)
- TypeScript support
- Tailwind CSS for styling
- Vercel Web Analytics integrated

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Vercel Web Analytics

This project includes Vercel Web Analytics integration. The `Analytics` component from `@vercel/analytics/next` is added to the root layout (`app/layout.tsx`).

To enable analytics:
1. Deploy your app to Vercel
2. Go to your Vercel dashboard
3. Select your project
4. Click the **Analytics** tab
5. Click **Enable**

Once deployed, analytics will automatically track page views and visitors.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
