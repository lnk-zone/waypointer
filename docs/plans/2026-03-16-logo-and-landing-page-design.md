# Waypointer Logo + Landing Page Design

Date: 2026-03-16

## 1. Logo

### Mark
Rounded square (corner radius ~22%) in Waypointer Blue (#2563EB). White stylized "W" with the right stroke angled upward at ~15 degrees, creating a subtle arrow — pointing the way forward.

### Asset Variants

| File | Purpose |
|------|---------|
| `public/logo.svg` | Full-color mark (blue bg, white W) |
| `public/logo-dark.svg` | Blue W on transparent bg, for light backgrounds |
| `public/favicon.svg` | Browser tab favicon |
| `public/favicon.ico` | Legacy favicon fallback |
| `src/components/brand/logo.tsx` | React component — `size` and `variant` props |

### Integration Points

| Location | Treatment |
|----------|-----------|
| Employee sidebar | Mark + "Waypointer" wordmark |
| Employer sidebar | Mark + "Waypointer" wordmark + "Admin" badge |
| Email headers (all 4 templates) | Inline mark + "WAYPOINTER" text |
| PDF report cover | Embedded mark image |
| Landing page (`/`) | Navbar and hero |
| Login/signup page (`/login`) | Centered mark above form |
| Loading splash screen | Centered mark with subtle pulse animation |
| `/activate` page | Mark + "Welcome to Waypointer" header |
| Open Graph image | `public/og-image.png` — 1200x630, blue gradient bg, white logo + tagline |

## 2. Landing Page

Route: `/` (replaces current placeholder)

### Structure — single page, 5 sections

**Navbar** (sticky)
- Logo mark + "Waypointer" wordmark (left)
- "Log in" text button + "Get Started" primary button (right)
- Both link to `/login`

**Hero**
- Headline: "Career transition support for every employee — not just the C-suite."
- Subhead: "Give departing employees immediate, AI-powered transition support — from resume rewrites and job matching to interview prep — at a price that lets you cover everyone."
- Two CTAs: "Get Started" (primary) + "See How It Works" (outline, scrolls to features)
- No hero image — clean whitespace

**Proof Points** (horizontal row desktop, vertical stack mobile)
- Live in one day — "No implementation project. You're live in 24 hours."
- No integrations required — "No HRIS hookup, no IT tickets. Just upload a list."
- 90-day guided support — "Structured transition path from day one through placement."
- Employer dashboard — "Track engagement and outcomes without seeing individual data."
- A fraction of the cost — "Enterprise outplacement quality at a price that scales to every employee."

**How It Works** (3-step)
1. "Upload your employee list"
2. "Employees get immediate AI support"
3. "Track outcomes on your dashboard"

**Footer CTA + Footer**
- "Ready to support your team?" + "Get Started" button
- © 2026 Waypointer · getwaypointer.com

## 3. Login/Signup Page

Route: `/login`

Centered card on #FAFAFA background. Logo mark centered above the card.

**Tab toggle: Log in | Sign up**

Log in tab:
- Email field
- Password field
- "Log in" button
- "Forgot password?" link

Sign up tab (employer-only flow):
- Full name field
- Work email field
- Company name field
- Password field
- "Create employer account" button

Post-login routing:
- employer_admins → `/employer/dashboard`
- employee_profiles → `/dashboard`

Employees never sign up from this page. They arrive via `/activate` with a JWT token from the invitation email.

## 4. Design System Adherence

- Waypointer Blue: #2563EB
- Background: #FAFAFA
- Surface: #FFFFFF
- Font: Inter (400, 500, 600)
- Spacing: 4px base unit
- Border radius: 8px (var(--radius))
- Transitions: 200ms ease-out
- Loading: skeleton screens, never spinners
- Splash screen: pulse animation on logo mark
