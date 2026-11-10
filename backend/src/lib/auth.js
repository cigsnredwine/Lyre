import dotenv from "dotenv";
import { dash } from "@better-auth/infra";
import { MongoClient } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

dotenv.config();

const authBaseURL = process.env.BETTER_AUTH_URL || "http://localhost:5001";
const trustedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
async function retireUnverifiedPassword(userId, adapter) {
    const user = await adapter.findUserById(userId);
    if (!user || user.emailVerified) return;
    const accounts = await adapter.findAccounts(userId);
    for (const account of accounts) {
        if (account.providerId === "credential") await adapter.deleteAccount(account.id);
    }
    await adapter.deleteSessions(userId);
}

const socialProviders = clientId && clientSecret ? {
    google: {
        clientId,
        clientSecret,
        disableIdTokenSignIn: true,
        async mapProfileToUser(profile) {
            // Google is authoritative for Gmail and hosted Workspace addresses.
            const emailVerified = profile.email_verified === true &&
                (profile.email?.toLowerCase().endsWith("@gmail.com") || Boolean(profile.hd));
            if (emailVerified) {
                const { internalAdapter } = await auth.$context;
                const linked = await internalAdapter.findAccountByProviderId(profile.sub, "google");
                if (linked) await retireUnverifiedPassword(linked.userId, internalAdapter);
            }
            return { emailVerified: Boolean(emailVerified) };
        },
    },
} : {};
export const enabledSocialProviders = Object.keys(socialProviders);
if (enabledSocialProviders.length && !process.env.BETTER_AUTH_SECRET?.trim()) {
    throw new Error("Set BETTER_AUTH_SECRET before enabling Google sign-in.");
}

const mongoClient = new MongoClient(process.env.MONGODB_URI);
await mongoClient.connect();

export const auth = betterAuth({
	baseURL: authBaseURL,
	appName: "Lyre",
	secret: process.env.BETTER_AUTH_SECRET || "better-auth-dev-secret-change-me",
	trustedOrigins,
	database: mongodbAdapter(mongoClient.db()),
	emailAndPassword: {
		enabled: true,
	},
    socialProviders,
    account: {
        encryptOAuthTokens: true,
        accountLinking: { enabled: true },
    },
    databaseHooks: {
        account: {
            create: {
                async before(account, ctx) {
                    if (account.providerId !== "google" || !ctx) return;
                    await retireUnverifiedPassword(account.userId, ctx.context.internalAdapter);
                },
            },
        },
    },
	plugins: process.env.BETTER_AUTH_API_KEY ? [
    dash({ apiKey: process.env.BETTER_AUTH_API_KEY }),
  ] : [],
});
