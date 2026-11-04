import { Link } from "react-router";

interface AuthTextLinkProps {
  to: string;
  children: string;
}

/** A centered text link under a signed-out screen's main content. */
export function AuthTextLink({ to, children }: AuthTextLinkProps) {
  return (
    <Link
      to={to}
      className="self-center rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {children}
    </Link>
  );
}
