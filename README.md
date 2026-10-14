# GET-PC static website

This folder is a standalone HTML, CSS, and vanilla JavaScript version of the GET-PC website. The published site does not use Next.js, React, Node.js, a database service, API routes, or a database. The original project has not been changed into this static site; this is a separate copy in `github-pages`.

## Preview with VS Code Live Server

1. Open the project folder in VS Code.
2. Install the **Live Server** extension if needed.
3. In Explorer, right-click `github-pages/index.html` and select **Open with Live Server**.
4. Navigate through the site links. The HTML pages are also directly accessible at `services.html`, `training.html`, `staff.html`, `about.html`, `contact.html`, and `register.html`.

The relative page and asset paths work when the folder is served at a repository subpath as well as at a custom domain.

## Configure contact and portal links

Edit `assets/js/config.js` to change the displayed business contact methods and portal links:

- `portalLoginUrl`: existing Floot sign-in page.
- `portalRegistrationUrl`: existing Floot account-registration page.
- `registrationFormUrl`: optional URL for an external application form. It is blank by default; no form provider is enabled.
- `contact.email`, `contact.phone`, and `contact.whatsapp`: optional contact methods. Their links appear only when configured.
- `contact.address`: optional future street address; no street address is currently published.

The included values are carried over from the existing public-site configuration. Email links open the visitor's email application and do not send a message automatically. The contact page has no browser-only submission form.

Training application links go to the existing Floot portal. This static website does not create Floot accounts, centrally store applications, send automatic emails, or provide secure administration. Do not add secrets or private credentials to this client-side configuration.

## Publish on GitHub Pages

The repository includes `.github/workflows/deploy-github-pages.yml`, which uploads **only this `github-pages` folder** as the Pages site artifact.

1. Push the project to GitHub.
2. In the repository, open **Settings â†’ Pages** and choose **GitHub Actions** as the build and deployment source.
3. Ensure Actions are allowed for the repository and push to the default branch (or run the workflow manually from the Actions tab). The workflow also runs for changes under `github-pages/**`.
4. Wait for the **Deploy static GET-PC site to GitHub Pages** workflow to finish, then open the Pages URL shown in the deployment job.
5. For a custom domain later, configure the domain in **Settings â†’ Pages** and apply the DNS records GitHub provides. The site uses relative links and assets and requires no path change.

The generated static site is compatible with both `https://USERNAME.github.io/REPOSITORY/` and a custom-domain root. Do not publish the source app, `.env` files, or the rest of the repository as the Pages artifact.

## Not included in this static version

- Local contact/application form submissions and centralized student records: require an approved backend or external form service.
- Automatic registration or contact emails: require a backend or external email service.
- Secure staff/admin accounts and dashboards: require server-side authentication and authorization.
- AI chat: this site only includes a small predefined FAQ/help widget with a contact fallback.

No fees, dates, schedules, duration, capacity, spaces, extra staff, qualifications, or testimonials have been added.
