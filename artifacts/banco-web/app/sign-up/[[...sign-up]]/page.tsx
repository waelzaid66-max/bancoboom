"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
