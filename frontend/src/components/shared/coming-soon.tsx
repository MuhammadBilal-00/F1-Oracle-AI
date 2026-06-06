import { PageHeader } from "./page-header";
import { EmptyState } from "./states";
import { Hammer } from "lucide-react";

export function ComingSoon({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState icon={Hammer} title="Module in progress" description="This section is being built out in the next milestone." />
    </div>
  );
}
