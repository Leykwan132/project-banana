import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { deleteObject, generateDownloadUrl, generateUploadUrl } from "./s3";

// ============================================================
// BANK ACCOUNT QUERIES
// ============================================================

/**
 * Get all bank accounts for the current authenticated user
 */
export const getUserBankAccounts = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return [];

        return await ctx.db
            .query("bank_accounts")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .order("desc")
            .collect();
    },
});

/**
 * Get only verified (active) bank accounts for the current authenticated user
 */
export const getActiveBankAccounts = query({
    handler: async (ctx) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) return [];

        const allAccounts = await ctx.db
            .query("bank_accounts")
            .withIndex("by_user", (q) => q.eq("user_id", user.subject))
            .collect();

        return allAccounts.filter((account) => account.status === "verified");
    },
});

export const getBankAccount = query({
    args: {
        bankAccountId: v.id("bank_accounts"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return null;

        const account = await ctx.db.get(args.bankAccountId);
        if (!account) return null;
        if (account.user_id !== user.subject) return null;

        const legacyProofKey = (account as any).proof_document_url as string | undefined;
        return {
            ...account,
            proof_document_s3_key: account.proof_document_s3_key ?? legacyProofKey,
        };
    },
});

// ============================================================
// BANK ACCOUNT MUTATIONS
// ============================================================

/**
 * Create a new bank account for the current authenticated user
 */
export const createBankAccount = mutation({
    args: {
        bankName: v.string(),
        accountHolderName: v.string(),
        accountNumber: v.string(),
        proofDocumentKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        const now = Date.now();

        const bankAccountId = await ctx.db.insert("bank_accounts", {
            user_id: user.subject,
            bank_name: args.bankName,
            account_holder_name: args.accountHolderName,
            account_number: args.accountNumber,
            status: "pending_review",
            // Stores S3 object key
            proof_document_s3_key: args.proofDocumentKey,
            created_at: now,
            updated_at: now,
        });

        return bankAccountId;
    },
});

export const resubmitBankAccountProof = mutation({
    args: {
        bankAccountId: v.id("bank_accounts"),
        newProofKey: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) throw new Error("User not found");

        const account = await ctx.db.get(args.bankAccountId);
        if (!account) throw new Error("Bank account not found");
        if (account.user_id !== user.subject) throw new Error("Unauthorized");

        const previousProofKey = account.proof_document_s3_key;

        await ctx.db.patch(args.bankAccountId, {
            status: "pending_review",
            proof_document_s3_key: args.newProofKey,
            updated_at: Date.now(),
        });

        return previousProofKey ?? null;
    },
});

export const generateProofUploadUrl = action({
    args: {
        contentType: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }

        const extension =
            args.contentType === "application/pdf"
                ? "pdf"
                : args.contentType.includes("png")
                    ? "png"
                    : args.contentType.includes("webp")
                        ? "webp"
                        : "jpg";

        const s3Key = `bank-proofs/${identity.subject}/${crypto.randomUUID()}.${extension}`;
        const uploadUrl = await generateUploadUrl(s3Key, args.contentType);
        return { uploadUrl, s3Key };
    },
});

export const generateProofAccessUrl = action({
    args: {
        s3Key: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }
        // New keys are namespaced by user. Keep this protection for namespaced keys.
        // Legacy keys may not follow this format, so allow them for backward compatibility.
        if (
            args.s3Key.startsWith("bank-proofs/") &&
            !args.s3Key.startsWith(`bank-proofs/${identity.subject}/`)
        ) {
            throw new Error("Unauthorized proof access");
        }
        return await generateDownloadUrl(args.s3Key);
    },
});

export const deleteProofObject = action({
    args: {
        s3Key: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            throw new Error("Unauthenticated call to action");
        }
        if (!args.s3Key.startsWith(`bank-proofs/${identity.subject}/`)) {
            throw new Error("Unauthorized proof deletion");
        }

        await deleteObject(args.s3Key);
    },
});
