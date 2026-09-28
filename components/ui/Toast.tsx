"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, OctagonAlert } from "lucide-react";

export type ToastTone = "info" | "success" | "danger";

type ToastMessage = { id: number; text: string; tone: ToastTone };

const EVENT = "Horizons:toast";
let nextId = 1;

export function toast(text: string, tone: ToastTone = "info") {
  window.dispatchEvent(new CustomEvent<ToastMessage>(EVENT, { detail: { id: nextId++, text, tone } }));
}

const icons = { info: Info, success: CheckCircle2, danger: OctagonAlert } as const;

export function ToastHost() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const message = (event as CustomEvent<ToastMessage>).detail;
      setMessages((current) => [...current.slice(-2), message]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
      }, 4000);
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="ui-toast-region" aria-live="polite">
      {messages.map((message) => {
        const Icon = icons[message.tone];
        return (
          <p key={message.id} className={`ui-toast ui-toast-${message.tone}`} role="status">
            <Icon size={18} aria-hidden="true" /> {message.text}
          </p>
        );
      })}
    </div>
  );
}
