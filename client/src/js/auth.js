export function renderLogin(app, onLogin) {
    app.innerHTML = `
        <main class="login-screen">
            <form class="login-card" id="login-form">
                <div class="brand">LOG VIEWER · SENTINEL</div>
                <h1>Welcome back</h1>
                <p class="muted">Sign in to access your monitoring console.</p>

                <div class="field">
                    <label for="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Enter admin username"
                        autocomplete="username"
                        maxlength="100"
                        required
                    >
                </div>

                <div class="field">
                    <label for="password">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        autocomplete="current-password"
                        required
                    >
                </div>

                <p class="error-message" id="login-error" role="alert"></p>

                <button class="primary-button" id="login-button" type="submit">
                    Sign In
                </button>

                <p class="muted" style="font-size:12px;text-align:center;margin-top:24px">
                    Authorized administrators only
                </p>
            </form>
        </main>
    `;

    const form = document.getElementById("login-form");
    const button = document.getElementById("login-button");
    const error = document.getElementById("login-error");

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const username = form.elements.username.value.trim();
        const password = form.elements.password.value;

        if (!username || !password) {
            error.textContent = "Username and password are required.";
            return;
        }

        button.disabled = true;
        button.textContent = "Signing in...";
        error.textContent = "";

        try {
            await onLogin(username, password);
        } catch (err) {
            error.textContent = err.message || "Login failed.";
            button.disabled = false;
            button.textContent = "Sign In";
        }
    });
}
