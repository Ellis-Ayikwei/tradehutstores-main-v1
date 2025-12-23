# MoreVans Chat System Architecture

## Table of Contents

1. [User Types & Communication Channels](#1-user-types--communication-channels)
2. [Core Communication Flows](#2-core-communication-flows)
3. [Chat Initiation Scenarios](#3-chat-initiation-scenarios)
4. [Message Lifecycle](#4-message-lifecycle)
5. [Access Control Matrix](#5-access-control-matrix)
6. [Technical Architecture](#6-technical-architecture)
7. [Database Schema](#7-database-schema)
8. [User Interface Flows](#8-user-interface-flows)
9. [Implementation Roadmap](#9-implementation-roadmap)

## 1. User Types & Communication Channels

The MoreVans platform connects four primary user types through distinct communication channels:

|User Type|Role|Primary Communication Channels|
|---------|----|-------------------------------|
|Clients  |End-users seeking moving services  |&bull; Booking chats with Providers<br>&bull; Support chats for help|
|Providers|Movers providing moving services   |&bull; Job chats with Clients<br>&bull; Support chats for platform issues|
|Support Agents|Customer service team          |&bull; Client support conversations<br>&bull; Provider support conversations<br>&bull; Internal team communication|
|Admins    |System managers with oversight    |&bull; Support team oversight<br>&bull; Escalation handling<br>&bull; System broadcasts|
┌──────────┐                              ┌───────────┐
│          │◄──── Booking Chats ─────────►│           │
│  CLIENTS │                              │ PROVIDERS │
│          │                              │           │
└─────┬────┘                              └─────┬─────┘
      │                                         │
      │                                         │
      │                                         │
      │         ┌─────────────────┐             │
      └────────►│                 │◄────────────┘
                │  SUPPORT AGENTS │
      ┌────────►│                 │◄────────────┐
      │         └────────┬────────┘             │
      │                  │                      │
      │                  │                      │
┌─────┴────┐             │              ┌───────┴─────┐
│ SYSTEM   │◄────────────┘              │             │
│ MESSAGES │◄─────── Internal Chat ────►│   ADMINS    │
│          │                            │             │
└──────────┘                            └─────────────┘
### Primary Communication Channels

### Conversation Types & Flows

#### Client-Provider Chat

Triggered by: Booking confirmation
Purpose: Service coordination, updates, queries
Lifecycle: Active during booking process through completion

#### Client-Support Chat

Triggered by: Client help request or issue flagging
Purpose: Platform help, booking issues, complaints
Lifecycle: Issue-based with resolution tracking

#### Provider-Support Chat

Triggered by: Provider help request or account issues
Purpose: Platform guidance, payment issues, verification
Lifecycle: Issue-based with resolution tracking

#### Support-Admin Chat

Triggered by: Issue escalation, policy questions
Purpose: Internal communication, decision making
Lifecycle: Ongoing with specific issue threads

#### System Broadcasts

Triggered by: System events, admin actions
Purpose: Announcements, alerts, important updates
Lifecycle: One-to-many, non-conversational

### 3. Chat Initiation Scenarios

#### Booking-Related Chats

┌──────────┐                                   ┌───────────┐
│ CLIENT   │                                   │ PROVIDER  │
└────┬─────┘                                   └─────┬─────┘
     │                                               │
     │ Client makes booking request                  │
     ├───────────────────────────────────────────────┤
     │                                               │
     │ Provider accepts booking                      │
     │◄──────────────────────────────────────────────┤
     │                                               │
     │                SYSTEM ACTION                  │
     │        Chat channel automatically created     │
     │                                               │
     │ Welcome message sent                          │
     ├───────────────────────────────────────────────┼─────────────┐
     │                                               │             │
     │ "Hi! I have a question about my booking"      │             │
     ├───────────────────────────────────────────────►             │
     │                                               │  Messages   │
     │                                               │  Exchanged  │
     │ "I'll bring an extra helper for those items"  │             │
     │◄───────────────────────────────────────────────             │
     │                                               │             │
     └───────────────────────────────────────────────┴─────────────┘

Support-Related Chats

┌──────────┐                                   ┌───────────┐
│ USER     │                                   │ SUPPORT   │
└────┬─────┘                                   └─────┬─────┘
     │                                               │
     │ Clicks "Contact Support"                      │
     │                                               │
     │                SYSTEM ACTION                  │
     │          Creates new support ticket           │
     │          Assigns available agent              │
     │                                               │
     │ Auto message: "How can we help you today?"    │
     │◄──────────────────────────────────────────────┤
     │                                               │
     │ "I need help with my payment"                 │
     ├───────────────────────────────────────────────►
     │                                               │
     │                SYSTEM ACTION                  │
     │      Routes to payment specialist if needed   │
     │                                               │
     │ "Let me check your payment history..."        │
     │◄──────────────────────────────────────────────┤
     │                                               │
     └───────────────────────────────────────────────┘

Escalation-Related Chats

┌──────────┐            ┌───────────┐            ┌───────────┐
│ CLIENT   │            │ SUPPORT   │            │ ADMIN     │
└────┬─────┘            └─────┬─────┘            └─────┬─────┘
     │                        │                        │
     │ Reports serious issue  │                        │
     ├───────────────────────►│                        │
     │                        │                        │
     │                        │ Determines need for    │
     │                        │ escalation             │
     │                        │                        │
     │                        │ Escalates to admin     │
     │                        ├───────────────────────►│
     │                        │                        │
     │                        │                        │ Reviews case
     │                        │                        │
     │                        │ Admin decision/policy  │
     │                        │◄───────────────────────┤
     │                        │                        │
     │ Final resolution       │                        │
     │◄───────────────────────┤                        │
     │                        │                        │

4. Message Lifecycle

┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ┌────────┐         ┌──────────┐         ┌─────────┐             │
│  │ SENDER │────────►│ DATABASE │────────►│RECIPIENT│             │
│  └────┬───┘         └────┬─────┘         └────┬────┘             │
│       │                  │                    │                   │
│       │                  │                    │                   │
│  User types    Message stored with     WebSocket pushes          │
│  and sends     "sent" status           message to recipient      │
│                                                                   │
│  ┌────────┐         ┌──────────┐         ┌─────────┐             │
│  │ SENDER │◄────────┤ DATABASE │◄────────┤RECIPIENT│             │
│  └────────┘         └──────────┘         └─────────┘             │
│                                                                   │
│  Status updated     Status recorded      Recipient device         │
│  to "delivered"     as "delivered"       confirms receipt         │
│                                                                   │
│  ┌────────┐         ┌──────────┐         ┌─────────┐             │
│  │ SENDER │◄────────┤ DATABASE │◄────────┤RECIPIENT│             │
│  └────────┘         └──────────┘         └─────────┘             │
│                                                                   │
│  Status updated     Status recorded      Message opened           │
│  to "read"          as "read"            by recipient             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘


Message States
================

* Draft - Being composed, not yet sent
* Sent - Delivered to server, awaiting delivery to recipient
* Delivered - Received by recipient's device
* Read - Viewed by recipient
* Failed - Could not be delivered (error state)

5. Access Control Matrix
=========================

| User Type | Can Chat With | Can View | Special Permissions |
|-----------|---------------|----------|----------------------|
| Client    | Providers with active bookings, Support team | Own conversations, System announcements | Can rate provider responses, Can escalate issues to support |
| Provider  | Clients with bookings, Support team | Conversations related to jobs, Provider announcements | Can add team members to conversations, Can set business hours/availability |
| Support   | Clients, Providers, Other support agents, Admins | Assigned cases, Knowledge base, Internal communications | Can join any client-provider conversation, Can transfer conversations, Can close/reopen conversations |
| Admin     | Support team, Providers, Clients (special cases) | All conversations, Analytics dashboard, System logs | Can broadcast messages, Can access any conversation, Can configure auto-responses |

6. Technical Architecture
=========================


┌───────────────────────────────────────┐
│           CLIENT APPLICATIONS         │
│                                       │
│  ┌─────────┐  ┌─────────┐ ┌─────────┐ │
│  │  Web    │  │ iOS App │ │ Android │ │
│  │ Browser │  │         │ │  App    │ │
│  └────┬────┘  └────┬────┘ └────┬────┘ │
└───────┼───────────┼───────────┼───────┘
        │           │           │
        └───────────┼───────────┘
                    ▼
┌───────────────────────────────────────┐
│        API & WEBSOCKET SERVERS        │
│                                       │
│  ┌─────────────┐    ┌──────────────┐  │
│  │ REST API    │    │ WebSocket    │  │
│  │ Endpoints   │    │ Server       │  │
│  └──────┬──────┘    └───────┬──────┘  │
│         │                   │         │
│  ┌──────┴───────────────────┴──────┐  │
│  │      Authentication &           │  │
│  │      Authorization Layer        │  │
│  └──────────────┬──────────────────┘  │
└─────────────────┼────────────────────-┘
                  │
┌─────────────────┼────────────────────┐
│               CORE                   │
│                                      │
│  ┌──────────────┐  ┌─────────────┐   │
│  │  Message     │  │User Service │   │
│  │  Service     │  │             │   │
│  └──────┬───────┘  └──────┬──────┘   │
│         │                 │          │
│  ┌──────┴─────────────────┴───────┐  │
│  │        Message Queue           │  │
│  └──────────────┬─────────────────┘  │
└─────────────────┼─────────────────---┘
                  │
┌─────────────────┼─────────────────┐
│             STORAGE               │
│                                   │
│  ┌─────────────┐  ┌────────────┐  │
│  │ PostgreSQL  │  │   Redis    │  │
│  │ Database    │  │  Cache     │  │
│  └─────────────┘  └────────────┘  │
│                                   │
│  ┌─────────────────────────────┐  │
│  │        File Storage         │  │
│  │  (Images, Attachments)      │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘


┌──────────────────┐      ┌───────────────────────┐
│   Users          │      │   Conversations       │
├──────────────────┤      ├───────────────────────┤
│ id               │◄────┐│ id                   │
│ name             │     ││ title                │
│ email            │     ││ conversation_type    │
│ user_type        │     ││ last_message_preview │
│ avatar_url       │     ││ last_message_sent_at │
└──────────────────┘     ││ booking_id           │
                         ││ is_active            │
┌──────────────────┐     │└───────────┬─────────┬┘
│ Conversation     │     │            │         │
│ Participants     │     │            │         │
├──────────────────┤     │            │         │
│ id               │     │            │         │
│ conversation_id  │◄────┘            │         │
│ user_id          │◄─────────────────┘         │
│ role             │                            │
│ joined_at        │           ┌───────────────┐│
│ left_at          │           │               ││
│ is_active        │           ▼               ││
│ unread_count     │    ┌──────────────┐       ││
│ last_read_msg_id │    │  Messages    │       ││
│ is_muted         │    ├──────────────┤       ││
└──────────────────┘    │ id           │◄──────┘│
                        │ conversation_│◄───────┘
┌──────────────────┐    │ sender_id    │
│ Message Status   │    │ message_type │
├──────────────────┤    │ content      │
│ id               │    │ created_at   │
│ message_id       │◄───│ is_edited    │
│ user_id          │    │ is_deleted   │
│ status           │    │ parent_msg_id│
│ updated_at       │    └──────┬───────┘
└──────────────────┘           │
                               │
┌──────────────────┐           │
│ Message          │           │
│ Attachments      │           │
├──────────────────┤           │
│ id               │           │
│ message_id       │◄──────────┘
│ file_name        │
│ file_type        │
│ file_url         │
│ thumbnail_url    │
│ is_image         │
└──────────────────┘


8. User Interface Flows
Client Chat Flow


┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  DASHBOARD      │          │  CHAT LIST      │          │  CONVERSATION   │
├─────────────────┤          ├─────────────────┤          ├─────────────────┤
│                 │  Click   │                 │  Select  │                 │
│ • Active        │ Message  │ • Moving Co 1   │   chat   │  Moving Co 1    │
│   Bookings      │   icon   │   (2 unread)    │   ──────►│                 │
│                 │  ──────► │ • Support       │          │  [Messages      │
│ • My Moves      │          │                 │          │   displayed     │
│                 │          │ • System        │          │   here]         │
│ • Messages (2)  │          │   Messages      │          │                 │
│                 │          │                 │          │  [Type message  │
└─────────────────┘          └─────────────────┘          │   box]          │
                                                          └─────────────────┘

Provider Chat Flow
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐        
│  JOBS DASHBOARD │          │  CLIENT CHATS   │          │  CONVERSATION   │
├─────────────────┤          ├─────────────────┤          ├─────────────────┤
│                 │  Click   │                 │  Select  │                 │
│ • Active Jobs   │   chat   │ • John D.       │   chat   │  John D.        │
│   - Job #1234   │   icon   │   Job #1234     │   ──────►│  Job #1234      │
│   - Job #5678   │  ──────► │ • Mary S.       │          │                 │
│                 │          │   Job #5678     │          │  [Messages with │
│ • Messages (3)  │          │                 │          │   booking       │
│                 │          │ • Support       │          │   context]      │
│ • Requests      │          │                 │          │                 │
│                 │          │                 │          │  [Quick replies │
└─────────────────┘          └─────────────────┘          │   available]    │
                                                                                                                  └─────────────────┘


                                                    Support Agent Chat Flow

┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│  TICKET QUEUE   │          │  CONVERSATION   │          │  USER CONTEXT   │
├─────────────────┤          ├─────────────────┤          ├─────────────────┤
│                 │  Select  │                 │ View     │ USER: John Doe  │
│ • John D.       │  ticket  │  John D.        │ context  │                 │
│   Payment Issue │  ──────► │                 │ ──────►  │ • Booking #1234 │
│   (High)        │          │  [Message       │          │   Apr 15, 2025  │
│                 │          │   history]      │          │                 │
│ • Mary S.       │          │                 │          │ • 3 previous    │
│   Refund Request│          │  [Internal      │          │   support       │
│   (Medium)      │          │   notes]        │          │   tickets       │
│                 │          │                 │          │                 │
│ • Moving Co 1   │          │  [Response      │          │ • Payment       │
│   Verification  │          │   templates]    │          │   History       │
│   (Low)         │          │                 │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘



9. Implementa
┌───────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: CORE MESSAGING                     │
├───────────────────────────────────────────────────────────────────────┤
│ • Client-Provider messaging for active bookings                       │
│ • Basic Support chat functionality                                    │
│ • Text-only messages with delivery confirmation                       │
│ • Unread message counters                                             │
│ • Basic administration interface                                      │
└─────────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        PHASE 2: ENHANCED FEATURES                     │
├───────────────────────────────────────────────────────────────────────┤
│ • Image and file attachments                                          │
│ • Read receipts                                                       │
│ • Typing indicators                                                   │
│ • Push notifications for mobile                                       │
│ • Email notifications for missed messages                             │
└─────────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     PHASE 3: ADVANCED CAPABILITIES                    │
├───────────────────────────────────────────────────────────────────────┤
│ • Message search functionality                                        │
│ • Chat analytics dashboard                                            │
│ • Support chat templates and quick responses                          │
│ • Basic chatbot for FAQs                                              │
│ • Deep integration with booking system                                │
└─────────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       PHASE 4: INTELLIGENCE LAYER                     │
├───────────────────────────────────────────────────────────────────────┤
│ • Sentiment analysis for support conversations                        │
│ • Automatic language translation                                      │
│ • AI-powered suggested responses for support agents                   │
│ • Proactive issue detection and alerting                              │
│ • Advanced analytics for business intelligence                        │
└───────────────────────────────────────────────────────────────────────┘

