"use client";

import { useEffect } from "react";
import { takeFlash } from "@/lib/store";
import { Toast, useToast } from "./ui";

// Shows a message left by the page that sent you here ("Posted…").
export function Flash() {
  const [toast, showToast] = useToast();
  useEffect(() => {
    const message = takeFlash();
    if (message) showToast(message);
  }, [showToast]);
  return <Toast message={toast} />;
}
