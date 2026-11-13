import {
    getToken,
    getCurrentUser,
    login
} from "./api.js";

import { renderLogin } from "./auth.js";
import { startDashboard } from "./dashboard.js";

const app = document.getElementById("app");

async function initializeApp() {
    if (!getToken()) {
        showLogin();
        return;
    }

    try {
        await getCurrentUser();
        await startDashboard(app);
    } catch {
        showLogin();
    }
}

function showLogin() {
    renderLogin(app, async (username, password) => {
        await login(username, password);
        await startDashboard(app);
    });
}

initializeApp();
