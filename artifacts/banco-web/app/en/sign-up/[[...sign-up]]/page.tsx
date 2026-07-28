"use client";

import { SignUp } from "@clerk/nextjs";

export default function EnSignUpPage() {
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
      <SignUp routing="path" path="/en/sign-up" signInUrl="/en/sign-in" />
    </main>
  );
}
