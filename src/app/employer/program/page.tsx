"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route — redirects to /employer/programs (plural).
 */
export default function ProgramRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/employer/programs");
  }, [router]);

  return null;
}
