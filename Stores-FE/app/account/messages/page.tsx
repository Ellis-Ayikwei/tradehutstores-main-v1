"use client";

/**
 * Messaging Center — account section
 * Route: /account/messages
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_messaging_center/code.html
 *
 * Layout (lg+): account sidebar | conversation list | thread panel (three columns)
 * Layout (md):  account sidebar hidden → conversation list | thread panel
 * Layout (< md): conversation list only; thread opens as full-screen overlay
 *
 * // TODO: extract account sidebar to shared <AccountSidebar>
 * // TODO: fetch from /api/messages/threads/
 * // TODO: websocket /ws/messages/{threadId}
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import {
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  Phone,
  Video,
  User,
  Gavel,
  PlusCircle,
  Image as ImageIcon,
  Smile,
  Send,
  Filter,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Participant {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
}

interface ConversationThread {
  id: string;
  participant: Participant;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  category?: string;
  /** true = current user is online in this thread context */
  participantOnline: boolean;
}

type MessageRole = "self" | "other";

interface Message {
  id: string;
  role: MessageRole;
  body: string;
  sentAt: string;
  /** optional: a product shared inside the message */
  product?: {
    title: string;
    price: string;
    imageUrl: string;
    imageAlt: string;
    href: string;
  };
  /** optional: a system pill shown inline */
  systemNote?: string;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: replace with /api/messages/threads/ response
// ---------------------------------------------------------------------------
const DEMO_THREADS: ConversationThread[] = [
  {
    id: "thread-alex",
    participant: {
      id: "p-1",
      name: "Alex Rivera",
      avatarUrl: "https://i.pravatar.cc/96?img=11",
      isOnline: true,
    },
    lastMessage: "Wait, is the Sony headset still...",
    lastMessageAt: "10:45 AM",
    unreadCount: 2,
    category: "Electronics",
    participantOnline: true,
  },
  {
    id: "thread-jordan",
    participant: {
      id: "p-2",
      name: "Jordan Smith",
      avatarUrl: "https://i.pravatar.cc/96?img=5",
      isOnline: false,
    },
    lastMessage: "Great doing business with you!",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
    participantOnline: false,
  },
  {
    id: "thread-marcus",
    participant: {
      id: "p-3",
      name: "Marcus Thorne",
      avatarUrl: "https://i.pravatar.cc/96?img=7",
      isOnline: false,
    },
    lastMessage: "Sent the tracking number via...",
    lastMessageAt: "Tue",
    unreadCount: 0,
    participantOnline: false,
  },
];

// TODO: replace with /api/messages/threads/{threadId}/messages response
const DEMO_MESSAGES: Record<string, Message[]> = {
  "thread-alex": [
    {
      id: "m-sys-1",
      role: "other",
      body: "",
      sentAt: "",
      systemNote: "Escrow payment secured",
    },
    {
      id: "m-1",
      role: "other",
      body: "Hi there! I'm interested in the Sony headphones. Are they still available for the asking price?",
      sentAt: "10:42 AM",
    },
    {
      id: "m-2",
      role: "self",
      body: "Hello Alex! Yes, they are still available. I've only used them for about a week.",
      sentAt: "10:44 AM",
      product: {
        title: "Sony WH-1000XM5",
        price: "$320.00",
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
        imageAlt: "Sony WH-1000XM5 headphones",
        href: "/products/sony-wh1000xm5",
      },
    },
    {
      id: "m-3",
      role: "other",
      body: "Wait, is the Sony headset still under manufacturer warranty? I'd like to verify that before placing a bid.",
      sentAt: "10:45 AM",
    },
  ],
  "thread-jordan": [
    {
      id: "m-j-1",
      role: "other",
      body: "Great doing business with you!",
      sentAt: "Yesterday",
    },
  ],
  "thread-marcus": [
    {
      id: "m-m-1",
      role: "self",
      body: "Sent the tracking number via email.",
      sentAt: "Tue",
    },
  ],
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Online presence dot */
function OnlineDot({ size = "md" }: { size?: "sm" | "md" }) {
  const cls =
    size === "sm"
      ? "w-2.5 h-2.5 border-2 border-surface-container-lowest"
      : "w-3 h-3 border-2 border-surface-container-low";
  return (
    <span
      className={`absolute bottom-0 right-0 ${cls} bg-bid-green rounded-full`}
    />
  );
}

/** System pill (e.g. "Escrow payment secured") */
function SystemPill({ note }: { note: string }) {
  return (
    <div className="flex justify-center py-2">
      <div className="bg-surface-container-low px-4 py-1.5 rounded-full flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-secondary-green" />
        <span className="text-[11px] font-bold text-on-surface-variant tracking-wider uppercase">
          {note}
        </span>
      </div>
    </div>
  );
}

/** Single message bubble */
function MessageBubble({ msg }: { msg: Message }) {
  if (msg.systemNote) return <SystemPill note={msg.systemNote} />;

  const isSelf = msg.role === "self";

  return (
    <div
      className={`flex gap-3 ${isSelf ? "flex-col items-end ml-auto max-w-[75%] sm:max-w-[65%]" : "max-w-[75%] sm:max-w-[65%]"}`}
    >
      {/* Avatar — only for "other" messages */}
      {!isSelf && (
        <div className="flex items-end gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-low relative">
            <Image
              src={DEMO_THREADS.find((t) =>
                DEMO_MESSAGES["thread-alex"]?.includes(msg)
              )?.participant.avatarUrl ?? "https://i.pravatar.cc/32?img=11"}
              alt="counterparty avatar"
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
          <div className="space-y-1">
            <div className="bg-surface-container p-4 rounded-2xl rounded-bl-none text-on-surface text-sm shadow-card">
              {msg.body}
            </div>
            <span className="text-[10px] font-mono text-outline ml-1">
              {msg.sentAt}
            </span>
          </div>
        </div>
      )}

      {/* Self message */}
      {isSelf && (
        <>
          <div className="bg-primary-container text-on-primary p-4 rounded-2xl rounded-br-none text-sm shadow-md">
            {msg.body}
          </div>
          <span className="text-[10px] font-mono text-outline mr-1">
            {msg.sentAt}
          </span>

          {/* Attached product card */}
          {msg.product && (
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-3 flex gap-4 w-full max-w-[320px] shadow-card hover:shadow-card-hover transition-all">
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-surface-container-low">
                <Image
                  src={msg.product.imageUrl}
                  alt={msg.product.imageAlt}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-between py-1 min-w-0">
                <div>
                  <h4 className="font-headline font-bold text-sm text-on-surface leading-tight">
                    {msg.product.title}
                  </h4>
                  <span className="font-mono text-secondary-green font-bold text-sm">
                    {msg.product.price}
                  </span>
                </div>
                <Link
                  href={msg.product.href}
                  className="text-[11px] font-bold text-primary uppercase tracking-wider hover:underline transition-all active:scale-95"
                >
                  View Product
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Typing indicator */
function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[75%]">
      <div className="bg-surface-container p-4 rounded-2xl rounded-bl-none text-on-surface-variant text-sm flex items-center gap-1.5 shadow-card">
        <span className="w-2 h-2 rounded-full bg-outline/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-outline/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-outline/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

/** Conversation list item */
function ConversationItem({
  thread,
  isActive,
  onClick,
}: {
  thread: ConversationThread;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 flex gap-4 cursor-pointer relative transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
        ${isActive ? "bg-surface-container-low" : "hover:bg-surface-container-low/50"}`}
    >
      {/* Active indicator stripe */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-low relative">
          <Image
            src={thread.participant.avatarUrl}
            alt={thread.participant.name}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
        {thread.participant.isOnline && <OnlineDot size="md" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3
            className={`font-headline font-bold text-sm truncate ${isActive ? "text-on-surface" : "text-on-surface/70"}`}
          >
            {thread.participant.name}
          </h3>
          <span className="font-mono text-[10px] text-outline flex-shrink-0 ml-2">
            {thread.lastMessageAt}
          </span>
        </div>

        <p
          className={`text-sm truncate ${isActive ? "text-on-surface font-medium" : "text-outline"}`}
        >
          {thread.lastMessage}
        </p>

        {/* Category chip + unread badge */}
        <div className="flex justify-between items-center mt-2">
          {thread.category ? (
            <span className="bg-surface-container-highest text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-on-surface-variant">
              {thread.category}
            </span>
          ) : (
            <span />
          )}
          {thread.unreadCount > 0 && (
            <span className="bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/** Thread panel (chat window) */
function ThreadPanel({
  thread,
  onBack,
}: {
  thread: ConversationThread;
  onBack?: () => void;
}) {
  const messages = DEMO_MESSAGES[thread.id] ?? [];
  const [composerText, setComposerText] = useState("");
  // TODO: websocket /ws/messages/{thread.id}
  const [showTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on mount / message change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!composerText.trim()) return;
    // TODO: POST /api/messages/threads/{thread.id}/messages
    setComposerText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col h-full overflow-hidden min-w-0">
      {/* Thread header */}
      <header className="h-16 md:h-20 glass-header border-b border-outline-variant/10 flex items-center justify-between px-4 md:px-8 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button — visible on mobile to return to conversation list */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 text-outline hover:text-primary transition-colors active:scale-95 md:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-surface-container-low relative">
              <Image
                src={thread.participant.avatarUrl}
                alt={thread.participant.name}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
            {thread.participant.isOnline && <OnlineDot size="sm" />}
          </div>
          <div>
            <h2 className="font-headline font-bold text-base md:text-lg leading-none">
              {thread.participant.name}
            </h2>
            <p
              className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${thread.participant.isOnline ? "text-bid-green" : "text-outline"}`}
            >
              {thread.participant.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-4">
          <button
            className="p-2 text-outline hover:text-primary transition-colors active:scale-95"
            aria-label="Voice call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            className="p-2 text-outline hover:text-primary transition-colors active:scale-95"
            aria-label="Video call"
          >
            <Video className="w-5 h-5" />
          </button>
          <div className="hidden sm:block w-[1px] h-6 bg-outline-variant/30 mx-1" />
          <button className="hidden sm:flex text-primary font-bold text-sm border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary/5 transition-all active:scale-95 items-center gap-1.5">
            <Gavel className="w-4 h-4" />
            Open Dispute
          </button>
          <Link
            href={`/sellers/${thread.participant.id}`}
            className="hidden lg:flex text-on-surface-variant font-bold text-sm border border-outline-variant/30 px-4 py-2 rounded-lg hover:bg-surface-container-low transition-all active:scale-95 items-center gap-1.5"
          >
            <User className="w-4 h-4" />
            View Profile
          </Link>
        </div>
      </header>

      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {showTyping && <TypingIndicator />}
      </div>

      {/* Composer */}
      <footer className="p-4 md:p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex-shrink-0">
        <div className="max-w-4xl mx-auto bg-surface-container-low rounded-2xl p-2 flex items-center gap-2">
          <button
            type="button"
            className="p-2 text-outline hover:text-primary transition-colors active:scale-95"
            aria-label="Attach file"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 text-outline hover:text-primary transition-colors active:scale-95"
            aria-label="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 text-on-surface placeholder:text-outline min-w-0"
          />
          <button
            type="button"
            className="p-2 text-outline hover:text-primary transition-colors active:scale-95"
            aria-label="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!composerText.trim()}
            aria-label="Send message"
            className="bg-primary-container text-on-primary p-2.5 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty thread state (nothing selected)
// ---------------------------------------------------------------------------
function NoThreadSelected() {
  return (
    <div className="flex-1 bg-surface-container-lowest flex flex-col items-center justify-center gap-4 text-center p-8">
      <MessageCircle className="w-16 h-16 text-outline/30" />
      <h3 className="font-headline font-bold text-xl text-on-surface">
        Select a conversation
      </h3>
      <p className="text-sm text-on-surface-variant max-w-xs">
        Choose a thread from the left to start messaging your counterparty.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function MessagesPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    "thread-alex"
  );
  /**
   * On mobile (< md), when a thread is selected we show the thread panel
   * as a full-screen overlay over the conversation list.
   */
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const activeThread = DEMO_THREADS.find((t) => t.id === activeThreadId) ?? null;

  const filteredThreads = DEMO_THREADS.filter((t) =>
    t.participant.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setMobileThreadOpen(true);
  };

  return (
    <>
      <AccountMobileHeader title="Messages" />
        <div className="px-0 md:px-4 lg:px-8 max-w-screen-2xl mx-auto">
            <div className="w-full min-w-0 flex overflow-hidden h-[calc(100vh-5rem)] rounded-2xl border border-outline-variant/10 shadow-card">

              {/* Conversation list panel ------------------------------------ */}
              <section
                className={`
                  ${mobileThreadOpen ? "hidden" : "flex"} md:flex
                  w-full md:w-[280px] lg:w-[300px] xl:w-[320px]
                  flex-shrink-0 flex-col
                  bg-surface
                  border-r border-outline-variant/10
                `}
              >
                {/* List header */}
                <div className="p-4 md:p-6 border-b border-outline-variant/10">
                  <div className="mb-4">
                    <h2 className="font-headline text-xl font-bold tracking-tight">
                      Messages
                    </h2>
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                    <input
                      type="text"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      placeholder="Filter conversations"
                      className="w-full bg-surface-container-low border-none rounded-xl pl-10 py-2 text-sm focus:ring-1 focus:ring-primary/20 placeholder:text-outline"
                    />
                  </div>
                </div>

                {/* Scrollable thread list */}
                <div className="flex-1 overflow-y-auto space-y-1 px-3 py-3 no-scrollbar">
                  {filteredThreads.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-12">
                      No conversations match your filter.
                    </p>
                  ) : (
                    filteredThreads.map((thread) => (
                      <ConversationItem
                        key={thread.id}
                        thread={thread}
                        isActive={thread.id === activeThreadId}
                        onClick={() => handleSelectThread(thread.id)}
                      />
                    ))
                  )}
                </div>
              </section>

              {/* Thread panel ----------------------------------------------- */}
              {/*
               * On mobile: full-screen overlay when mobileThreadOpen is true.
               * On md+: always visible alongside the list.
               */}
              <div
                className={`
                  ${mobileThreadOpen ? "flex" : "hidden"} md:flex
                  flex-1 min-w-0
                `}
              >
                {activeThread ? (
                  <ThreadPanel
                    thread={activeThread}
                    onBack={() => setMobileThreadOpen(false)}
                  />
                ) : (
                  <NoThreadSelected />
                )}
              </div>
            </div>
          </div>
    </>
  );
}
