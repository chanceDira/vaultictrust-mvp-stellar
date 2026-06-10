import { PageStatus } from "~~/components/ui/PageStatus";

export default function NotFound() {
  return (
    <PageStatus
      code="404"
      variant="404"
      title="Page not found"
      description="This page does not exist or may have moved. Check the URL or head back to the marketplace."
    />
  );
}
