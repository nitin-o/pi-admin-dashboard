const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginError.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "SIGNING IN...";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Login failed.");
        }

        window.location.replace("/");
    } catch (error) {
        loginError.textContent = error.message || "Unable to connect to server.";
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "SIGN IN";
    }
});
