import Link from "next/link";

type CompanyLogoProps = {
  variant?: "light" | "dark";
  href?: string;
  className?: string;
};

export function CompanyLogo({ variant = "dark", href = "/", className = "" }: CompanyLogoProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const image = "logo-navy-transparent.png";
  return (
    <Link className={`company-logo company-logo-${variant} ${className}`.trim()} href={href} aria-label="Viagem Perfeita Turismo e Eventos — início">
      <img src={`${basePath}/brand/official/${image}`} alt="" aria-hidden="true" decoding="async" />
    </Link>
  );
}
