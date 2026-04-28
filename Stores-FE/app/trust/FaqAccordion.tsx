"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does TradeHut protect my funds during a transaction?",
    answer:
      "All funds are held in segregated, bankruptcy-remote escrow accounts with our Tier-1 banking partners. Funds are only released upon verified delivery conditions — including Bill of Lading confirmation and IoT-stamped delivery records. No manual intervention is required.",
  },
  {
    question: "What encryption standard is used for my trade data?",
    answer:
      "TradeHut uses AES-256 encryption for all data at rest and in transit. Our zero-knowledge architecture ensures that even our own infrastructure cannot access your sensitive commercial terms — only authorised counterparties hold the decryption keys.",
  },
  {
    question: "How are sellers verified before listing on the platform?",
    answer:
      "Every seller undergoes a 14-point KYC/KYB Elite check, including UBO identification, international sanctions screening, credit line analysis, and an optional on-site facility audit through our global network of 3,000+ certified inspectors.",
  },
  {
    question: "What certifications does TradeHut hold?",
    answer:
      "TradeHut is SOC 2 Type II certified, ISO 27001 certified, and fully GDPR compliant. Our compliance posture is independently audited on a continuous basis.",
  },
  {
    question: "How do I report suspected fraud or a suspicious listing?",
    answer:
      "Visit the Report Fraud page in your account dashboard. Our fraud prevention team triages every report within 48 hours. For urgent matters, the report form is also accessible directly at /account/reports.",
  },
  {
    question: "What happens if a transaction is disputed?",
    answer:
      "Contested funds are automatically moved into a separate high-security sub-escrow account. A human expert from your specific industry sector (Oil, Steel, AgTech, etc.) reviews the claim and issues a binding resolution — typically within 5 business days.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-outline-variant/20">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="py-5">
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left min-h-12 group active:scale-[0.99] transition-transform"
            >
              <span className="font-headline font-bold text-base md:text-lg text-on-surface group-hover:text-primary transition-colors">
                {item.question}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {isOpen && (
              <p className="mt-4 text-sm text-on-surface-variant leading-relaxed pr-8">
                {item.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
