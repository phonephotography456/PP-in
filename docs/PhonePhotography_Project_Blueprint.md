# PhonePhotography.in

**Complete Project Structure & Functional Blueprint**

*Website • Photographer Panel • Admin Panel*

Project planning document | MVP scope

# 1. Project Overview

PhonePhotography.in is a focused marketplace and directory for photographers who create photography using smartphones. Visitors discover photographers and service packages by service, location, smartphone brand/model and price, then contact the photographer directly through WhatsApp or the listed contact options.

## Product objective

- Help customers find smartphone photographers and compare their service packages.
- Give photographers a simple panel to manage their profile, services, packages and portfolio.
- Give administrators control over approvals, master data, locations, packages, portfolio content and homepage highlights.

## MVP principles

- Keep the experience clean, minimal, image-focused and mobile-first.
- Build three components only: public website, photographer panel and admin panel.
- Use direct WhatsApp/contact enquiries; do not build online booking or payment processing in the MVP.
- Avoid subscriptions, availability calendars, complex CRM, AI recommendations and unnecessary automation.
- Smartphone photography is the focus; this is not a general DSLR-photographer directory.

# 2. User Roles

| Role | What they can do |
|---|---|
| Visitor / Customer | Browse and search photographers/packages; view profiles and service pages; contact photographers. |
| Photographer | Register, maintain profile, select services and smartphones, manage packages and portfolio, view public profile. |
| Administrator | Approve photographers; manage master data and locations; moderate packages and portfolio; manage homepage content. |

# 3. Public Website Structure

## 3.1 Main navigation

- Logo / Home
- Browse Photographers
- Browse Services
- Become a Photographer
- Photographer Login
- Primary search access

## 3.2 Homepage section order

1. Header and navigation.
2. Large banner image with main heading and supporting text.
3. Search filters, in this exact order: Photography Service → State → City → Smartphone Brand/Model → Price Range.
4. Basic Packages listing.
5. Standard Packages listing.
6. Premium Packages listing.
7. Top Photographers listing.
8. Browse States section with state cards linking to state pages.
9. Small "Become a Photographer" banner.
10. Browse Services section with service cards.
11. Footer.

### Homepage package cards

- Each package card represents a photographer's package for a particular service and level.
- Show package image, package level, photographer/business name, service, city/state, smartphone brand/model, price and a concise description.
- The homepage filters apply to all three package-level sections.
- The same photographer may appear more than once when they offer different services/packages.

## 3.3 Public page inventory

| Page / template | Suggested URL | Purpose |
|---|---|---|
| Homepage | / | Main discovery and search page. |
| Search results | /search | Results filtered by service, location, smartphone and price. |
| All photographers | /photographers | Browse approved photographer profiles. |
| State listing | /photographers/{state-slug} | Photographers/packages in a state. |
| State + service listing | /photographers/{state-slug}/{service-slug} | Service discovery within a state. |
| City listing | /photographers/{state-slug}/{city-slug} | Photographers/packages in a city. |
| City + service listing | /photographers/{state-slug}/{city-slug}/{service-slug} | Service discovery within a city. |
| Service listing | /services/{service-slug} | Browse photographers/packages for a service. |
| Photographer profile | /photographers/p/{photographer-slug} | Photographer identity, contact, services and general portfolio. |
| Photographer service page | /photographers/p/{photographer-slug}/{service-slug} | Selected service details, all package tiers and service portfolio. |
| Photographer registration | /photographer/register | New photographer registration. |
| Photographer login | /photographer/login | Photographer sign-in. |
| Forgot password | /photographer/forgot-password | Password recovery. |
| About Us | /about-us | Static information. |
| Contact Us | /contact-us | Contact information. |
| Privacy Policy | /privacy-policy | Privacy terms. |
| Terms & Conditions | /terms-and-conditions | Usage terms. |
| Not found | /404 | Invalid or unavailable page. |

## 3.4 Shared structure for location/service listing pages

- Page heading and a short, relevant introduction.
- Basic Packages cards.
- Standard Packages cards.
- Premium Packages cards.
- Top Photographers section where relevant.
- Related cities, states or services for navigation.
- Become a Photographer banner.
- Footer.

These are database-driven page templates, not manually created pages. Create and index a location/service page only when it has enough relevant active listings and useful content; avoid thin or duplicate pages.

# 4. Critical Package-Card Navigation Rule

**This rule applies everywhere on the public website:** clicking any Basic, Standard or Premium package card must open that photographer's dedicated page for the relevant service.

**Example destination:** /photographers/p/sagar-neel-photography-bengaluru/pre-wedding

- The destination service page displays the Basic, Standard and Premium packages for that photographer and that selected service.
- The destination is the same regardless of which package tier card the visitor clicked.
- Do not create individual package-detail pages or package-specific detail URLs.
- Apply this rule to cards on the homepage, search results, state/city/service listings, and all other package sections.

# 5. Photographer Profile and Service Pages

## 5.1 Photographer profile page

- Cover/banner image.
- Profile photo and/or business logo.
- Photographer or business name.
- City and state.
- Smartphone brand(s) and model(s) used.
- About / introduction.
- Phone, WhatsApp and other contact options.
- Social links: Instagram, YouTube and website where provided.
- Services offered, linking to the photographer's service pages.
- General portfolio.

## 5.2 Photographer service page

- Photographer name and service-specific introduction/details.
- Basic, Standard and Premium package sections for that service.
- Each package: name, price, short description, inclusions, detailed description and images.
- Service-specific portfolio images.
- WhatsApp enquiry/contact option.

One photographer has one profile page and a separate service page for each service they offer.

# 6. Photographer Panel

| Panel section | Functions and fields |
|---|---|
| 1. Dashboard | Welcome; approval status (Pending / Approved / Rejected); profile completion indicator; service/package counts; quick links; view public profile. |
| 2. My Profile | Name, phone, WhatsApp, email, profile photo, logo, banner, about, state, city, smartphone brand/models, Instagram, YouTube and website. |
| 3. Services & Packages | Choose services from admin-managed options. For each service, manage Basic, Standard and Premium packages. Add/edit/delete/preview package details and images. |
| 4. My Portfolio | Create named portfolio segments/categories; upload images; edit/delete segments and images; preview portfolio. |
| 5. Account Settings | Change password, update account details and logout. |

## 6.1 Package fields

- Package level: Basic, Standard or Premium.
- Package name.
- Price.
- Two-line short description for cards.
- What's included: bullet-point list.
- Detailed description.
- Three to five package images.

Allow at most one package at each level for each photographer/service combination. Do not require all three levels to be fully completed before a photographer can save or manage a service unless that rule is separately approved.

# 7. Photographer Registration

- Name.
- Phone number.
- WhatsApp number.
- Email address with email OTP verification.
- Photographer profile photo.
- Logo (optional).
- Instagram link (optional).
- YouTube link (optional).
- Website (optional).
- State and city (city options depend on selected state).
- Services (multi-select from active Admin-managed services).
- Smartphone brand/model (select from Admin-managed options; allow multiple devices).
- Password.

New registrations require administrator approval before the photographer or their packages appear publicly. Provide a forgot-password flow.

# 8. Admin Panel

Exactly seven main admin pages. Account actions can live in the account menu; do not add a separate Settings main page.

| Admin page | Functions |
|---|---|
| 1. Dashboard | Total photographers; approved, pending and rejected counts; total packages; recent signups. |
| 2. Photographers | Search, view, edit, approve, reject and deactivate photographers; inspect profile, phone models, services, packages and portfolio. |
| 3. Master Data Management | One page with tabs for Services, Smartphone Brands and Smartphone Models. Add/edit/delete/activate/deactivate records; models belong to brands. |
| 4. Locations | Manage states and cities; city belongs to a state. |
| 5. Packages | View/filter packages by photographer, service, level and price; moderate package publication/status. |
| 6. Portfolio | Review and moderate uploaded portfolio images. |
| 7. Homepage Management | Manage homepage banner images, headings/descriptions and featured photographers/content. |

## 8.1 Master Data Management tabs

- Services: create and manage service choices such as Pre-wedding, Wedding, Engagement, Birthday and Post-wedding.
- Smartphone Brands: create and manage brands such as Apple, Samsung, Google, OnePlus, Vivo and Xiaomi.
- Smartphone Models: add models under a selected brand and manage their active status.
- Only active records appear in new registration/profile selections and customer filters.
- Deactivation must not erase existing photographer records or historical package data.

# 9. Search and Filtering

Keep the filter order consistent across homepage and search:

1. Photography service
2. State
3. City (dependent on selected state)
4. Smartphone brand/model
5. Price range

- Price filtering uses package prices, not a photographer-level generic price.
- Support multiple smartphone devices per photographer.
- Search results show package cards grouped into Basic, Standard and Premium sections where applicable.
- Every package card follows the global navigation rule in Section 4.

# 10. Business Rules and Visibility

1. Only approved photographers are publicly listed.
2. Only published/approved packages are publicly displayed.
3. A photographer may offer multiple services selected from Admin-managed services.
4. For each photographer/service pair, allow one Basic, one Standard and one Premium package at most.
5. A photographer may associate multiple Admin-managed smartphone models with their profile.
6. Only active services, brands and models are available for new selections.
7. Deactivating a master-data item does not delete existing associations or historical data.
8. Homepage filters affect all three package-level sections.
9. City choices depend on the selected state.
10. Price filters operate on package prices.
11. Customer enquiries go through WhatsApp/contact options; no online booking/payment workflow in MVP.
12. All package-card clicks lead to the photographer's service page, which displays all three package tiers for that service.
13. Dynamic SEO pages should be indexable only when they have sufficient unique, relevant listings/content.

# 11. Suggested Data / Database Modules

| Module / table | Purpose / key relationships |
|---|---|
| users / auth | Login identity, email, password hash, role and account status. |
| photographers | Photographer profile, contact details, location, about text, images, approval status and social links. |
| photographer_phones | Many-to-many or child records connecting photographer to smartphone brand/model; supports multiple devices. |
| services | Admin-managed service master data and active status. |
| photographer_services | Many-to-many relation between photographers and services. |
| smartphone_brands | Admin-managed brand records. |
| smartphone_models | Models linked to a brand; active status. |
| packages | Photographer + service + level, package name, price, descriptions, inclusions and publication status. |
| package_images | Images belonging to a package, with sort order. |
| portfolio_segments | Photographer-owned portfolio categories/segments. |
| portfolio_images | Images belonging to a portfolio segment; moderation/status and sort order. |
| states / cities | Central location master data; city linked to state. |
| homepage_banners | Homepage banner image, heading, description, order and active status. |
| homepage_featured_items | Featured photographer/content selection and display order. |
| static_pages (optional) | Static page content if stored in the database; no separate CMS page in Admin MVP. |

## 11.1 Important data constraints

- Enforce uniqueness for (photographer_id, service_id, package_level).
- Use foreign keys for photographer, service, brand, model, state and city relationships.
- Store smartphone brand and model as structured references, not free-text-only values.
- Store image metadata and ordering separately from package/profile/portfolio records.
- Keep approval, publication and active/inactive statuses explicit.

# 12. Suggested Status Values

| Entity | Suggested statuses |
|---|---|
| Photographer | Pending, Approved, Rejected, Inactive |
| Package | Draft, Pending Review (if moderation is enabled), Published, Rejected, Inactive |
| Service / Brand / Model | Active, Inactive |
| Portfolio image | Pending Review (if moderation is enabled), Approved, Rejected, Inactive |

The precise package and portfolio moderation workflow can be finalized during implementation; the Admin panel must at minimum be able to review and moderate these records.

# 13. Navigation and URL Behaviour

- Use stable slugs for states, cities, services and photographer profiles.
- A photographer's service URL is formed from the photographer slug plus service slug.
- All package cards carry the photographer identifier and service identifier needed to construct the photographer-service destination.
- Do not expose package IDs as public detail-page routes.
- Service links on a photographer profile open that photographer's corresponding service page.

# 14. Design and UX Direction

- Clean, minimal, elegant and image-led, taking inspiration from the simplicity of PhotoBlinks without copying its identity.
- White/light background, readable sans-serif typography, generous spacing and large photography.
- Mobile-first responsive layouts for public website and both panels.
- Keep forms short and grouped logically; show dependent city options only after state selection.
- Use clear status labels and straightforward actions in panels.
- Avoid excessive gradients, animation, clutter and complex dashboard widgets.

# 15. Explicitly Out of Scope for MVP

- Payment gateway or online checkout.
- Online booking engine or appointment scheduling.
- Photographer availability calendar.
- Subscriptions or paid membership plans.
- Complex CRM or lead-management pipeline.
- AI recommendations or automated matching.
- Separate package-detail pages.
- A separate Website Pages/CMS main page in Admin.
- Separate Admin pages for services, smartphone brands and smartphone models (these remain tabs in Master Data Management).

# 16. Recommended Implementation Sequence

1. Set up authentication, roles and the core database/master-data structure.
2. Build Admin Master Data Management and Locations so all dropdown data is centrally controlled.
3. Build photographer registration, OTP verification, login, password recovery and approval workflow.
4. Build Photographer Panel: profile, services/packages, portfolio and account settings.
5. Build public photographer profile and photographer-service page templates, including the mandatory package-card destination behaviour.
6. Build public homepage, search and dynamic state/city/service listing templates.
7. Build Admin moderation for photographers, packages and portfolio, plus homepage management.
8. Add SEO metadata, sitemap/indexing rules, responsive QA and end-to-end testing.

# 17. MVP Acceptance Checklist

- [ ] A visitor can filter by service, state, city, smartphone and package price.
- [ ] City options update based on selected state.
- [ ] A photographer can register, verify email and submit for approval.
- [ ] An Admin can approve/reject/deactivate a photographer.
- [ ] Only approved photographers and published packages appear publicly.
- [ ] A photographer can select multiple services and smartphone models.
- [ ] A photographer can manage Basic, Standard and Premium packages for each service.
- [ ] A photographer can manage portfolio segments and images.
- [ ] Admin can manage services, brands and models from one tabbed Master Data Management page.
- [ ] Admin can manage states and cities.
- [ ] Admin can review packages and portfolio images.
- [ ] Admin can update homepage banner and featured content.
- [ ] Every package card, wherever shown, opens the photographer's service page for that card's service.
- [ ] That service page shows all three package levels for that photographer/service, not a single-package detail view.
- [ ] Visitors can contact the photographer through WhatsApp/contact options.
- [ ] The website works well on mobile.

# 18. Items to Confirm Before Development

- Whether package submission requires Admin approval before publication, or approved photographers can publish packages directly.
- Whether portfolio images require Admin approval before display.
- Whether package price can be negotiable / "Contact for price", or must always be numeric.
- Whether the first release is India-only (the current location model assumes Indian states and cities).
- Exact OTP provider, email delivery provider, image storage and hosting stack.

These are implementation decisions, not additions to the agreed MVP feature set. The core structure above preserves the current scope and navigation decisions.

# 19. Service Reviews & Ratings (New Addition)

Visitors can read approved reviews on a photographer's dedicated service page. Only signed-in users can submit a review. Every submitted review is held for Admin approval and is not visible publicly until it has been approved.

## 19.1 Reviewer sign-in requirement

- A visitor must sign in before submitting a service review.
- If a visitor clicks "Write a Review" while signed out, direct them to sign in or create a reviewer account.
- After successful sign-in, return the user to the same photographer's service page and allow them to submit the review.
- Reviewer accounts are customer/user accounts and are separate from photographer accounts.

## 19.2 Review submission form

- Rating (for example, a 1–5 star rating).
- Review title (optional).
- Written review / feedback.
- The review is associated with the specific photographer and service page being reviewed.
- Store the signed-in reviewer's user account and submission date with the review.

## 19.3 Submission confirmation shown to the reviewer

> ***"Your review has been submitted and is under review. It will be published once approved by our admin team."***

Show this confirmation immediately after a successful submission. The review remains pending and must not appear publicly while awaiting approval.

## 19.4 Admin approval workflow

1. A newly submitted review receives Pending status.
2. Admin opens the review in the Admin panel and can read the rating, written feedback, reviewer, photographer and service.
3. Admin can Approve or Reject the review.
4. When approved, the review becomes visible on the relevant photographer's service page.
5. When rejected, the review remains hidden from the public website.
6. The reviewer should see an appropriate status when signed in, such as Pending, Approved or Rejected.

## 19.5 Where reviews appear

- Show approved reviews on the relevant photographer service page.
- Do not show pending or rejected reviews publicly.
- Reviews belong to a specific photographer + service combination; they should not automatically appear on the photographer's other service pages.
- Display reviewer name (or chosen display name), rating, review text and review date, subject to the site's privacy/display policy.

## 19.6 Admin panel placement (keep the agreed seven main pages)

Do not add an eighth Admin main page. Add a "Reviews" tab/section within the existing Photographers page. Admin can filter reviews by photographer, service and status, then approve or reject each submission.

## 19.7 Database additions

| Module / table | Purpose / key fields |
|---|---|
| reviewer users / auth role | Allow customer/reviewer sign-in separately from photographer accounts; reuse the central users/auth system with a customer role. |
| service_reviews | reviewer_user_id, photographer_id, service_id, rating, title (optional), review_text, status, submitted_at, reviewed_by and reviewed_at. |

## 19.8 Review business rules

- Only signed-in customer/reviewer accounts can submit reviews.
- A review must reference a valid photographer and one of that photographer's services.
- All reviews require Admin approval before public display.
- Only Approved reviews appear on the public service page.
- Pending and Rejected reviews remain private to the public.
- The submission confirmation must tell the reviewer that the review is under review and will be published after Admin approval.
- Keep review moderation within the existing Admin structure; do not create a new main Admin page.

## 19.9 Acceptance checklist additions

- [ ] A signed-out visitor who chooses to write a review is asked to sign in or create a reviewer account.
- [ ] After sign-in, the reviewer can submit a rating and written review for the selected photographer service.
- [ ] The reviewer sees the under-review confirmation after submission.
- [ ] The submitted review is not visible publicly while pending.
- [ ] Admin can approve or reject reviews from the existing Admin panel.
- [ ] An approved review appears only on the relevant photographer service page.
- [ ] A rejected review remains hidden.

# 20. Project Execution Phases: Design to Testing

The project should be completed in the phases below. Each phase has a clear objective, key activities, deliverables and a completion checkpoint. The sequence is intended for the agreed MVP: public website, photographer panel, Admin panel and service-review moderation.

| Phase | Main focus | Key output |
|---|---|---|
| 1 | Project discovery and requirement finalisation | Approved scope, requirements and workflows |
| 2 | UX planning and information architecture | Sitemap, user flows and wireframes |
| 3 | UI design | Approved responsive screen designs and design system |
| 4 | Technical planning and architecture | Architecture, database schema and API plan |
| 5 | Development environment and project setup | Working codebase, environments and deployment pipeline |
| 6 | Core backend and authentication | Database, roles, login, registration and security foundations |
| 7 | Admin panel development | Master data, locations, approvals and content moderation |
| 8 | Photographer panel development | Profile, services, packages, portfolio and account management |
| 9 | Public website development | Homepage, search, listing templates and photographer pages |
| 10 | Service reviews development | Reviewer sign-in, review submission and Admin approval flow |
| 11 | Integration and SEO | Connected end-to-end workflows, metadata and indexing setup |
| 12 | Quality assurance and testing | Tested, fixed and release-ready MVP |
| 13 | User acceptance testing and launch | Stakeholder sign-off and production release |

## Phase 1: Project Discovery and Requirement Finalisation

Objective: Confirm exactly what will be built before design and development begin.

- Review and freeze the complete project structure, page inventory, user roles and MVP exclusions.
- Confirm photographer registration fields, email OTP flow and Admin approval rules.
- Confirm package rules: Basic, Standard and Premium per photographer/service, and package-card navigation to the photographer's service page.
- Confirm service review rules: reviewer must sign in, submitted reviews are pending, Admin approves/rejects, and only approved reviews become public.
- Confirm contact method, price format, image limits, moderation expectations and India-first location structure.
- Write user stories and acceptance criteria for visitors, photographers and administrators.

Deliverables: final requirements document, user stories, scope sign-off and prioritised MVP backlog.

Completion checkpoint: all business rules and unresolved decisions are agreed before UI design.

## Phase 2: UX Planning and Information Architecture

Objective: Plan how users move through the website and panels.

- Prepare the sitemap for public website, photographer panel and Admin panel.
- Map visitor journeys: discover packages, filter results, open a photographer service page and contact the photographer.
- Map reviewer journey: sign in/register, return to the selected service page, submit review and see pending confirmation/status.
- Map photographer journey: register, verify email, wait for approval, complete profile, add services/packages and portfolio.
- Map Admin journeys: approve photographers, maintain master data, manage locations, moderate packages/portfolio/reviews and manage homepage content.
- Create low-fidelity wireframes for desktop and mobile layouts, including empty, loading, error and status states.

Deliverables: sitemap, user-flow diagrams and approved wireframes.

Completion checkpoint: stakeholders approve the page structure and all key user journeys.

## Phase 3: UI Design

Objective: Establish the visual design and reusable interface components.

- Define typography, spacing, layout grid, colours, buttons, form fields, cards, navigation and status styles.
- Design the homepage with the agreed section order and search-filter order.
- Design package cards for Basic, Standard and Premium, ensuring each card communicates the service and photographer.
- Design state, city, service and search-results listing templates.
- Design photographer profile and photographer service pages, including all three package tiers and approved reviews.
- Design registration, login, OTP, forgot-password and reviewer sign-in screens.
- Design photographer dashboard, profile, services/packages, portfolio and account settings.
- Design all seven Admin main pages, including the Reviews tab within Photographers.
- Prepare responsive designs for mobile, tablet and desktop; include form validation, pending/approved/rejected and empty states.

Deliverables: approved high-fidelity designs, component library/design system and design handoff specifications.

Completion checkpoint: all MVP screens and responsive states are approved before frontend implementation.

## Phase 4: Technical Planning and Architecture

Objective: Decide how the application will be built and how its data will connect.

- Select the frontend, backend, database, hosting, email/OTP provider and image-storage approach.
- Define application architecture, environments, API conventions and error-handling approach.
- Finalise database tables and relationships for users, photographers, services, phones, packages, portfolio, locations, homepage content and reviews.
- Define role-based permissions for visitors/customers, photographers and administrators.
- Define statuses and transitions for photographer approval, package publication, portfolio moderation and review moderation.
- Define image upload constraints, file validation, storage paths and image optimisation.
- Define URL/slug generation and canonical URL rules for dynamic listing and photographer service pages.

Deliverables: technical architecture document, ER diagram, API specification and environment plan.

Completion checkpoint: technical design supports all agreed business rules, especially the package and review workflows.

## Phase 5: Development Environment and Project Setup

Objective: Prepare a stable development workflow.

- Create source-code repositories and establish branch, code-review and release conventions.
- Set up local, staging and production environments.
- Configure database connections, environment variables, secrets and access permissions.
- Set up frontend and backend application foundations, routing, shared components and logging.
- Configure automated build/deployment pipeline and basic error monitoring.
- Set up development seed data for sample services, brands, models, states and cities.

Deliverables: running application skeleton, environment configuration and deployment pipeline.

Completion checkpoint: the team can deploy a basic build to staging reliably.

## Phase 6: Core Backend and Authentication

Objective: Build the shared data and account foundations used by all three application areas.

- Create database tables, relationships, indexes and constraints.
- Implement account registration, login, logout, password hashing and password reset.
- Implement email OTP verification for photographer registration.
- Implement customer/reviewer account sign-in and registration.
- Implement role-based access control and protected routes/APIs.
- Implement photographer, service, smartphone, package, location, portfolio and review data APIs.
- Implement upload handling and validation for profile, package and portfolio images.

Deliverables: tested backend services, database migrations and authentication/authorisation flows.

Completion checkpoint: each role can securely access only its permitted functions.

## Phase 7: Admin Panel Development

Objective: Build the controls required to operate and moderate the marketplace.

- Build Admin dashboard with photographer and package summary counts and recent signups.
- Build Photographers management: search, inspect, edit, approve, reject and deactivate.
- Add the Reviews tab within Photographers: filter and inspect submitted reviews, then approve or reject.
- Build Master Data Management with Services, Smartphone Brands and Smartphone Models tabs.
- Build Locations management for states and cities.
- Build Packages management and moderation.
- Build Portfolio review/moderation.
- Build Homepage Management for banners, headings/descriptions and featured photographers/content.

Deliverables: functional seven-page Admin panel with moderation and master-data controls.

Completion checkpoint: Admin can operate the core platform without direct database edits.

## Phase 8: Photographer Panel Development

Objective: Let photographers manage the information displayed on the public website.

- Build dashboard with approval status, profile completion, counts and public-profile link.
- Build profile editor, including location, contact details, social links and multiple smartphone devices.
- Build service selection using active Admin-managed services.
- Build package management with one Basic, Standard and Premium package per selected service.
- Build package image uploads, previews and draft/publication handling.
- Build portfolio segment and image management.
- Build account settings and password changes.

Deliverables: complete photographer panel connected to backend and Admin-managed data.

Completion checkpoint: an approved photographer can create and maintain their public profile, services, packages and portfolio.

## Phase 9: Public Website Development

Objective: Build the customer-facing discovery and contact experience.

- Build the homepage in the agreed section order and implement homepage content managed by Admin.
- Build the search filters in the exact order: service, state, city, smartphone brand/model and price.
- Build search results and all photographers listing.
- Build dynamic state, state + service, city, city + service and service listing templates.
- Build photographer profile pages and individual photographer-service pages.
- Display Basic, Standard and Premium package sections on the relevant photographer-service page.
- Implement the global package-card rule: every package card opens the photographer's service page for that service, never an individual package page.
- Add WhatsApp and other agreed contact links.
- Build About, Contact, Privacy Policy, Terms and 404 pages.
- Ensure responsive layouts and image optimisation.

Deliverables: complete responsive public website connected to live data.

Completion checkpoint: visitors can discover, compare and contact photographers across all agreed page types.

## Phase 10: Service Reviews Development

Objective: Add a moderated review flow to each photographer-service page.

- Add a Write a Review action on the relevant service page.
- Require customer/reviewer sign-in; redirect signed-out users to sign in/register and then return them to the same service page.
- Build the review form with rating and written feedback, associated with the selected photographer and service.
- Save each new review with Pending status.
- Show the submitter the confirmation: "Your review has been submitted and is under review. It will be published once approved by our admin team."
- Connect review moderation to the Reviews tab inside Admin → Photographers.
- Display only approved reviews on the matching photographer-service page; keep pending/rejected reviews hidden.

Deliverables: end-to-end reviewer sign-in, submission, confirmation, moderation and public display.

Completion checkpoint: no review can become public without Admin approval.

## Phase 11: Integration, SEO and Content Setup

Objective: Connect all application areas and prepare public pages for discovery.

- Integrate public website, photographer panel, Admin panel and backend APIs.
- Test the full photographer lifecycle from registration and approval through package publication.
- Test the full review lifecycle from sign-in and submission through Admin approval and public display.
- Set page titles, meta descriptions, canonical URLs, structured data where appropriate and social-sharing metadata.
- Generate XML sitemap and configure robots/indexing rules.
- Prevent indexing of thin, empty, duplicate or unavailable dynamic listing pages.
- Load and verify initial services, smartphone brands/models, states and cities.
- Check WhatsApp/contact links, email delivery, OTP and password reset in the target environment.

Deliverables: integrated staging application, SEO configuration and initial master data.

Completion checkpoint: all main workflows work across roles and page templates.

## Phase 12: Quality Assurance and Testing

Objective: Identify and fix functional, visual, security and performance issues before release.

- Functional testing: registration, OTP, login, password reset, profile updates, service selection, package CRUD and portfolio CRUD.
- Approval testing: pending photographers are hidden; approved photographers appear; rejected/inactive records remain unavailable publicly.
- Package testing: one package per tier per photographer/service; price filters work; all package cards route to the correct photographer-service page.
- Review testing: sign-in is required; pending/rejected reviews are hidden; Admin approval makes a review visible only on the correct service page.
- Admin testing: all seven main pages and all moderation actions work with correct permissions.
- Search testing: service, state, dependent city, smartphone and price filters work individually and in combination.
- Responsive testing across common mobile, tablet and desktop screen sizes.
- Cross-browser testing on supported browsers.
- Security testing: access control, input validation, file upload validation, rate limiting for OTP/login/review submissions and protection against common web vulnerabilities.
- Performance testing: page load, image sizes, database queries and search response.
- Accessibility checks: keyboard navigation, labels, contrast and meaningful image alt text.
- Regression testing after fixes; record defects, severity, owner and retest result.

Deliverables: test cases, defect log, regression results and QA sign-off.

Completion checkpoint: no open critical/high-severity defects; all release-critical acceptance tests pass.

## Phase 13: User Acceptance Testing and Launch

Objective: Confirm the MVP meets business expectations and release it safely.

- Conduct UAT using realistic visitor, photographer, reviewer and Admin scenarios.
- Verify content, service names, phone models, location data, homepage banners and contact details.
- Obtain sign-off on the agreed acceptance checklist.
- Prepare production database, backups, domain, SSL, email/OTP settings, image storage and monitoring.
- Deploy the approved release to production.
- Run smoke tests on live registration, login, search, profile/service pages, WhatsApp links and review submission/moderation.
- Monitor errors, performance, email delivery and user feedback after launch.
- Prepare a simple process for reporting issues and shipping fixes.

Deliverables: UAT sign-off, production deployment, launch checklist and post-launch support plan.

Completion checkpoint: production smoke tests pass and the project owner accepts the MVP.

## Suggested Phase Gates

| Gate | Must be true before moving on |
|---|---|
| Scope gate | Requirements, business rules and MVP exclusions are approved. |
| Design gate | Sitemap, wireframes and responsive UI designs are approved. |
| Technical gate | Architecture, schema, roles and API contracts are agreed. |
| Build gate | Core Admin, Photographer and public workflows are implemented and integrated. |
| QA gate | Release-critical test cases pass; critical/high defects are resolved. |
| Launch gate | UAT is signed off, production configuration is ready and smoke tests pass. |

## Recommended Project Tracking

- Track each phase as a milestone with an owner, planned start/end date, status and deliverables.
- Track individual features as tasks under the relevant phase.
- Use statuses such as Not Started, In Progress, Blocked, In Review and Completed.
- Do not mark a phase complete until its deliverables and completion checkpoint are met.
- Keep changes to scope documented so new requests do not silently expand the MVP.
