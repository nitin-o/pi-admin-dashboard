import { hashPassword } from "../src/utils/auth.utils.js";

let input = "";

for await (const chunk of process.stdin) {
    input += chunk;
}

const password = input.replace(/[\r\n]+$/, "");

if (password.length < 8) {
    console.error("Password must be at least 14 characters.");
    process.exitCode = 1;
} else {
    console.log(await hashPassword(password));
}

input = "";

