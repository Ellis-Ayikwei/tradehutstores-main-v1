"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What happens if the item is counterfeit?",
    answer:
      "Our Authenticity Guarantee ensures that if an item is proven to be counterfeit by our verification panel, you receive a 100% refund immediately, and the seller is permanently flagged or removed from the platform.",
  },
  {
    question: "How long does the escrow period last?",
    answer:
      "The standard escrow period is 5 business days from delivery confirmation. For high-value items above $10,000, the inspection window extends to 10 business days to allow thorough verification of technical specifications.",
  },
  {
    question: "Are my funds insured while in escrow?",
    answer:
      "Yes. All funds held in escrow are insured against institutional failure, fraud, and operational errors. Our escrow accounts are held with licensed financial institutions and are fully segregated from TradeHut operating funds.",
  },
  {
    question: "Who covers the shipping costs during a dispute?",
    answer:
      "If a dispute is found in the buyer's favor, all return shipping costs are covered by TradeHut. If the dispute is found in the seller's favor, standard return shipping rates apply. In ambiguous cases, costs are split 50/50 pending arbitration.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="bg-surface-container-low rounded-xl overflow-hidden shadow-card transition-all duration-200"
          >
            <button
              type="button"
              className="w-full p-6 min-h-12 flex justify-between items-center text-left cursor-pointer hover:bg-surface-container transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
            >
              <h5 className="font-syne font-bold text-on-surface pr-4">
                {item.question}
              </h5>
              <Plus
                className="text-on-surface-variant flex-shrink-0 w-5 h-5 transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="px-6 pb-6 text-on-surface-variant text-sm leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
