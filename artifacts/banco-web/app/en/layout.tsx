import type { Metadata } from "next";
import { DocumentLocaleSync } from "../../components/DocumentLocaleSync";

export const metadata: Metadata = {
  title: {
    default: "BANCO — Cars, Real Estate & Industrial",
    template: "%s | BANCO",
  },
};

export default function EnglishLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div lang="en" dir="ltr" data-banco-locale="en">
      <DocumentLocaleSync lang="en" dir="ltr" />
      {children}
    </div>
  );
}
