import Link from "next/link";

type CompanyLogoProps = {
  variant?: "light" | "dark";
  href?: string;
  className?: string;
};

export function CompanyLogo({ variant = "dark", href = "/", className = "" }: CompanyLogoProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const image = "logo-navy-420.png";
  return (
    <Link className={`company-logo company-logo-${variant} ${className}`.trim()} href={href} aria-label="Viagem Perfeita Turismo e Eventos — início">
      <img src={`${basePath}/brand/official/${image}`} width="420" height="213" alt="" aria-hidden="true" decoding="async" />
    </Link>
  );
}
