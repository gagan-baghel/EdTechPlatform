# EdTechPlatform (Pure Next.js Runtime)

This project is configured as a single Next.js application:
- UI is rendered by Next.js
- APIs are served through Next API routes under `/api/v1/*`

## Run

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Open:
   - `http://localhost:3000`

## Environment

- Main runtime env file: `.env`
- Example template: `.env.example`
- Frontend API base uses `NEXT_PUBLIC_API_BASE_URL` (default `/api/v1`)
- Razorpay public key uses `NEXT_PUBLIC_RAZORPAY_KEY`

## Structure

- `src/app` - Next.js app router shell
- `src/ui` - migrated UI code and features
- `src/api` - API controllers/routes/models/config used by Next API routes
- `src/pages/api/v1/[...path].js` - Next API catch-all handler

## API Compatibility

All existing endpoints remain under the same paths, e.g.:
- `/api/v1/auth/*`
- `/api/v1/profile/*`
- `/api/v1/course/*`
- `/api/v1/payment/*`
- `/api/v1/reach/*`

## Notes

- There is no separate backend process; frontend and API run from the same Next app.
