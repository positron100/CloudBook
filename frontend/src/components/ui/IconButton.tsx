import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Pressable } from "@/components/motion";
import { cn } from "@/utils/cn";
import { Icon, type IconName } from "./Icon";
import "./IconButton.css";

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"> {
  icon: IconName;
  /** Required — an icon-only control must name itself for assistive tech. */
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "solid" | "danger";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = "md", variant = "ghost", className, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      className={cn("icon-btn", `icon-btn--${variant}`, size === "sm" && "icon-btn--sm", className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 18 : 20} />
    </Pressable>
  );
});
