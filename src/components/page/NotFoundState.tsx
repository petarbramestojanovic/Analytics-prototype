import { Link } from 'react-router-dom';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/feedback';
import { Page } from './Page';

/** A detail page whose record doesn't exist (or isn't visible to this seat),
 *  with a way back to the list it came from. */
export function NotFoundState({
  title,
  body,
  backTo,
  backLabel,
}: {
  title: string;
  body: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <Page>
      <EmptyState
        icon={<TriangleAlert size={32} />}
        title={title}
        body={body}
        action={
          <Link to={backTo}>
            <Button variant="primary" icon={<ArrowLeft size={14} />}>
              {backLabel}
            </Button>
          </Link>
        }
      />
    </Page>
  );
}
