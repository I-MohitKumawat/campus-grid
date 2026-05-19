# CampusGrid — Feature Specification & Version Roadmap

> **Platform Vision:** The operating layer for technical student life on campus. A hybrid of LinkedIn × GitHub × a notice board — built specifically for college students, designed to create a growth environment, surface talent, and make serious students impossible to ignore.

---

## Naming Direction

Suggested names in the *campus* family:
- **CampusGrid** — structured, professional, networked
- **CampusNexus** — connection hub
- **CampusEdge** — competitive advantage angle
- **CampusArc** — growth trajectory
- **CampusPulse** — live, active, heartbeat of college

> Recommendation: **CampusGrid** — it implies structure, networking (grid = connections), and feels like infrastructure rather than just a club. Domain: `campusgrid.in` or `campusgrid.co`

---

## Tech Stack (Production-Grade, Solo-Friendly)

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | Vercel (free tier) |
| Backend | Node.js + Express or Fastify | Render (free tier, upgrade later) |
| Database | PostgreSQL (primary) + Redis (caching/sessions) | Neon DB (serverless Postgres, free) or Supabase |
| Auth | NextAuth.js or Clerk | — |
| File Storage | Cloudinary or Supabase Storage | — |
| Email | Resend (free tier, developer-friendly) | — |
| OAuth Integrations | GitHub OAuth, LinkedIn OAuth, Google OAuth | — |
| Analytics | Plausible or Umami (self-hosted, privacy-first) | — |
| Payments (future) | Razorpay (India) | — |

---

## Profile System — Two-Tier Design

Rather than two separate profile types, a **single unified profile with unlock tiers** based on level.

### Tier 0 — Explorer (Fresh Joiners / First Years)
- Name, year, department, college email verified
- Bio (200 chars)
- Skills (self-declared tags, unverified)
- Profile photo
- Interest areas (checkboxes: Web Dev, ML, Design, etc.)
- "Learning Path" enrollment (optional)
- No GitHub/LinkedIn required yet

### Tier 1 — Builder (Unlocked after 100 XP or 2nd year+)
- Everything in Tier 0
- GitHub profile link (required to unlock)
- Projects section (pulled from GitHub or manual)
- Skill verification via GitHub/LeetCode/HackerRank APIs
- Visible on leaderboard

### Tier 2 — Contributor (Unlocked after 500 XP)
- Everything in Tier 1
- LinkedIn profile link (required to unlock)
- Endorsements from peers visible
- "Open to Opportunities" flag (visible to recruiters/clubs later)
- Can post on Opportunity Board
- Eligible for Club Roles

> This design removes first-year friction while still pushing everyone toward real profiles over time. The XP threshold naturally filters who progresses.

---

## Version 1 — Foundation (Weeks 1–6)

*Goal: Get the first 50 real users, make profiles feel worth having.*

### 1.1 Authentication & Onboarding
- Google OAuth login (college email preferred, enforce `@yourcollege.ac.in` domain)
- Onboarding wizard: Year → Department → Interests → Skills → Photo
- Unique public profile URL: `campusgrid.in/u/username`
- Email verification for college domain
- Profile completeness bar (drives them to fill everything out)

### 1.2 Student Profiles (Tier 0 + Tier 1)
- All fields from Tier 0 and Tier 1 above
- Project cards with title, description, tech stack tags, GitHub link, live demo link
- Skills section with tags (self-declared initially)
- "Currently working on" — a short status line
- Social links: GitHub, LinkedIn, Twitter/X, personal site
- Profile view counter (visible to the profile owner only)
- Shareable profile card (OG image generated for link previews — this makes sharing on WhatsApp look professional)

### 1.3 Event Gate System
- Simple event registration page per event
- Requires platform account to register
- Attendance confirmed by admin toggle
- Attendance auto-logs to profile as a badge/activity entry
- Admin dashboard to create events and manage registrations
- Export attendee list (CSV) for offline use

### 1.4 Basic Discovery
- Browse all students with filter by year, department, skills
- Search by name or skill tag
- Basic pagination

### 1.5 Admin Panel
- Simple dashboard for you to manage users, events, approve/reject flagged content
- Manually award XP for special cases
- View platform stats: total users, active this week, events hosted

---

## Version 2 — Economy & Gamification (Weeks 7–14)

*Goal: Make the platform sticky. Students should check it like they check Instagram.*

### 2.1 XP System (Non-Transferable)
XP is earned only through real actions. No daily login bonuses.

| Action | XP Earned |
|---|---|
| Complete profile to 100% | +50 XP |
| Link GitHub account | +30 XP |
| Link LinkedIn account | +20 XP |
| Pass a skill quiz | +40 XP per quiz |
| GitHub skill auto-verified | +35 XP per skill |
| Add a project with GitHub link | +25 XP |
| Attend a platform event | +30 XP per event |
| Post on Opportunity Board (approved) | +15 XP |
| Help someone (peer help session logged) | +50 XP |
| Complete a learning path milestone | +20 XP per milestone |
| Receive 3 peer endorsements on a skill | +25 XP |
| First year joining as a fresher | +10 XP (welcome bonus) |

### 2.2 Credit System (Transferable In-Platform Economy)
Credits are a soft currency for platform actions. Not real money.

| Action | Credits |
|---|---|
| Earned daily by helping others | +5 credits |
| Earned for event attendance | +10 credits |
| Earned by completing learning paths | +15 credits |
| **Spend:** Boost a post on Opportunity Board (24h highlight) | -20 credits |
| **Spend:** Send a "priority connect" request | -5 credits |
| **Spend:** Unlock "Who viewed my profile" (7 days) | -15 credits |

> Credits create engagement without real money. They can be tied to real perks later (event priority registration, merch, etc.)

### 2.3 Leaderboard System
Multiple leaderboards to avoid winner-take-all dynamics:

- **Overall XP Rank** — global leaderboard, resets each semester
- **Skill-Based Rankings** — Top 5 in each skill category (Python, Web Dev, ML, Design, etc.) — anyone can be #1 in something
- **Department Rankings** — Top students per department
- **Most Helpful This Month** — based on peer help sessions and endorsements
- **Rising Star** — highest XP gained this week (resets weekly, spotlights newcomers)

Leaderboard is public and shareable. "I'm #3 in ML at my college" is a real brag.

### 2.4 Badge & Achievement System

**Automatic Badges (system-awarded):**
- 🔗 GitHub Linked
- ✅ Verified Dev (GitHub + LeetCode verified)
- 🎯 Hackathon Veteran (attended 3+ hackathons on platform)
- 📚 Learner (completed a learning path)
- 🌟 Top 10 (entered top 10 on any leaderboard)
- 🤝 Connector (sent 10+ accepted connection requests)
- 📅 Event Regular (attended 5+ events)

**Manual Badges (admin-awarded):**
- 🏆 Club Member (for official club members)
- 👑 Founding Member (first 50 users — exclusive forever)
- 🎖️ Core Team (for your team members later)
- 🧑‍🏫 Mentor (for seniors who ran help sessions)

---

## Version 3 — Skill Verification & Learning (Weeks 15–22)

*Goal: Make profiles credible. "Top Python Dev at college" should mean something.*

### 3.1 OAuth-Based Auto Verification
Connect external profiles and auto-import verified signals:

- **GitHub OAuth:** Verifies account, pulls repos, detects top languages. Auto-badges top languages if repo count > threshold.
- **LeetCode API:** Pulls problem count and rating. Badges: "LeetCode 100+", "LeetCode 300+", etc.
- **Codeforces / CodeChef:** Pulls rating and division. Competitive programmer badge.
- **HackerRank:** Pulls badge certifications directly from their public API.

### 3.2 Quiz-Based Skill Badges
Short AI-generated MCQ tests (15 questions, 20 minutes) for soft/academic skills not covered by OAuth:

- Topics: Python Basics, HTML/CSS, SQL, Data Structures, React Fundamentals, Machine Learning Concepts, Linux Basics
- Pass threshold: 75%
- One retake allowed per 7 days
- Powered by Claude API — questions are regenerated each attempt (no memorizing answers)
- Badge appears on profile after passing
- XP awarded on first pass only

### 3.3 Peer Skill Endorsements
- Any Tier 1+ user can endorse another's skill (one endorsement per skill per person)
- 3 endorsements = "Peer Endorsed" tag on that skill
- Endorsement requester must have that skill themselves (or be a senior)
- Prevents spam endorsements

### 3.4 Learning Paths
Curated, not created. Structured lists of free external resources organized by week.

**Path Structure:**
- Path name + estimated duration
- Weeks broken into milestones
- Each milestone: 2–4 resource links (YouTube, docs, articles) + a checkpoint (quiz or project submission)
- Progress tracked per user (checkboxes per milestone)
- Completing a milestone = XP
- Completing a full path = badge + larger XP reward

**Initial Paths (V3 launch):**
- Web Development Fundamentals (8 weeks)
- Python for Beginners (6 weeks)
- Data Structures & Algorithms (10 weeks)
- Machine Learning Basics (8 weeks)
- UI/UX Design Fundamentals (6 weeks)
- Open Source Contribution Guide (4 weeks)

---

## Version 4 — Community & Opportunities (Weeks 23–32)

*Goal: Make the platform the place where things happen on campus.*

### 4.1 Opportunity Board
A structured posting system replacing a generic forum.

**Post Types:**
- 🤝 **Looking for Team** — hackathon/project, required skills, deadline, team size needed
- 💡 **Project Idea** — seeking collaborators, describe idea, tech stack, commitment level
- 📢 **Opportunity** — internship, freelance gig, open source project (Tier 2 only)
- 🆘 **Help Request** — "stuck on X, need help" — others can respond and earn XP
- 📅 **Event Announcement** — clubs or admins only

**Post Features:**
- Upvote system
- Comment thread
- "Interested" button → sends a connection request to poster
- Tag system: skills required, event name, deadline
- Posts expire automatically (configurable per type)
- Credit-based boost to stay at top of feed for 24h

### 4.2 Connection System
Not just LinkedIn-style connections — contextual connections:

- Send connection request with a note ("saw your ML project, want to collab")
- Accept / ignore
- Connected users can message each other (basic in-platform DM)
- Connections visible on profile
- "Mutual connections" shown when viewing profiles

### 4.3 Basic In-Platform DM
- Only between connected users (prevents spam)
- No group chats in V4 (complexity risk)
- Notification badge on navbar
- Email digest for unread messages (daily)

### 4.4 Department Diversity Feed
A dedicated section on the Discover page that surfaces students from *other* departments. Encourages cross-department project teams. CS student discovers a great designer or a mechanical student with fabrication skills.

### 4.5 "Open to Collaborate" Pulse
- Weekly toggle on profile dashboard
- When active, your profile card gets a green pulse indicator
- Shown prominently on Discover page that week
- Drives weekly active user habit

---

## Version 5 — Club Infrastructure (Months 9–12)

*Goal: When you launch GDG and IEEE, this platform is already their home.*

### 5.1 Club Pages
- Official pages for registered clubs (GDG, IEEE, etc.)
- Club profile: description, member count, past events, social links
- "Apply to Join" button → application form → admin approval
- Accepted members get club badge on their profile
- Club admins can post events directly to the platform

### 5.2 Club Membership Management
- Application form builder (custom questions per club)
- Admin review queue (accept/reject with note)
- Member roster visible to club admins
- Role assignment within club: Member, Core, Lead
- Roles show on member profiles

### 5.3 Event Management (Upgraded)
- Rich event pages: description, banner image, speakers, schedule
- RSVP with seat limit enforcement
- Waitlist system
- QR code check-in for in-person events (admin scans, marks attendance automatically)
- Post-event: auto-sends attendance badge to attendees
- Event gallery (photo upload by admin)

### 5.4 Peer Help Sessions
- Any senior (Tier 2+) can offer a "Help Session" on a topic
- Duration, medium (in-person / Google Meet), max participants
- Juniors book a slot
- After session: both parties confirm it happened → helper earns XP + credits
- Session log on helper's profile (builds a tutoring reputation)
- Optional: rating system (1-5 stars) for helpers

---

## Version 6 — Monetization & Scale (Year 2+)

*This version is about converting traffic into revenue without compromising the user experience.*

### 6.1 Advertising
- **Google AdSense** — on public profile pages (non-logged-in visitors), event pages, leaderboard
- **Sponsored Posts** on Opportunity Board — paid placement for college departments, bootcamps, startup founders. ₹500–₹2000 per post. Labeled "Sponsored" clearly.
- **College Department Ads** — department heads pay to announce their workshops, seminars, competitions to a captive technical audience

### 6.2 Premium Profiles
Small optional upgrade. Never paywalls core features.

- Custom profile URL slug (e.g., `/u/mohit` instead of `/u/mohit_2024_cse`)
- Profile theme colors (subtle customization)
- "Profile Analytics" — see how many views, which skills got clicks, week-over-week
- "Boosted Discovery" — appear higher in Discover filters for 7 days
- Price: ₹99–₹199/month

### 6.3 Verified Campus Ambassador Program
- Top students (Top 10 leaderboard) get "Campus Ambassador" status
- They get a premium profile free
- They help spread the platform in exchange for perks
- Zero cash cost to you, massive organic growth

### 6.4 Affiliate Learning Links
- Learning Paths link to free resources by default
- Optionally include affiliate links to Udemy, Coursera, or other paid courses
- Low effort, passive income at scale

---

## Cross-Cutting Production Features (All Versions)

These are non-negotiable for a production-grade platform:

### Security
- Rate limiting on all API endpoints (express-rate-limit)
- Input validation and sanitization (Zod schemas)
- CSRF protection
- Helmet.js for HTTP headers
- Secure cookie settings for sessions
- Email verification before any profile is active
- Content moderation queue for Opportunity Board posts (auto-hold new users' first 3 posts)

### Performance
- Server-side rendering for public profile pages (SEO + speed)
- Image optimization via Next.js Image component + Cloudinary
- Redis caching for leaderboard queries (recalculate every 15 mins, not per-request)
- Lazy loading for feed and discover pages
- Debounced search (no DB hammering on every keypress)

### SEO & Shareability
- Public profile pages fully SSR with proper meta tags
- OG image auto-generated per profile (name, skills, rank shown in preview card)
- This means sharing `campusgrid.in/u/mohit` on WhatsApp shows a real card — huge for organic growth

### Notifications
- In-app notification bell (connection requests, event reminders, XP earned, leaderboard rank change)
- Email digest (daily or weekly, user preference)
- No push notifications in early versions (complexity not worth it yet)

### Analytics (Internal)
- Track: signups per week, DAU/WAU, most used features, event conversion rate, top referral sources
- Use Plausible or self-hosted Umami (privacy-first, no cookie banner needed)

---

## Cold Start Strategy

Getting the first 50 users is the hardest part. Here's the playbook:

1. **Founding Member badge** — first 50 users get an exclusive badge that never goes away. Announce this before launch. Creates urgency.
2. **Event gate** — the next college tech event requires platform signup. Even if 80% don't care, they're now accounts.
3. **Personal outreach** — get your 20–30 closest technical friends on it first. Make sure their profiles look great. Screenshot and share.
4. **WhatsApp group drop** — post the platform in every college tech WhatsApp group the week of launch.
5. **Department reps** — find one enthusiastic person per department who will push it in their friend circles in exchange for an early "Campus Rep" badge.

---

## What NOT to Build in V1

Things that feel important but will kill solo momentum:

- Group chats / real-time chat (high complexity, low early value)
- Mobile app (PWA is enough early on)
- Complex algorithmic feed (chronological is fine early)
- Payment system (not needed until V6)
- Video uploads (cost and complexity)
- Full blog/article system (Opportunity Board covers this)

---

## Summary: Version Timeline

| Version | Focus | Timeline | Key Unlock |
|---|---|---|---|
| V1 | Profiles + Events + Discovery | Weeks 1–6 | First real users, event gate |
| V2 | XP + Credits + Leaderboard + Badges | Weeks 7–14 | Platform becomes sticky |
| V3 | Skill Verification + Learning Paths | Weeks 15–22 | Profiles become credible |
| V4 | Opportunity Board + Connections + DMs | Weeks 23–32 | Real networking happens |
| V5 | Club Infrastructure + Help Sessions | Months 9–12 | GDG/IEEE home base |
| V6 | Ads + Premium + Affiliate | Year 2+ | Revenue |
