---
name: fullstack-crud-flow
description: Blueprint for building a Next.js 16 (App Router) + Prisma/PostgreSQL + NextAuth + TanStack Query full-stack app with a strict layered CRUD flow, file uploads, and an admin panel. Use when scaffolding a new project with this same architecture or adding a new data-backed feature (model → migration → API → api/service/hook/types → admin CRUD → public page).
---

# Full-Stack CRUD Flow (Next.js + Prisma + NextAuth + TanStack Query)

This skill reproduces the architecture of an employee onboarding/brochure portal. Follow it to scaffold a new project with the same flow, or to add a new data-backed feature end to end.

## Stack

- **Next.js 16**, App Router, TypeScript (`app/` directory).
- **Prisma 5** ORM against **PostgreSQL**.
- **NextAuth v4** (Credentials provider, JWT sessions) for auth.
- **TanStack Query v5** (`@tanstack/react-query`) for all client data fetching/caching.
- **axios** for HTTP, **zod** + **react-hook-form** (`@hookform/resolvers`) for forms.
- **Tailwind CSS v4** for styling, **sonner** for toasts, **lucide-react** + **recharts** for icons/charts.
- Local filesystem storage for uploaded files under `public/uploads/`.

> Next.js 16 has breaking changes vs older versions. Before writing route handlers or pages, read the relevant guide under `node_modules/next/dist/docs/`. Notably: dynamic route params are a **Promise** — `{ params }: { params: Promise<{ id: string }> }` and you must `await params`.

## Folder structure

```
app/
  layout.tsx                 # root layout; wraps children in <Providers>
  globals.css                # Tailwind v4 + CSS custom-property design tokens
  page.tsx                   # public landing page
  <feature>/page.tsx         # public pages (client components)
  login/page.tsx
  portal/                    # authenticated user area (layout guards the session)
  admin/
    layout.tsx               # admin shell: sidebar nav + session/role guard
    <feature>/page.tsx       # admin CRUD pages (table + modals)
  api/
    auth/[...nextauth]/route.ts
    v1/<feature>/route.ts        # GET (list) + POST (create)
    v1/<feature>/[id]/route.ts   # PUT (update) + DELETE
components/
  Providers.tsx              # SessionProvider + QueryClientProvider + Toaster
  Navbar.tsx, ThemeToggle.tsx, ...
lib/
  prisma.ts                  # PrismaClient singleton
  auth.ts                    # NextAuth authOptions
  storage.ts                 # saveFile / deleteFile to public/uploads
  api/axios.ts               # shared axios instance (baseURL /api/v1)
  api/<feature>.api.ts       # raw HTTP calls only
  services/<feature>.service.ts  # wraps api layer, returns typed data, URL helpers
  hooks/use<Feature>.ts      # TanStack Query hooks (useQuery/useMutation)
  types/<feature>.types.ts   # Entity + CreateDTO + UpdateDTO interfaces
prisma/
  schema.prisma
  migrations/<timestamp>_<name>/migration.sql
public/uploads/              # uploaded files served at /uploads/<filename>
```

## The layered data flow (strict — never skip a layer)

```
DB  ←→  Prisma  ←→  API route (app/api/v1/...)  ←→  api layer (axios)  ←→  service  ←→  hook (TanStack Query)  ←→  UI component
```

- **UI components never call fetch/axios directly.** They consume the `use<Feature>` hooks.
- **api layer** holds only raw axios calls; no business logic.
- **service layer** calls the api layer, returns `.data`, and hosts helpers (e.g. image-URL builders).
- **hooks** wrap services in `useQuery`/`useMutation`, invalidate the query key on success, and fire `sonner` toasts.

## Core singletons & setup

**`lib/prisma.ts`** — one client, cached on `global` in dev to survive HMR:
```ts
import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**`components/Providers.tsx`** — client component wrapping the app; mounted in `app/layout.tsx`:
```tsx
'use client';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}<Toaster /></QueryClientProvider>
    </SessionProvider>
  );
}
```

**`lib/api/axios.ts`** — shared instance; baseURL is `/api/v1`, overridable by env:
```ts
import axios from 'axios';
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});
// request/response interceptors for auth token + global error handling
```

**`lib/storage.ts`** — files saved under `public/uploads/` with a `uuid-originalname` filename, served at `/uploads/<filename>`:
```ts
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
export async function saveFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, filename), buffer);
  return filename; // store this in the DB column
}
export async function deleteFile(filename: string): Promise<void> {
  if (!filename) return;
  try { await unlink(join(UPLOAD_DIR, filename)); }
  catch (e: any) { if (e.code !== 'ENOENT') throw new Error('Failed to delete file'); }
}
```

## Auth (NextAuth v4, Credentials + JWT)

- `lib/auth.ts` exports `authOptions`: a `CredentialsProvider` whose `authorize` looks up the user with Prisma, verifies the password with `bcryptjs` (`bcrypt.compare`), and returns a user object with custom fields (`role`, `referenceNumber`, `position`, `mustChangePassword`).
- `session.strategy = 'jwt'`; the `jwt` callback copies custom fields onto the token, the `session` callback copies them onto `session.user`. The `jwt` callback also handles `trigger === 'update'` so the client can call `update()` to refresh a field (e.g. after a password change).
- `app/api/auth/[...nextauth]/route.ts` is just `const handler = NextAuth(authOptions); export { handler as GET, handler as POST };`.
- Guard pages in a layout: read `useSession()`, and in `useEffect` `router.replace('/login')` when `unauthenticated`, and redirect by `session.user.role` for role gating (ADMIN vs regular user). Augment NextAuth types in `types/next-auth.d.ts`.

## Recipe: add a new CRUD feature (vertical slice)

Use an existing feature (e.g. "Leadership" or "Gallery") as the copy template. For a feature `Widget`:

### 1. Schema — `prisma/schema.prisma`
```prisma
model Widget {
  id        Int      @id @default(autoincrement())
  name      String
  img       String?            // filename from saveFile; served at /uploads/<img>
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Migration (see "Migration convention" below), then regenerate the client.

### 3. Types — `lib/types/widget.types.ts`
```ts
export interface Widget { id: number; name: string; img?: string | null; order?: number; }
export interface CreateWidgetDTO { name: string; file?: File; order?: number; }
export interface UpdateWidgetDTO { name?: string; file?: File; order?: number; }
```

### 4. API routes
**`app/api/v1/widget/route.ts`** — GET list + POST create. Requests are `multipart/form-data` with a JSON `data` Blob plus an optional `file`:
```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/storage';

export async function GET() {
  try {
    const rows = await prisma.widget.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const dataBlob = formData.get('data') as Blob | null;
    const file = formData.get('file') as File | null;
    if (!dataBlob) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    const data = JSON.parse(await dataBlob.text());
    const img = file ? await saveFile(file) : null;
    const row = await prisma.widget.create({ data: { name: data.name, img, order: data.order ?? 0 } });
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create' }, { status: 500 });
  }
}
```
**`app/api/v1/widget/[id]/route.ts`** — PUT + DELETE. Note the Promise params and the file swap (delete old, save new):
```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveFile, deleteFile } from '@/lib/storage';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const formData = await request.formData();
  const dataBlob = formData.get('data') as Blob | null;
  const file = formData.get('file') as File | null;
  const data = dataBlob ? JSON.parse(await dataBlob.text()) : {};
  const existing = await prisma.widget.findUnique({ where: { id: numericId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let img = existing.img;
  if (file) { if (existing.img) await deleteFile(existing.img); img = await saveFile(file); }
  const row = await prisma.widget.update({
    where: { id: numericId },
    data: { name: data.name ?? existing.name, order: data.order ?? existing.order, img },
  });
  return NextResponse.json(row);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  const existing = await prisma.widget.findUnique({ where: { id: numericId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.img) await deleteFile(existing.img);
  await prisma.widget.delete({ where: { id: numericId } });
  return new NextResponse(null, { status: 204 });
}
```

### 5. api layer — `lib/api/widget.api.ts`
Build `FormData` with a JSON `data` Blob (`type: 'application/json'`) + optional `file`; send `multipart/form-data`:
```ts
import { apiClient } from './axios';
import { Widget, CreateWidgetDTO, UpdateWidgetDTO } from '../types/widget.types';
export const widgetApi = {
  getAll: () => apiClient.get<Widget[]>('/widget'),
  create: (data: CreateWidgetDTO) => {
    const fd = new FormData();
    fd.append('data', new Blob([JSON.stringify({ name: data.name, order: data.order })], { type: 'application/json' }));
    if (data.file) fd.append('file', data.file);
    return apiClient.post<Widget>('/widget', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  update: (id: string, data: UpdateWidgetDTO) => {
    const fd = new FormData();
    const obj: any = {};
    if (data.name !== undefined) obj.name = data.name;
    if (data.order !== undefined) obj.order = data.order;
    if (Object.keys(obj).length) fd.append('data', new Blob([JSON.stringify(obj)], { type: 'application/json' }));
    if (data.file) fd.append('file', data.file);
    return apiClient.put<Widget>(`/widget/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  remove: (id: string) => apiClient.delete<void>(`/widget/${id}`),
};
```

### 6. service — `lib/services/widget.service.ts`
```ts
import { widgetApi } from '../api/widget.api';
import { CreateWidgetDTO, UpdateWidgetDTO } from '../types/widget.types';
export const widgetService = {
  getAll: async () => (await widgetApi.getAll()).data,
  create: async (d: CreateWidgetDTO) => (await widgetApi.create(d)).data,
  update: async (id: string, d: UpdateWidgetDTO) => (await widgetApi.update(id, d)).data,
  remove: async (id: string) => { await widgetApi.remove(id); },
};
export const getWidgetImageUrl = (img: string) => (img ? `/uploads/${img}` : '');
```

### 7. hook — `lib/hooks/useWidget.ts`
```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetService } from '../services/widget.service';
import { CreateWidgetDTO, UpdateWidgetDTO } from '../types/widget.types';
import { toast } from 'sonner';
const KEY = ['widget'];
export const useWidgets = () => useQuery({ queryKey: KEY, queryFn: widgetService.getAll });
export const useCreateWidget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: CreateWidgetDTO) => widgetService.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Created'); },
    onError: (e: any) => toast.error(typeof e?.response?.data === 'string' ? e.response.data : 'Failed'),
  });
};
// useUpdateWidget: mutationFn: ({ id, data }: { id: string; data: UpdateWidgetDTO }) => widgetService.update(id, data)
// useDeleteWidget: mutationFn: (id: string) => widgetService.remove(id)
// All invalidate KEY on success and toast via sonner.
```

### 8. Admin CRUD page — `app/admin/widget/page.tsx`
A `'use client'` page with:
- `useWidgets()` for the table; `useCreateWidget/useUpdateWidget/useDeleteWidget` mutations.
- `useForm` + `zodResolver(zodSchema)` for the form; a file input with a local preview (`URL.createObjectURL`).
- A `Modal` for Add/Edit and a `DeleteModal` confirm (copy these helpers from an existing admin page).
- Pass numeric ids to mutations as `String(id)` so they line up with the api layer's `string` id params.
- Render images with `getWidgetImageUrl(img)` and an `onError` SVG placeholder fallback.
- Add a nav entry in `app/admin/layout.tsx`'s `navItems` array.

### 9. Public page
A `'use client'` page using `useWidgets()`, sorting by `order`, mapping rows to the UI shape, with loading/empty states. Fetch through the hook — never fetch inline.

## Migration convention (important)

This project uses **hand-maintained, idempotent** SQL migrations (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), because the DB was set up out-of-band and `prisma migrate dev` reports drift. **Do not run `prisma migrate dev` to "fix" drift — it offers to RESET (wipe) the database.**

To add a table/column without data loss:
1. Edit `prisma/schema.prisma`.
2. Create `prisma/migrations/<yyyymmddHHMMSS>_<name>/migration.sql` with idempotent SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS "Widget" (
     "id" SERIAL PRIMARY KEY,
     "name" TEXT NOT NULL,
     "img" TEXT,
     "order" INTEGER NOT NULL DEFAULT 0,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL
   );
   -- or:  ALTER TABLE "Widget" ADD COLUMN IF NOT EXISTS "cohort" TEXT;
   ```
3. Apply it additively and regenerate the client (see commands below). For a brand-new project you CAN use `prisma migrate dev` normally; the idempotent style is specific to an already-drifted DB.

## Seeding existing static assets into the DB

To migrate hardcoded assets into a table the way an upload would appear: copy each source file into `public/uploads/` with a `uuid-sanitizedname` filename (mirror `saveFile`'s `name.replace(/[^a-zA-Z0-9.-]/g, '_')`), then `prisma.<model>.create(...)` a row pointing at that filename. Make the script idempotent (skip rows whose `img` already ends with the sanitized source name). Keep such scripts in `scripts/`.

## Commands & environment gotchas (Windows / this setup)

- Env: `DATABASE_URL` (PostgreSQL), `NEXTAUTH_SECRET`, `NEXTAUTH_URL` in `.env` / `.env.local`.
- `package.json` scripts: `dev` = `next dev`, `build` = `next build`, `lint` = `eslint`.
- **`npx` and `.ps1` shims may be blocked by PowerShell execution policy.** Invoke node CLIs directly:
  - Generate client: `node node_modules/prisma/build/index.js generate`
  - Type-check (preferred validation; avoids a full build): `node node_modules/typescript/bin/tsc --noEmit`
- On Windows, a running `next dev` can **lock the Prisma query-engine DLL**, making `generate` log `EPERM ... rename ...tmp`. The JS/types still update; if the client seems stale, stop the dev server and regenerate.
- Do not run long-lived processes (dev server, watchers) in automated steps.
- Path alias: `@/*` maps to the project root (e.g. `@/lib/prisma`). Match each file's import style (some features use relative `../../lib/...`, routes use `@/lib/...`).

## Conventions checklist

- One `use<Feature>` query key per feature; invalidate it on every mutation success.
- Numeric autoincrement ids in the DB; api/service/hook treat ids as `string` (`String(id)` at the call site, `parseInt` in the route).
- `multipart/form-data` with a JSON `data` Blob + `file` for any create/update that can carry an upload; JSON-only otherwise.
- zod schema per form; `react-hook-form` + `@hookform/resolvers/zod`; `sonner` for all user feedback.
- Store only the filename in the DB; build URLs with a `get<Feature>ImageUrl` helper; serve from `public/uploads`.
- Guard authenticated areas in the segment `layout.tsx` via `useSession` + role checks.
- Design tokens live as CSS custom properties in `globals.css` (`--saf-green`, etc.); prefer tokens over hardcoded hex, and Tailwind arbitrary values like `bg-[var(--token)]/15` work in this Tailwind v4 setup.
