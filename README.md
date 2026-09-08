# Nagorik Voice

A polished local demo of a community-powered civic issue platform for Bangladesh. It combines a social feed with location-based reporting, community support, transparent status tracking, and separate authority/admin workspaces.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown by Vite (normally `http://localhost:5173`). For a production check:

```bash
npm run build
npm run preview
```

## Demo behavior

This review build intentionally uses browser-local data rather than a remote database. Reports created through the three-step form, support actions, saves, and authority status changes are saved in `localStorage`. Image selections are previewed locally for the current browser session.

Implemented demo surfaces include the responsive feed, global search, category filters, issue creation, media preview, support/save/share actions, issue details and comments, area browsing, explore grid, issue map, notifications, citizen profile, authority dashboard, admin dashboard, and mobile bottom navigation.

## Production architecture path

The UI is built with React, TypeScript, Vite, and plain responsive CSS. `.env.example` documents the expected production configuration. Before production use, replace the local store with PostgreSQL/Prisma repositories, add Auth.js authentication and role checks, move media to Cloudinary, connect the map to OpenStreetMap/Leaflet, and implement server-side validation, moderation, rate limiting, notifications, and uploads.

Suggested demo roles from the master brief:

- Citizen: `citizen@demo.com`
- Authority: `authority@demo.com`
- Admin: `admin@demo.com`
- Local demo password: `Demo@12345`

The role screens are directly accessible from the desktop sidebar so the full product can be reviewed without sign-in during this local prototype phase.
