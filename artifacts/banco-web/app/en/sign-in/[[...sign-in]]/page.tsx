"use client";

import { SignIn } from "@clerk/nextjs";

export default function EnSignInPage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "2.5rem auto",
        padding: "0 1.25rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <SignIn routing="path" path="/en/sign-in" signUpUrl="/en/sign-up" />
    </main>
  );
}
