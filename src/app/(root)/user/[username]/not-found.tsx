import { Button } from "@/components/ui/button";
import { House } from "lucide-react";
import Link from "next/link";

// This is the 404 page for when a user is not found
export default function NotFound() {
  return (
    <div className="flex size-full min-h-screen grow flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-6 rounded-md border p-12 shadow-lg">
        <h1 className="scroll-m-20 text-5xl font-semibold tracking-tight">
          User Not Found
        </h1>

        <Link href="/">
          <Button>
            <House /> Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
