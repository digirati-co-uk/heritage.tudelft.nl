import React, { ComponentProps, useState } from "react";

interface CopyToClipboardProps extends Omit<ComponentProps<"a">, "href"> {
  href: string;
  copiedText: string;
}

export function CopyToClipboard({ href, onClick, children, copiedText, ...props }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // if modifier keys are pressed, let the browser handle the click.
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }

    e.preventDefault();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore.
    }
  };

  return (
    <a href={href} data-copied={copied} onClick={handleClick} {...props}>
      {copied ? <span>{copiedText}</span> : children}
    </a>
  );
}
