"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* Combo kbd family: multi-key combinations. Every variant carries real <kbd> caps inside a root <kbd>; for accessibility the root holds the sr-only full text ("Ctrl plus K") and the visual cap stack is aria-hidden, so a screen reader hears one readable name. Colour comes ONLY from tokens. Static - no motion. */

export type StyledSize = "sm" | "md" | "lg" | "xl";

const box: Record<StyledSize, string> = {
	sm: "h-5 px-1.5 text-xs",
	md: "h-6 px-2 text-xs",
	lg: "h-7 px-2.5 text-sm",
	xl: "h-8 px-3 text-sm",
};

const gap: Record<StyledSize, string> = {
	sm: "gap-1",
	md: "gap-1",
	lg: "gap-1.5",
	xl: "gap-1.5",
};

const conn: Record<StyledSize, string> = {
	sm: "text-[10px]",
	md: "text-xs",
	lg: "text-xs",
	xl: "text-sm",
};

const rootBase =
	"inline-flex w-fit shrink-0 select-none items-center whitespace-nowrap font-mono font-medium leading-none text-foreground";

const capBase =
	"inline-flex shrink-0 select-none items-center justify-center gap-1 whitespace-nowrap rounded-md border border-border bg-surface-2 font-mono font-medium leading-none text-foreground [&_svg]:size-3 [&_svg]:shrink-0 [&_i]:text-xs [&_i]:leading-none";

type Props = React.ComponentProps<"kbd"> & {
	size?: StyledSize;
	/** Cap texts; the variant default is used when none are given. */
	keys?: string[];
};

/* Tek kapak. */
function Cap({
	size,
	children,
}: {
	size: StyledSize;
	children: React.ReactNode;
}) {
	return <kbd className={cn(capBase, box[size])}>{children}</kbd>;
}

/* The full combination text for screen readers ("Ctrl plus K" / "G then P"). */
function label(keys: string[], word: string) {
	return keys.join(` ${word} `);
}

/* Combo: sade yan yana kapaklar, baglayici yok. */
export function ComboKbd({
	className,
	size = "md",
	keys,
	children,
	...props
}: Props) {
	const list = keys ?? ["Ctrl", "K"];
	return (
		<kbd
			data-slot="styled-kbd"
			className={cn(rootBase, gap[size], className)}
			{...props}
		>
			{children ?? (
				<>
					<span className="sr-only">{label(list, "plus")}</span>
					<span
						aria-hidden="true"
						className={cn("inline-flex items-center", gap[size])}
					>
						{list.map((k, i) => (
							<Cap key={`${k}-${i}`} size={size}>
								{k}
							</Cap>
						))}
					</span>
				</>
			)}
		</kbd>
	);
}

/* Chain: segments joined inside a single shell, divided by separator lines. */
export function ChainKbd({
	className,
	size = "md",
	keys,
	children,
	...props
}: Props) {
	const list = keys ?? ["Ctrl", "Shift", "P"];
	return (
		<kbd
			data-slot="styled-kbd"
			className={cn(
				rootBase,
				"overflow-hidden rounded-md border border-border bg-surface-2",
				className,
			)}
			{...props}
		>
			{children ?? (
				<>
					<span className="sr-only">{label(list, "plus")}</span>
					<span
						aria-hidden="true"
						className="inline-flex items-center divide-x divide-border"
					>
						{list.map((k, i) => (
							<kbd
								key={`${k}-${i}`}
								className={cn(
									"inline-flex shrink-0 items-center justify-center whitespace-nowrap font-mono font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0 [&_i]:text-xs [&_i]:leading-none",
									box[size],
								)}
							>
								{k}
							</kbd>
						))}
					</span>
				</>
			)}
		</kbd>
	);
}

/* Plus: kapaklar arasinda gorunur bir "+" baglayici. */
export function PlusKbd({
	className,
	size = "md",
	keys,
	children,
	...props
}: Props) {
	const list = keys ?? ["Cmd", "S"];
	return (
		<kbd
			data-slot="styled-kbd"
			className={cn(rootBase, gap[size], className)}
			{...props}
		>
			{children ?? (
				<>
					<span className="sr-only">{label(list, "plus")}</span>
					<span
						aria-hidden="true"
						className={cn("inline-flex items-center", gap[size])}
					>
						{list.map((k, i) => (
							<React.Fragment key={`${k}-${i}`}>
								{i > 0 ? (
									<span className={cn("text-muted-foreground", conn[size])}>
										+
									</span>
								) : null}
								<Cap size={size}>{k}</Cap>
							</React.Fragment>
						))}
					</span>
				</>
			)}
		</kbd>
	);
}

/* Sequence: once X sonra Y - kapaklar arasinda "then" baglayicisi. */
export function SequenceKbd({
	className,
	size = "md",
	keys,
	children,
	...props
}: Props) {
	const list = keys ?? ["G", "P"];
	return (
		<kbd
			data-slot="styled-kbd"
			className={cn(rootBase, gap[size], className)}
			{...props}
		>
			{children ?? (
				<>
					<span className="sr-only">{label(list, "then")}</span>
					<span
						aria-hidden="true"
						className={cn("inline-flex items-center", gap[size])}
					>
						{list.map((k, i) => (
							<React.Fragment key={`${k}-${i}`}>
								{i > 0 ? (
									<span
										className={cn(
											"font-sans lowercase text-muted-foreground",
											conn[size],
										)}
									>
										then
									</span>
								) : null}
								<Cap size={size}>{k}</Cap>
							</React.Fragment>
						))}
					</span>
				</>
			)}
		</kbd>
	);
}

/* Group: kapaklar tek bir cerceveli kap icinde toplanir. */
export function GroupKbd({
	className,
	size = "md",
	keys,
	children,
	...props
}: Props) {
	const list = keys ?? ["Alt", "Enter"];
	return (
		<kbd
			data-slot="styled-kbd"
			className={cn(
				rootBase,
				"rounded-lg border border-border bg-[color-mix(in_oklab,var(--color-foreground)_4%,transparent)] p-1",
				gap[size],
				className,
			)}
			{...props}
		>
			{children ?? (
				<>
					<span className="sr-only">{label(list, "plus")}</span>
					<span
						aria-hidden="true"
						className={cn("inline-flex items-center", gap[size])}
					>
						{list.map((k, i) => (
							<Cap key={`${k}-${i}`} size={size}>
								{k}
							</Cap>
						))}
					</span>
				</>
			)}
		</kbd>
	);
}

export default ComboKbd;
