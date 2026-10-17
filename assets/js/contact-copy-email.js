(() => {
  const button = document.getElementById("copy-contact-email");
  const status = document.getElementById("copy-contact-status");

  if (!button || !status) return;

  const email = button.dataset.copyContactEmail || "webmaster@jawed.co.in";

  button.addEventListener("click", async () => {
    status.textContent = "Copying email address…";

    try {
      if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(email);
      } else {
        // Legacy fallback for browsers without the Clipboard API.
        const field = document.createElement("textarea");
        field.value = email;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.left = "-9999px";
        field.style.top = "0";
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();

        if (!copied) throw new Error("Legacy copy command failed");
      }

      status.textContent = "Email address copied. Paste it into your email app to compose your message.";
    } catch {
      status.textContent = "Automatic copying was unavailable. Select and copy webmaster@jawed.co.in from the email link above, then compose your message manually.";
    }
  });
})();
