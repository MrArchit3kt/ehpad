import type { ReactNode } from "react";
import clsx from "clsx";

type NeonCardProps = {
  children: ReactNode;
  className?: string;
  soft?: boolean;
};

export function NeonCard({
  children,
  className,
  soft = false,
}: NeonCardProps) {
  return (
    <div className={clsx(soft ? "neon-card-soft" : "neon-card", className)}>
      {children}
    </div>
  );
}