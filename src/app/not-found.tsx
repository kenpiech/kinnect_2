import { ButtonLink, PageHeader } from "@/components/ui";

// Our own "page not found", in the same paper and ink as everything else.
export default function NotFound() {
  return (
    <div className="grid gap-6">
      <PageHeader title="This page isn't here">It may have moved, or the link has a typo.</PageHeader>
      <ButtonLink href="/feed" className="justify-self-start">
        Go to your feed
      </ButtonLink>
    </div>
  );
}
