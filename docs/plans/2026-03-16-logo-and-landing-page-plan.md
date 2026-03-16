# Logo + Landing Page + Login Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the Waypointer logo, landing page, login/signup page, and integrate the logo across all touchpoints (sidebars, emails, PDF reports, splash screen, activate page, OG image).

**Architecture:** SVG logo assets in `/public`, reusable `<WaypointerLogo>` React component for in-app usage. Landing page is a single static page at `/`. Login/signup at `/login` uses Supabase Auth with role-based routing. Employer signup creates auth user + company + admin record via a new API route.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui Button, Supabase Auth, Zod validation, Lucide icons.

---

### Task 1: Create SVG Logo Assets

**Files:**
- Create: `public/logo.svg`
- Create: `public/logo-dark.svg`
- Create: `public/favicon.svg`

**Step 1: Create the full-color logo mark**

Create `public/logo.svg` — rounded square (Waypointer Blue #2563EB) with white stylized "W" where the right stroke angles upward:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect width="48" height="48" rx="10.5" fill="#2563EB"/>
  <path d="M12 14l5.5 20h1.2l4.8-14.5L28.3 34h1.2L35 14h-3.2l-3.8 14.2L23.5 14h-1l-4.7 14.2L14.2 14H12z" fill="white" stroke="white" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M30.5 14l1.2-0.8" stroke="white" stroke-width="0.5" stroke-linecap="round" opacity="0"/>
</svg>
```

Note: The "W" is constructed so the final right stroke angles slightly upward (the rightmost peak is higher), creating the subtle directional arrow motif. Fine-tune the path coordinates during implementation to get the right visual weight.

**Step 2: Create the dark variant (blue on transparent)**

Create `public/logo-dark.svg` — same "W" shape but in Waypointer Blue on transparent background (no rounded square container). Used on light backgrounds where the blue container would be too heavy.

**Step 3: Create the favicon**

Create `public/favicon.svg` — identical to `logo.svg` but optimized for 16x16/32x32 rendering with slightly thicker strokes for legibility at small sizes.

**Step 4: Commit**

```bash
git add public/logo.svg public/logo-dark.svg public/favicon.svg
git commit -m "feat: add Waypointer SVG logo assets"
```

---

### Task 2: Create WaypointerLogo React Component

**Files:**
- Create: `src/components/brand/logo.tsx`

**Step 1: Create the reusable logo component**

```tsx
import { cn } from "@/lib/utils";

interface WaypointerLogoProps {
  size?: number;
  variant?: "mark" | "full" | "wordmark";
  className?: string;
}

export function WaypointerLogo({
  size = 32,
  variant = "full",
  className,
}: WaypointerLogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(variant === "mark" && className)}
    >
      <rect width="48" height="48" rx="10.5" fill="#2563EB" />
      {/* Stylized W path — right stroke angles upward */}
      <path
        d="M12 14l5.5 20h1.2l4.8-14.5L28.3 34h1.2L35 14h-3.2l-3.8 14.2L23.5 14h-1l-4.7 14.2L14.2 14H12z"
        fill="white"
      />
    </svg>
  );

  if (variant === "mark") return mark;

  const wordmark = (
    <span
      className="font-semibold text-primary"
      style={{ fontSize: size * 0.53 }}
    >
      Waypointer
    </span>
  );

  if (variant === "wordmark") {
    return <span className={cn("inline-flex items-center", className)}>{wordmark}</span>;
  }

  // variant === "full"
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {mark}
      {wordmark}
    </span>
  );
}
```

Props:
- `size` — controls the mark height in px (wordmark scales proportionally)
- `variant="mark"` — icon only (collapsed sidebar, favicon contexts)
- `variant="full"` — icon + "Waypointer" text (default, expanded sidebar)
- `variant="wordmark"` — text only (rare, email fallback)

**Step 2: Commit**

```bash
git add src/components/brand/logo.tsx
git commit -m "feat: add WaypointerLogo React component"
```

---

### Task 3: Add Favicon to App Layout + OG Metadata

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update root layout metadata**

Add favicon link and Open Graph metadata to the existing `layout.tsx`:

```tsx
export const metadata: Metadata = {
  title: "Waypointer — Career Transition Support",
  description:
    "AI-powered outplacement platform helping employees navigate career transitions with tailored resumes, job matching, and interview preparation.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  openGraph: {
    title: "Waypointer — Career Transition Support",
    description:
      "Give departing employees immediate, AI-powered transition support — at a price that lets you cover everyone.",
    url: "https://getwaypointer.com",
    siteName: "Waypointer",
    type: "website",
  },
};
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add favicon and OG metadata to root layout"
```

---

### Task 4: Integrate Logo into Employee Sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Replace text-only logo with WaypointerLogo component**

Import `WaypointerLogo` and replace the logo div (lines 37-45):

```tsx
{/* Logo */}
<div className="flex h-16 items-center px-4 md:px-6 border-b border-border">
  <span className="hidden md:block">
    <WaypointerLogo size={28} variant="full" />
  </span>
  <span className="block md:hidden">
    <WaypointerLogo size={28} variant="mark" />
  </span>
</div>
```

**Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: integrate logo into employee sidebar"
```

---

### Task 5: Integrate Logo into Employer Sidebar

**Files:**
- Modify: `src/components/layout/employer-sidebar.tsx`

**Step 1: Replace text-only logo with WaypointerLogo + Admin badge**

Import `WaypointerLogo` and replace the logo div (lines 33-44):

```tsx
{/* Logo */}
<div className="flex h-16 items-center px-4 md:px-6 border-b border-border">
  <span className="hidden md:block">
    <WaypointerLogo size={28} variant="full" />
  </span>
  <span className="block md:hidden">
    <WaypointerLogo size={28} variant="mark" />
  </span>
  <span className="hidden md:block ml-2 text-[10px] font-medium text-text-secondary bg-gray-100 rounded px-1.5 py-0.5">
    Admin
  </span>
</div>
```

**Step 2: Commit**

```bash
git add src/components/layout/employer-sidebar.tsx
git commit -m "feat: integrate logo into employer sidebar"
```

---

### Task 6: Add Logo to Email Templates

**Files:**
- Modify: `src/lib/email/templates.ts`

**Step 1: Add inline SVG logo to baseLayout header**

In the `baseLayout()` function, replace the text-only `WAYPOINTER` div with an inline SVG mark + text. The SVG must be inline (not an `<img>` tag) because email clients block external images by default but render inline SVG.

Replace line 82:
```
<div style="font-size:16px;font-weight:600;color:${WAYPOINTER_BLUE};letter-spacing:0.5px;">WAYPOINTER</div>
```

With:
```
<div style="text-align:center;">
  <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;margin-right:8px;">
    <rect width="48" height="48" rx="10.5" fill="#2563EB"/>
    <path d="M12 14l5.5 20h1.2l4.8-14.5L28.3 34h1.2L35 14h-3.2l-3.8 14.2L23.5 14h-1l-4.7 14.2L14.2 14H12z" fill="white"/>
  </svg>
  <span style="font-size:16px;font-weight:600;color:#2563EB;letter-spacing:0.5px;vertical-align:middle;">WAYPOINTER</span>
</div>
```

Note: Some email clients (Outlook) have limited SVG support. The text "WAYPOINTER" remains visible as fallback. This is acceptable — the mark is an enhancement, not a requirement.

**Step 2: Commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat: add inline SVG logo to email templates"
```

---

### Task 7: Add Logo to Employer Report PDF Cover

**Files:**
- Modify: `src/lib/documents/employer-report-pdf.tsx`

**Step 1: Add Waypointer logo SVG path to PDF cover**

In the cover page section, add the Waypointer mark above the "WAYPOINTER" text using `@react-pdf/renderer`'s `Svg`, `Rect`, and `Path` components. Replace the text-only brand line with the mark + text lockup.

Find the `WAYPOINTER` brand text on the cover page and add the SVG mark above it:

```tsx
<Svg width={48} height={48} viewBox="0 0 48 48">
  <Rect width="48" height="48" rx={10.5} fill="#2563EB" />
  <Path
    d="M12 14l5.5 20h1.2l4.8-14.5L28.3 34h1.2L35 14h-3.2l-3.8 14.2L23.5 14h-1l-4.7 14.2L14.2 14H12z"
    fill="white"
  />
</Svg>
```

**Step 2: Commit**

```bash
git add src/lib/documents/employer-report-pdf.tsx
git commit -m "feat: add logo SVG to employer report PDF cover"
```

---

### Task 8: Build the Landing Page

**Files:**
- Replace: `src/app/page.tsx`

**Step 1: Build the complete landing page**

Replace the placeholder with the full landing page with 5 sections:

1. **Sticky navbar** — `WaypointerLogo` left, "Log in" ghost button + "Get Started" primary button right, linking to `/login`
2. **Hero** — headline, subhead, two CTAs
3. **Proof points** — 5 cards with icons (use Lucide: `Zap`, `Plug`, `Calendar`, `BarChart3`, `DollarSign`)
4. **How it works** — 3-step numbered flow
5. **Footer CTA + footer** — final push + copyright

Design constraints:
- `max-w-6xl mx-auto` for content width
- Mobile-first responsive (stack proof points vertically on sm, grid on md+)
- All transitions 200ms ease-out per design system
- No images — pure text + icons + whitespace
- `scroll-smooth` on html for "See How It Works" anchor link
- Section IDs: `#features` for proof points, `#how-it-works` for steps

The page is fully static — no client state, no data fetching. It can be a Server Component (default).

Copy for each section per design doc. Headline:
> Career transition support for every employee — not just the C-suite.

Subhead:
> Give departing employees immediate, AI-powered transition support — from resume rewrites and job matching to interview prep — at a price that lets you cover everyone.

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: build landing page with hero, proof points, and how-it-works"
```

---

### Task 9: Create Employer Signup API Route

**Files:**
- Create: `src/app/api/v1/auth/signup/route.ts`

**Step 1: Build the signup endpoint**

`POST /api/v1/auth/signup` — creates Supabase Auth user, company record, and employer_admin record in a single transaction.

Request body (Zod schema):
```typescript
const signupSchema = z.object({
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  company_name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});
```

Flow:
1. Validate input
2. Create Supabase Auth user via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
3. Create company record in `companies` table (name, no logo yet)
4. Create employer_admin record linking auth user to company
5. Sign in the user via `anonClient.auth.signInWithPassword` to get session tokens
6. Return `{ user_id, role: "employer_admin", company_id, access_token, refresh_token }`

Error handling:
- Duplicate email → 409 with "An account with this email already exists"
- Validation error → 422 with field errors
- Internal error → 500

Uses Node.js runtime (auth admin calls need Node).

**Step 2: Commit**

```bash
git add src/app/api/v1/auth/signup/route.ts
git commit -m "feat: add employer signup API route"
```

---

### Task 10: Build Login/Signup Page

**Files:**
- Create: `src/app/login/page.tsx`

**Step 1: Build the login/signup page**

Client component with tab toggle between "Log in" and "Sign up".

Structure:
- Centered on screen, `max-w-md`, white card on #FAFAFA background
- `WaypointerLogo` mark centered above the card (size=40)
- Tab toggle using two buttons with underline-style active indicator
- Forms use existing `Button` component + native inputs styled with Tailwind
- Zod validation on client before submission
- Loading state on submit button (disabled + "Signing in..." / "Creating account...")
- Error messages inline below fields for validation, toast for server errors
- "Forgot password?" link below login form (links to `#` for now — future feature)

Login form → `POST /api/v1/auth/login` → check role → redirect:
- `employer_admin` → `/employer/dashboard`
- `employee` → `/dashboard`
- `new_user` → `/employer/setup`

Signup form → `POST /api/v1/auth/signup` → redirect to `/employer/setup`

Post-auth: store session cookies via Supabase client-side auth, then `router.push()`.

Important: Use `createClient()` from `@/lib/supabase/client` for client-side auth after API returns tokens. Call `supabase.auth.setSession({ access_token, refresh_token })` to set the cookie-based session that middleware will refresh.

**Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: build login/signup page with role-based routing"
```

---

### Task 11: Add Loading Splash Screen

**Files:**
- Modify: `src/components/auth/protected-route.tsx`
- Modify: `tailwind.config.ts`

**Step 1: Add pulse animation to tailwind config**

Add a `logo-pulse` keyframe and animation to `tailwind.config.ts`:

```typescript
keyframes: {
  // ... existing
  "logo-pulse": {
    "0%, 100%": { opacity: "1", transform: "scale(1)" },
    "50%": { opacity: "0.7", transform: "scale(0.96)" },
  },
},
animation: {
  // ... existing
  "logo-pulse": "logo-pulse 2s ease-in-out infinite",
},
```

**Step 2: Replace skeleton loading in ProtectedRoute**

Replace the skeleton loading state (lines 86-101) with a centered logo splash:

```tsx
if (isLoading || !authorized) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-logo-pulse">
        <WaypointerLogo size={48} variant="mark" />
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/auth/protected-route.tsx tailwind.config.ts
git commit -m "feat: add logo splash screen for auth loading state"
```

---

### Task 12: Integrate Logo into /activate Page

**Files:**
- Check: `src/app/activate/page.tsx` — if it doesn't exist, check where activation flow lives

**Step 1: Find the activate page**

The activation flow is at `src/app/api/v1/employee/activate/route.ts` (API only). There may or may not be a frontend page at `/activate`. Check and determine:
- If a page exists, add `WaypointerLogo` to its header
- If no page exists, create a minimal `src/app/activate/page.tsx` that reads the `?token=` param, calls the activate API, shows progress, then redirects to `/welcome`

The activate page should show:
- `WaypointerLogo` mark (size=48) centered at top
- "Welcome to Waypointer" heading
- "Setting up your account..." message with the logo-pulse animation while activating
- Auto-redirect to `/welcome` on success
- Error message if token is invalid/expired

**Step 2: Commit**

```bash
git add src/app/activate/page.tsx
git commit -m "feat: build activate page with logo and auto-redirect"
```

---

### Task 13: Create Open Graph Image

**Files:**
- Create: `public/og-image.png`
- Modify: `src/app/layout.tsx` (add OG image to metadata)

**Step 1: Generate OG image**

Create a 1200x630 PNG with:
- Background: gradient from #2563EB to #1D4ED8
- White Waypointer logo mark centered, large (120px)
- "Waypointer" wordmark below in white, Inter SemiBold
- Tagline: "Career transition support for every employee" in white/80% opacity

Since we can't generate raster images in code, create this as an SVG first, then use Next.js OG image generation at build time OR create a static PNG.

Alternative: Use Next.js `opengraph-image.tsx` convention to generate the OG image dynamically:

Create `src/app/opengraph-image.tsx`:
```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Waypointer — Career Transition Support";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    // JSX with gradient bg, white logo SVG, tagline
  );
}
```

**Step 2: Update layout.tsx OG metadata to include the image**

The `opengraph-image.tsx` convention is auto-detected by Next.js — no manual metadata needed.

**Step 3: Commit**

```bash
git add src/app/opengraph-image.tsx src/app/layout.tsx
git commit -m "feat: add Open Graph image with logo and tagline"
```

---

### Task 14: Integration Verification + Final Commit

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 2: Visual verification checklist**

Manually verify (or describe what to check):
- [ ] `/` — landing page renders, navbar has logo, CTAs link to `/login`
- [ ] `/login` — logo above card, login tab works, signup tab works
- [ ] Employee sidebar — logo mark on mobile, full lockup on desktop
- [ ] Employer sidebar — logo mark on mobile, full lockup + Admin badge on desktop
- [ ] Protected route loading — centered logo with pulse animation
- [ ] Favicon — logo appears in browser tab

**Step 3: Final commit with all integration changes**

```bash
git add -A
git commit -m "feat: Waypointer logo + landing page + login/signup

- SVG logo assets (mark, dark variant, favicon)
- WaypointerLogo React component (mark/full/wordmark variants)
- Landing page with hero, proof points, how-it-works, footer
- Login/signup page with employer registration flow
- Logo integrated into sidebars, emails, PDF reports, splash screen
- Open Graph image for link previews
- Activate page with logo and auto-redirect"
```

```bash
git push origin master
```
