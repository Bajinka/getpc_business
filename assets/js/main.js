(function () {
  "use strict";

  var config = window.GETPC_CONFIG || {};
  var contact = config.contact || {};

  function setExternalLinks(selector, value) {
    if (!value) return;

    try {
      var parsed = new URL(value);

      if (
        parsed.protocol !== "https:" &&
        parsed.protocol !== "http:"
      ) {
        return;
      }

      document.querySelectorAll(selector).forEach(function (link) {
        link.href = parsed.href;
      });
    } catch (error) {
      console.warn("A configured external URL is invalid:", selector);
    }
  }

  setExternalLinks("[data-portal-login]", config.portalLoginUrl);
  setExternalLinks("[data-portal-register]", config.portalRegistrationUrl);

  // Optional external registration form.
  var registrationFormLink = document.querySelector(
    "[data-registration-form-link]"
  );
  var externalRegistration = document.getElementById(
    "external-registration"
  );

  if (
    registrationFormLink &&
    externalRegistration &&
    config.registrationFormUrl
  ) {
    try {
      var registrationUrl = new URL(config.registrationFormUrl);

      if (
        registrationUrl.protocol === "https:" ||
        registrationUrl.protocol === "http:"
      ) {
        registrationFormLink.href = registrationUrl.href;
        externalRegistration.hidden = false;
      } else {
        console.warn(
          "The configured registration form URL must use HTTPS or HTTP."
        );
      }
    } catch (error) {
      console.warn("The configured registration form URL is invalid.");
    }
  }

  // Mobile navigation.
  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.getElementById("main-navigation");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      var isOpen = menuButton.getAttribute("aria-expanded") === "true";

      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Open navigation" : "Close navigation"
      );
      menuButton.textContent = isOpen ? "Menu" : "Close";
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", function (event) {
      if (
        event.target.closest("a") &&
        window.matchMedia("(max-width: 700px)").matches
      ) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
        menuButton.textContent = "Menu";
        navigation.classList.remove("is-open");
      }
    });
  }

  // Show the selected service on the Contact page.
  var serviceNotice = document.getElementById("selected-service");

  if (serviceNotice) {
    var selectedService = new URLSearchParams(
      window.location.search
    ).get("service");

    if (selectedService) {
      serviceNotice.textContent = "Service of interest: " + selectedService;
      serviceNotice.hidden = false;
    }
  }

  // Contact links.
  var contactLinks = document.getElementById("contact-links");

  if (contactLinks) {
    var addressElement = document.getElementById("contact-address");
    var contactNote = document.getElementById("contact-note");

    var address =
      typeof contact.address === "string" ? contact.address.trim() : "";

    if (address && addressElement) {
      addressElement.textContent = address;
      addressElement.hidden = false;

      if (contactNote) {
        contactNote.hidden = true;
      }
    }

    var serviceForEmail =
      new URLSearchParams(window.location.search).get("service") || "";

    var email =
      typeof contact.email === "string" ? contact.email.trim() : "";

    var phone =
      typeof contact.phone === "string" ? contact.phone.trim() : "";

    var whatsapp =
      typeof contact.whatsapp === "string" ? contact.whatsapp.trim() : "";

    var methods = [
      {
        label: email,
        prefix: "Email",
        href: email
          ? "mailto:" +
            email +
            "?subject=" +
            encodeURIComponent(
              serviceForEmail
                ? "GET-PC service inquiry: " + serviceForEmail
                : "GET-PC inquiry"
            )
          : ""
      },
      {
        label: phone,
        prefix: "Call",
        href: phone
          ? "tel:" + phone.replace(/[^\d+]/g, "")
          : ""
      },
      {
        label: whatsapp,
        prefix: "WhatsApp",
        href: whatsapp
          ? "https://wa.me/" +
            whatsapp.replace(/\D/g, "") +
            "?text=" +
            encodeURIComponent(
              serviceForEmail
                ? "Hello GET-PC, I would like to enquire about " +
                  serviceForEmail +
                  "."
                : "Hello GET-PC, I would like more information about your services."
            )
          : ""
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
      link.appendChild(
        document.createTextNode(method.prefix + ": " + method.label)
      );
      link.href = method.href;

      if (method.prefix === "WhatsApp") {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      contactLinks.appendChild(link);
    });
  }

  // Quick registration through WhatsApp.
  var quickForm = document.getElementById("quick-registration");

  if (quickForm) {
    var courseField = document.getElementById("course");
    var chosenCourse = new URLSearchParams(
      window.location.search
    ).get("course");

    if (
      ["level-1", "level-2", "level-3"].indexOf(chosenCourse) !== -1
    ) {
      courseField.value = chosenCourse;
    }

    var sendLink = document.getElementById("registration-send");
    var status = document.getElementById("registration-status");

    quickForm.addEventListener("input", function () {
      sendLink.hidden = true;
      sendLink.removeAttribute("href");
      status.textContent = "";
    });

    quickForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!quickForm.reportValidity()) return;

      var data = new FormData(quickForm);
      var name = String(data.get("fullName")).trim();
      var phone = String(data.get("phone")).trim();

      if (!name || phone.replace(/\D/g, "").length < 7) {
        status.textContent =
          "Please enter your name and a valid phone number.";
        return;
      }

      var target = String(contact.whatsapp || "").replace(/\D/g, "");

      if (!target) {
        status.textContent =
          "WhatsApp is unavailable. Please use our contact page.";
        return;
      }

      var message =
        "Hello GET-PC, I would like to register my interest in training." +
        "\nName: " +
        name +
        "\nPhone: " +
        phone +
        "\nEmail: " +
        (String(data.get("email")).trim() || "Not provided") +
        "\nCourse: " +
        courseField.options[courseField.selectedIndex].text +
        "\nPreferred session: " +
        data.get("session") +
        "\nPlease confirm the fees, timetable and availability.";

      sendLink.href =
        "https://wa.me/" + target + "?text=" + encodeURIComponent(message);

      sendLink.hidden = false;

      status.textContent =
        "Your message is ready, but has not been sent. " +
        "Open WhatsApp below, review it and press Send.";

      sendLink.focus();
    });
  }

  // Quick Help FAQ widget.
  var helpPanel = document.createElement("section");
  helpPanel.className = "quick-help-panel";
  helpPanel.hidden = true;
  helpPanel.setAttribute("aria-label", "Quick Help FAQs");

  helpPanel.innerHTML =
    '<div class="quick-help-header">' +
      '<div>' +
        '<strong>Quick Help</strong>' +
        '<span>Frequently asked questions</span>' +
      '</div>' +
      '<button class="quick-help-close" type="button" ' +
        'aria-label="Close Quick Help">×</button>' +
    '</div>' +
    '<div class="quick-help-body">' +
      '<p>Choose a topic to see a short answer from GET-PC information.</p>' +
      '<div class="quick-help-questions">' +
        '<button type="button" data-answer="services">' +
          'What services does GET-PC offer?' +
        '</button>' +
        '<button type="button" data-answer="training">' +
          'What training levels are available?' +
        '</button>' +
        '<button type="button" data-answer="register">' +
          'How do I register for training?' +
        '</button>' +
        '<button type="button" data-answer="location">' +
          'Where is GET-PC located?' +
        '</button>' +
      '</div>' +
      '<p class="quick-help-answer" aria-live="polite">' +
        'Select a question above.' +
      '</p>' +
      '<p class="quick-help-fallback">' +
        'Need more help? <a href="contact.html">Contact GET-PC</a>.' +
      '</p>' +
    '</div>';

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

    if (open) {
      helpPanel.querySelector(".quick-help-close").focus();
    } else {
      helpLauncher.focus();
    }
  }

  helpLauncher.addEventListener("click", function () {
    toggleHelp(helpPanel.hidden);
  });

  helpPanel.querySelector(".quick-help-close").addEventListener(
    "click",
    function () {
      toggleHelp(false);
    }
  );

  helpPanel.addEventListener("click", function (event) {
    var button = event.target.closest("[data-answer]");

    if (!button) return;

    var answers = {
      services:
        "GET-PC provides computer repair and maintenance, graphic design, " +
        "website and database development, computer training, data entry, " +
        "CV and document preparation, printing, and school IT support.",

      training:
        "There are three independent levels: Computer Fundamentals, Word, " +
        "Excel, and PowerPoint; Graphic Design; and Web Development. " +
        "You may choose one level on its own. Contact us for confirmed " +
        "fees, dates, duration, and available sessions.",

      register:
        "Choose Quick registration to send your course interest through " +
        "WhatsApp without an account, or create an account through our " +
        "training portal. GET-PC will confirm availability and fees.",

      location:
        "GET-PC Technical Solution is based in Brikama, The Gambia. " +
        "Use the Google Maps link on the Contact page for directions."
    };

    helpPanel.querySelector(".quick-help-answer").textContent =
      answers[button.dataset.answer];
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !helpPanel.hidden) {
      toggleHelp(false);
    }
  });
}());