import fs from "fs/promises";
import * as jwt from "jsonwebtoken";

// Usage: bun run scripts/generate-apple-secret.ts <path-to-p8-file> <team-id> <client-id> <key-id>

async function main() {
    const [p8Path, teamId, clientId, keyId] = process.argv.slice(2);

    if (!p8Path || !teamId || !clientId || !keyId) {
        console.error(
            "Usage: bun run generate-apple-secret.ts <path-to-p8-file> <team-id> <client-id> <key-id>"
        );
        process.exit(1);
    }

    try {
        const privateKey = await fs.readFile(p8Path, "utf-8");

        const now = Math.floor(Date.now() / 1000);
        // Apple allows up to 180 days (15552000 seconds)
        const expirationTime = now + 15552000;

        const payload = {
            iss: teamId,
            iat: now,
            exp: expirationTime,
            aud: "https://appleid.apple.com",
            sub: clientId,
        };

        const token = jwt.sign(payload, privateKey, {
            algorithm: "ES256",
            keyid: keyId,
        });

        console.log("=====================================");
        console.log("SUCCESS! Here is your client secret:");
        console.log("=====================================\n");
        console.log(token);
        console.log("\n=====================================");
        console.log("Expires in 180 days.");
    } catch (error) {
        console.error("Error generating secret:", error);
        process.exit(1);
    }
}

main();
