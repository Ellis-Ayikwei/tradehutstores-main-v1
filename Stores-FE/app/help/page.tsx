import type { Metadata } from "next";
import MainLayout from "@/components/Layouts/MainLayout";
import HelpCenter from "./HelpCenter";

export const metadata: Metadata = {
  title: "Help Centre | TradeHut Stores",
  description:
    "Answers about orders, payments, returns, accounts, selling, auctions and RFQs, plus how to contact TradeHut.",
};

export default function HelpPage() {
  return (
    <MainLayout>
      <HelpCenter />
    </MainLayout>
  );
}
