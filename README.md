# GET-PC static website

This website uses HTML, CSS, and JavaScript.

## Publishing

Place these files in the root of the existing GitHub repository.
Keep CNAME and .nojekyll.

The included .github/workflows/static.yml publishes the repository
root when changes are pushed to main.

For a local preview, open index.html using VS Code Live Server.

## Included features

- Home-page WhatsApp and email contact bar.
- Quick registration without an account.
- WhatsApp registration messages prepared from the visitor's details.
- Selected course carried from the training page into registration.
- Service-specific WhatsApp enquiries and email subjects.
- Existing Floot sign-in and account-registration links.
- Proposed course outlines with unconfirmed fees and schedules.
- Corrected staff profile and training-page HTML.

## Registration behaviour

Quick registration prepares a WhatsApp message.

The visitor must open WhatsApp, review the message, and press Send.
The website does not store the application or confirm a student place.

## Contact details

Edit assets/js/config.js to update contact details and portal URLs.

The existing call number is 833696147. Verify this before publishing.
The WhatsApp number is +220 3696147.
The email is getpc24@gmail.com.

The home-page contact bar also contains the WhatsApp number and email
directly in index.html. Update those links when contact details change.

## Course information

Confirm the actual fees, duration, dates, timetable, requirements,
and syllabuses before publishing them as final.

Edit training.html to update course information.
Update the FAQ answers in assets/js/main.js when details change.

## Central storage and automatic emails

No central registration storage or email service is connected.

To show an external application form, set registrationFormUrl in
assets/js/config.js to the actual HTTPS form URL.

Configure storage, exports, and automatic acknowledgements through
that form provider. Verify a test submission before promoting it.

Never place private API keys or passwords in this public repository.

## File locations

- index.html: Home page.
- register.html: Registration options and WhatsApp form.
- training.html: Course information.
- staff.html: Staff profile.
- assets/css/styles.css: Website design.
- assets/js/config.js: Contact details and portal/form URLs.
- assets/js/main.js: Navigation, contact links, registration, and FAQs.