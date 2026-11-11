import "./style.css";

const app = document.querySelector("#app");

async function initialize() {
    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) {
            window.location.replace("/login");
            return;
        }

        const user = await response.json();

        app.innerHTML = `
            <header class="topbar">
                <div class="brand">
                    <span class="brand-logo">π</span>
                    <span class="brand-name">PI ADMIN</span>
                </div>
                <button id="logoutButton" type="button">LOGOUT</button>
            </header>
        `;

        document.querySelector("#logoutButton").addEventListener("click", logout);
    } catch (error) {
        app.textContent = "Unable to connect to PI ADMIN server.";
        console.error("Initialization error:", error);
    }
}

async function logout() {
    const button = document.querySelector("#logoutButton");
    button.disabled = true;
    button.textContent = "SIGNING OUT...";

    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Logout failed.");
        }

        window.location.replace("/login");
    } catch (error) {
        button.disabled = false;
        button.textContent = "LOGOUT";
        console.error(error);
        alert("Unable to logout. Please try again.");
    }
}

initialize();
