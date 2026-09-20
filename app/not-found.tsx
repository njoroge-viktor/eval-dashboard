import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>Run not found</h1>
      <p className="lede">No evaluation run with that id exists in this suite.</p>
      <Link href="/">Back to all runs</Link>
    </>
  );
}
