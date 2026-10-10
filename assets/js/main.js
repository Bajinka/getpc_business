(function () {
  "use strict";

  var config = window.GETPC_CONFIG || {};
  var contact = config.contact || {};

  function setExternalLinks(selector, value) {
    if (!value) return;
    try {
      var parsed = new URL(value);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
      document.querySelectorAll(selector).forEach(function (link) {
        link.href = parsed.href;
      });
    } catch (error) {
      console.warn("A configured external URL is invalid:", selector);
    }
  }

  setExternalLinks("[data-portal-login]", config.portalLoginUrl);
  setExternalLinks("[data-portal-register]", config.portalRegistrationUrl);

  var registrationFormLink = document.querySelector("[data-registration-form-link]");
  var externalRegistration = document.getElementById("external-registration");
  if (registrationFormLink && externalRegistration && config.registrationFormUrl) {
    try {
      var registrationUrl = new URL(config.registrationFormUrl);
      if (registrationUrl.protocol === "https:" || registrationUrl.protocol === "http:") {
        registrationFormLink.href = registrationUrl.href;
        externalRegistration.hidden = false;
      } else {
        console.warn("The configured registration form URL must use HTTPS or HTTP.");
      }
    } catch (error) {
      console.warn("The configured registration form URL is invalid.");
    }
  }

  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.getElementById("main-navigation");
  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      var isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
      menuButton.textContent = isOpen ? "Menu" : "Close";
      navigation.classList.toggle("is-open", !isOpen);
    });
    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a") && window.matchMedia("(max-width: 700px)").matches) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
        menuButton.textContent = "Menu";
        navigation.classList.remove("is-open");
      }
    });
  }

  var serviceNotice = document.getElementById("selected-service");
  if (serviceNotice) {
    var selectedService = new URLSearchParams(window.location.search).get("service");
    if (selectedService) {
      serviceNotice.textContent = "Service of interest: " + selectedService;
      serviceNotice.hidden = false;
    }
  }

  var contactLinks = document.getElementById("contact-links");
  if (contactLinks) {
    var addressElement = document.getElementById("contact-address");
    var contactNote = document.getElementById("contact-note");
    var address = typeof contact.address === "string" ? contact.address.trim() : "";
    if (address && addressElement) {
      addressElement.textContent = address;
      addressElement.hidden = false;
      if (contactNote) contactNote.hidden = true;
    }

    var serviceForEmail = new URLSearchParams(window.location.search).get("service") || "";
    var email = typeof contact.email === "string" ? contact.email.trim() : "";
    var phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
    var whatsapp = typeof contact.whatsapp === "string" ? contact.whatsapp.trim() : "";
    var methods = [
      {
        label: email,
        prefix: "Email",
        href: email ? "mailto:" + email + "?subject=" + encodeURIComponent(serviceForEmail ? "GET-PC service inquiry: " + serviceForEmail : "GET-PC inquiry") : ""
      },
      {
        label: phone,
        prefix: "Call",
        href: phone ? "tel:" + phone.replace(/[^\d+]/g, "") : ""
      },
      {
        label: whatsapp,
        prefix: "WhatsApp",
        href: whatsapp ? "https://wa.me/" + whatsapp.replace(/\D/g, "") : ""
      }
    ];

    methods.forEach(function (method) {
      if (!method.label || !method.href) return;
      var link = document.createElement("a");
      var icon = document.createElement("span");
      icon.className = "contact-link-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = method.prefix.slice(0, 1);
      link.appendChild(icon);
      link.appendChild(document.createTextNode(method.prefix + ": " + method.label));
      link.href = method.href;
      if (method.prefix === "WhatsApp") {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      contactLinks.appendChild(link);
    });
  }

  var helpPanel = document.createElement("section");
  helpPanel.className = "quick-help-panel";
  helpPanel.hidden = true;
  helpPanel.setAttribute("aria-label", "Quick Help FAQs");
  helpPanel.innerHTML =
    '<div class="quick-help-header"><div><strong>Quick Help</strong><span>Frequently asked questions</span></div><button class="quick-help-close" type="button" aria-label="Close Quick Help">×</button></div>' +
    '<div class="quick-help-body"><p>Choose a topic to see a short answer from GET-PC information.</p>' +
    '<div class="quick-help-questions">' +
    '<button type="button" data-answer="services">What services does GET-PC offer?</button>' +
    '<button type="button" data-answer="training">What training levels are available?</button>' +
    '<button type="button" data-answer="register">How do I register for training?</button>' +
    '<button type="button" data-answer="location">Where is GET-PC located?</button>' +
    '</div><p class="quick-help-answer" aria-live="polite">Select a question above.</p>' +
    '<p class="quick-help-fallback">Need more help? <a href="contact.html">Contact GET-PC</a>.</p></div>';
  document.body.appendChild(helpPanel);

  var helpLauncher = document.createElement("button");
  helpLauncher.className = "quick-help-launcher";
  helpLauncher.type = "button";
  helpLauncher.setAttribute("aria-expanded", "false");
  helpLauncher.setAttribute("aria-controls", "quick-help-panel");
  helpLauncher.textContent = "Quick Help";
  helpPanel.id = "quick-help-panel";
  document.body.appendChild(helpLauncher);

  function toggleHelp(open) {
    helpPanel.hidden = !open;
    helpLauncher.setAttribute("aria-expanded", String(open));
    if (open) helpPanel.querySelector(".quick-help-close").focus();
    else helpLauncher.focus();
  }

  helpLauncher.addEventListener("click", function () {
    toggleHelp(helpPanel.hidden);
  });
  helpPanel.querySelector(".quick-help-close").addEventListener("click", function () {
    toggleHelp(false);
  });
  helpPanel.addEventListener("click", function (event) {
    var button = event.target.closest("[data-answer]");
    if (!button) return;
    var answers = {
      services: "GET-PC provides computer repair and maintenance, graphic design, website and database development, computer training, data entry, CV and document preparation, printing, and school IT support.",
      training: "There are three independent levels: Computer Fundamentals, Word, Excel, and PowerPoint; Graphic Design; and Web Development. You may choose one level on its own. Fees, dates, schedules, duration, and places are not confirmed.",
      register: "Account creation and course registration are handled through the existing Floot portal. This static website does not create accounts or accept applications.",
      location: "GET-PC Technical Solution is based in Brikama, The Gambia. Use the Contact page for configured phone, WhatsApp, and email details."
    };
    helpPanel.querySelector(".quick-help-answer").textContent = answers[button.dataset.answer];
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !helpPanel.hidden) toggleHelp(false);
  });
}());
