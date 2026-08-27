import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { invitations, workspaces } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";
import { sha256Hex } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { acceptInvite } from "./actions";

export const metadata = {
  title: "Accept invitation",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const user = await verifySession(); // redirects to /sign-in?next=/invite/<token>

  const hash = await sha256Hex(token);
  const [invite] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.workspaceRole,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
    })
    .from(invitations)
    .innerJoin(workspaces, eq(workspaces.id, invitations.workspaceId))
    .where(
      and(
        eq(invitations.tokenHash, hash),
        isNull(invitations.acceptedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 p-6 text-center">
          {!invite ? (
            <>
              <h1 className="text-lg font-semibold">Invitation not found</h1>
              <p className="text-sm text-[var(--text-tertiary)]">
                This link has expired or was already used.
              </p>
              <Button asChild variant="outline">
                <Link href="/app">Go to app</Link>
              </Button>
            </>
          ) : invite.email.toLowerCase() !== user.email.toLowerCase() ? (
            <>
              <h1 className="text-lg font-semibold">Wrong account</h1>
              <p className="text-sm text-[var(--text-tertiary)]">
                This invite is for <strong>{invite.email}</strong>, but
                you&apos;re signed in as {user.email}.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold">
                Join {invite.workspaceName}
              </h1>
              <p className="text-sm text-[var(--text-tertiary)]">
                You&apos;ve been invited as <strong>{invite.role}</strong>.
              </p>
              <form action={acceptInvite.bind(null, token)}>
                <Button type="submit" className="w-full">
                  Accept invitation
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
