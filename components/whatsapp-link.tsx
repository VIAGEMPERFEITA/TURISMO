"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { TripContactContext, WhatsAppLead } from "../lib/company-contact";
import { useWhatsAppContact } from "./whatsapp-contact-provider";

type WhatsAppLinkProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & TripContactContext & {
  children: ReactNode;
  buttonText?: string;
  initialInterest?: string;
  initialLead?: WhatsAppLead;
};

export function WhatsAppLink({ children, tripName, destination, period, duration, status, buttonText, initialInterest, initialLead, className, onClick, ...props }: WhatsAppLinkProps) {
  const { openContact } = useWhatsAppContact();
  const label = buttonText ?? (typeof children === "string" ? children : "WhatsApp");

  return (
    <button
      {...props}
      type="button"
      className={`whatsapp-trigger${className ? ` ${className}` : ""}`}
      onClick={(event) => { onClick?.(event); openContact({ buttonText: label, tripName, destination, period, duration, status, initialInterest, initialLead }); }}
    >
      {children}
    </button>
  );
}
